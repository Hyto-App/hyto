import type { Fotos } from "@/lib/blob/fotos";
import type { Almacen } from "@/lib/db/almacen";
import { asegurarSemilla, esBlobEjemplo, esProyectoDemo } from "@/lib/db/semilla";
import type { EvidenciaFila, Rol, TareaFila, VeredictoFila } from "@/lib/db/tipos";
import { aplicarCopia, MOTIVO_COPIA } from "@/lib/evidencia/copia";
import { evaluarFrescura, fechaExif } from "@/lib/evidencia/frescura";
import { sha256De } from "@/lib/evidencia/huella";
import { phashDe, UMBRAL_COPIA } from "@/lib/evidencia/phash";
import { consumirTokenEvidencia, emitirTokenEvidencia } from "@/lib/evidencia/token";
import { esPdf, nombreDeTipo, tipoPorBytes } from "@/lib/evidencia/tipo";
import { esContrato } from "@/lib/escrow/cuerpos";
import { contextoDesdeEntorno, revisar } from "@/lib/revision/revisar";
import type { ResultadoRevision } from "@/lib/revision/armar";
import { unirDescripcion } from "@/lib/revision/snapshot-razones";
import { accesoEvidencia, type Visor } from "./alcance";
import { baseNoLista, json, sinFotos } from "./json";

const MAX_BYTES = 8_000_000;
const PLAZO_MS = 2800;

export type ActorEvidencia = {
  usuarioId: string;
  rol: Rol;
  demo?: boolean;
  wallet?: string;
};

export const AVISO_SIN_CUENTA =
  "This sign-in has no payout account. Sign in again and open the task so we know where to pay.";

export const AVISO_COBRO_FIJO =
  "The budget for this task is already locked to another payout account. Sign in with that wallet to submit evidence.";

export type DepsEvidencia = {
  almacen: Almacen;
  fotos: Fotos | null;
  actor?: ActorEvidencia;
  revisarTarea?: (tarea: TareaFila, foto: Awaited<ReturnType<Fotos["leer"]>>) => Promise<ResultadoRevision>;
  continuar?: (trabajo: Promise<void>) => void;
};

export function evidenciaPublica(evidencia: EvidenciaFila) {
  return {
    id: evidencia.id,
    tareaId: evidencia.tareaId,
    blobId: evidencia.blobId,
    monto: evidencia.monto,
    fecha: evidencia.fecha,
  };
}

export async function leerEvidenciaHttp(almacen: Almacen, id: string, visor: Visor): Promise<Response> {
  try {
    await asegurarSemilla(almacen);
    const evidencia = await almacen.leerEvidencia(id);
    const acceso = await accesoEvidencia(almacen, visor, evidencia);
    if (!evidencia || acceso === "ausente") return json({ aviso: "We couldn't find that evidence." }, 404);
    if (acceso === "entrar") return json({ aviso: "Sign in to continue." }, 401);
    if (acceso === "no") return json({ aviso: "You can't view that evidence." }, 403);
    return json({ evidencia: evidenciaPublica(evidencia) });
  } catch {
    return baseNoLista();
  }
}

const MARCADOR_EJEMPLO = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="48" role="img" aria-label="Sample evidence"><rect width="64" height="48" fill="#ece7dc"/></svg>`;

export async function leerFotoHttp(almacen: Almacen, fotos: Fotos | null, id: string, visor: Visor): Promise<Response> {
  try {
    await asegurarSemilla(almacen);
    const evidencia = await almacen.leerEvidencia(id);
    const acceso = await accesoEvidencia(almacen, visor, evidencia);
    if (!evidencia || acceso === "ausente") return json({ aviso: "We couldn't find that evidence." }, 404);
    if (acceso === "entrar") return json({ aviso: "Sign in to continue." }, 401);
    if (acceso === "no") return json({ aviso: "You can't view that evidence." }, 403);
    if (esBlobEjemplo(evidencia.blobId)) {
      return new Response(MARCADOR_EJEMPLO, {
        headers: { "content-type": "image/svg+xml", "cache-control": "private, max-age=3600" },
      });
    }
    if (!fotos) return sinFotos();
    const foto = await fotos.leer(evidencia.blobId);
    if (!foto) return json({ aviso: "We couldn't find the photo." }, 404);
    return new Response(Buffer.from(foto.bytes), {
      headers: {
        "content-type": tipoDeFoto(foto.tipo, foto.bytes),
        "cache-control": "private, max-age=3600",
        "content-disposition": disposicionDe(foto.tipo, foto.bytes),
      },
    });
  } catch {
    return baseNoLista();
  }
}

export async function emitirTokenEvidenciaHttp(request: Request, deps: DepsEvidencia): Promise<Response> {
  let cuerpo: unknown;
  try {
    cuerpo = await request.json();
  } catch {
    return json({ aviso: "The task is missing." }, 400);
  }
  const tareaId = textoCampo(cuerpo);
  if (!tareaId) return json({ aviso: "The task is missing." }, 400);
  if (!deps.actor) return json({ aviso: "Sign in to continue." }, 401);
  try {
    await asegurarSemilla(deps.almacen);
    const tarea = await deps.almacen.leerTarea(tareaId);
    if (!tarea) return json({ aviso: "We couldn't find that task." }, 404);
    if (tarea.tipo !== "trabajo") return json({ aviso: "Receipts do not use a camera check." }, 400);
    const permitido = await puedeSubir(deps.almacen, tarea, deps.actor);
    if (!permitido) return json({ aviso: "Only the person assigned to the task can submit evidence." }, 403);
    const token = emitirTokenEvidencia({ usuarioId: deps.actor.usuarioId, tareaId });
    if (!token) return json({ aviso: "Evidence checks are not configured." }, 503);
    return json({ token });
  } catch {
    return baseNoLista();
  }
}

export async function publicarEvidenciaHttp(request: Request, deps: DepsEvidencia): Promise<Response> {
  if (!deps.fotos) return sinFotos();
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ aviso: "The photo did not arrive." }, 400);
  }
  const tareaId = texto(form.get("tareaId"));
  const foto = form.get("foto");
  if (!tareaId || !(foto instanceof Blob)) return json({ aviso: "The task and the photo are missing." }, 400);
  if (foto.size > MAX_BYTES) return json({ aviso: "The file is too large." }, 413);

  try {
    await asegurarSemilla(deps.almacen);
    const tarea = await deps.almacen.leerTarea(tareaId);
    if (!tarea) return json({ aviso: "We couldn't find that task." }, 404);
    const asignado = puedeFijarWallet(tarea, deps.actor);
    const demo = deps.actor?.demo === true && esProyectoDemo(await deps.almacen.leerProyecto(tarea.proyectoId));
    const wallet = demo || !asignado ? null : direccion(deps.actor?.wallet ?? "");
    if (deps.actor && !asignado && !demo) {
      const aviso =
        wallet && wallet !== tarea.walletCobro
          ? "Only the person assigned to the task can set the payout account."
          : "Only the person assigned to the task can submit evidence.";
      return json({ aviso }, 403);
    }
    if (wallet && wallet !== tarea.walletCobro && !asignado) {
      return json({ aviso: "Only the person assigned to the task can set the payout account." }, 403);
    }
    if (wallet && wallet !== tarea.walletCobro && tarea.contratoEscrow && esContrato(tarea.contratoEscrow)) {
      return json({ aviso: AVISO_COBRO_FIJO }, 409);
    }

    const bytes = new Uint8Array(await foto.arrayBuffer());
    const tipo = tipoPorBytes(bytes);
    if (!tipo) {
      return json(
        { aviso: tarea.tipo === "trabajo" ? "Take the photo with the camera." : "Choose a PDF, JPEG, PNG, or WebP file." },
        400,
      );
    }

    const ahora = Date.now();
    let capturadaEn: string | null = null;
    let frescura: EvidenciaFila["frescura"] = null;
    if (tarea.tipo === "trabajo") {
      if (tipo !== "image/jpeg") return json({ aviso: "Take the photo with the camera." }, 400);
      const token = texto(form.get("token"));
      if (!token) return json({ aviso: "Take the photo with the camera." }, 400);
      const consumido = consumirTokenEvidencia(token, { usuarioId: deps.actor?.usuarioId ?? null, tareaId }, ahora);
      if (!consumido.ok) return json({ aviso: avisoToken(consumido.codigo) }, consumido.codigo === "secreto" ? 503 : 400);
      const exif = await fechaExif(bytes);
      const fresco = evaluarFrescura({
        capturadaEn: texto(form.get("capturadaEn")) || null,
        emitidoEn: consumido.carga.iat,
        ahora,
        exif,
      });
      if (!fresco.ok) return json({ aviso: fresco.aviso }, 400);
      capturadaEn = fresco.capturadaEn;
      frescura = fresco.frescura;
    }

    if (!(await deps.almacen.listaParaAntifraude())) {
      return json({ aviso: "Evidence checks need migration 0005_evidencia_antifraude.sql before new files can be saved." }, 503);
    }

    const sha256 = sha256De(bytes);
    if (await deps.almacen.evidenciaPorSha256(sha256)) {
      return json({ aviso: "This file was already submitted." }, 409);
    }

    let phash: string | null = null;
    if (tipo !== "application/pdf") {
      try {
        phash = await phashDe(bytes);
      } catch {
        return json({ aviso: "Could not read the photo." }, 400);
      }
    }

    const archivo = new Blob([bytes], { type: tipo });
    let blobId: string;
    try {
      blobId = await deps.fotos.guardar(nombreDeTipo(tipo), archivo);
    } catch {
      return json({ aviso: "Could not save the file." }, 502);
    }
    const evidencia: EvidenciaFila = {
      id: crypto.randomUUID(),
      tareaId,
      blobId,
      monto: null,
      montoConfirmado: null,
      fecha: null,
      creadaEn: new Date(ahora).toISOString(),
      capturadaEn,
      frescura,
      sha256,
      phash,
      tipoArchivo: tipo,
      motivoCopia: null,
    };
    await deps.almacen.crearEvidencia(evidencia);
    if (tarea.estado === "pendiente") await deps.almacen.actualizarTarea(tareaId, { estado: "en revisión" });
    if (wallet && wallet !== tarea.walletCobro) await deps.almacen.actualizarTarea(tareaId, { walletCobro: wallet });
    const avisoCobro = asignado && !demo && !wallet ? AVISO_SIN_CUENTA : null;
    if (avisoCobro) console.warn(`payout account missing for task ${tareaId}`);

    const cercanas = phash ? await deps.almacen.evidenciasCercanas(phash, UMBRAL_COPIA, evidencia.id) : [];
    const cerca = cercanas.length > 0;
    if (cerca) await deps.almacen.actualizarEvidencia(evidencia.id, { motivoCopia: MOTIVO_COPIA });

    const leida = await deps.fotos.leer(blobId);
    const trabajo = (deps.revisarTarea ?? revisarPorDefecto)(tarea, leida).then((resultado) => aplicarCopia(resultado, cerca));
    const conTope = !deps.revisarTarea && Boolean(contextoDesdeEntorno().claveGroq) && !esPdf(bytes);
    const listo = conTope ? await conPlazo(trabajo, PLAZO_MS) : await trabajo;
    if (listo) {
      await guardarRevision(deps.almacen, evidencia.id, tareaId, listo);
    } else if (deps.continuar) {
      deps.continuar(
        trabajo
          .then((resultado) => guardarRevision(deps.almacen, evidencia.id, tareaId, resultado))
          .catch(() => undefined),
      );
    }
    const guardada = (await deps.almacen.leerEvidencia(evidencia.id)) ?? evidencia;
    return json({ evidencia: evidenciaPublica(guardada), ...(avisoCobro ? { aviso: avisoCobro } : {}) }, 201);
  } catch {
    return baseNoLista();
  }
}

async function revisarPorDefecto(tarea: TareaFila, foto: Awaited<ReturnType<Fotos["leer"]>>): Promise<ResultadoRevision> {
  return revisar(tarea, foto, contextoDesdeEntorno());
}

export async function guardarRevision(
  almacen: Almacen,
  evidenciaId: string,
  tareaId: string,
  resultado: ResultadoRevision,
): Promise<void> {
  const veredicto: VeredictoFila = {
    id: evidenciaId,
    evidenciaId,
    tareaId,
    veredicto: resultado.veredicto,
    frase: resultado.frase,
    textoScout: unirDescripcion(resultado.texto, resultado.detalle),
    choice: resultado.choice,
    noul: resultado.noul ? "si" : "no",
    score: resultado.score,
    origen: resultado.origen,
  };
  await almacen.guardarVeredicto(veredicto);
  if (resultado.origen === "error") return;
  const previa = await almacen.leerEvidencia(evidenciaId);
  const cambio: Partial<Pick<EvidenciaFila, "monto" | "fecha" | "montoConfirmado">> = {
    monto: resultado.monto,
    fecha: resultado.fecha,
  };
  if (previa?.montoConfirmado && previa.monto !== resultado.monto) cambio.montoConfirmado = null;
  await almacen.actualizarEvidencia(evidenciaId, cambio);
}

function conPlazo<T>(trabajo: Promise<T>, ms: number): Promise<T | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), ms);
    trabajo.then(
      (valor) => {
        clearTimeout(timer);
        resolve(valor);
      },
      () => {
        clearTimeout(timer);
        resolve(null);
      },
    );
  });
}

function texto(valor: FormDataEntryValue | null): string {
  return typeof valor === "string" ? valor.trim() : "";
}

export function tipoDeFoto(declarado: string, bytes: Uint8Array): string {
  const olido = tipoPorBytes(bytes);
  if (olido) return olido;
  if (bytes.length >= 6 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) return "image/gif";
  const limpio = declarado.trim().toLowerCase();
  if (limpio === "image/jpg" || limpio === "image/pjpeg") return "image/jpeg";
  if (limpio.startsWith("image/")) return limpio;
  if (limpio === "application/pdf") return "application/pdf";
  return "application/octet-stream";
}

function disposicionDe(declarado: string, bytes: Uint8Array): string {
  return tipoDeFoto(declarado, bytes) === "application/pdf" ? 'inline; filename="invoice.pdf"' : "inline";
}

function avisoToken(codigo: string): string {
  if (codigo === "secreto") return "Evidence checks are not configured.";
  if (codigo === "vencido") return "The camera session expired. Take the photo again.";
  if (codigo === "reusado") return "That camera session was already used. Take the photo again.";
  return "Take the photo with the camera.";
}

function textoCampo(cuerpo: unknown): string {
  if (!cuerpo || typeof cuerpo !== "object") return "";
  const tareaId = (cuerpo as { tareaId?: unknown }).tareaId;
  return typeof tareaId === "string" ? tareaId.trim() : "";
}

async function puedeSubir(almacen: Almacen, tarea: TareaFila, actor: ActorEvidencia): Promise<boolean> {
  if (puedeFijarWallet(tarea, actor)) return true;
  if (actor.demo !== true) return false;
  return esProyectoDemo(await almacen.leerProyecto(tarea.proyectoId));
}

function direccion(valor: string): string | null {
  const limpio = valor.trim();
  if (!/^G[A-Z2-7]{55}$/.test(limpio)) return null;
  return limpio;
}

function puedeFijarWallet(tarea: TareaFila, actor: ActorEvidencia | undefined): boolean {
  return Boolean(actor && tarea.miembroId && actor.usuarioId === tarea.miembroId);
}
