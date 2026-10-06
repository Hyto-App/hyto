import type { Fotos } from "@/lib/blob/fotos";
import { marcadorPng } from "@/lib/blob/marcador";
import type { Almacen, CambioTarea } from "@/lib/db/almacen";
import { asegurarSemilla, esBlobEjemplo, esProyectoDemo } from "@/lib/db/semilla";
import type { EvidenciaFila, Rol, TareaFila, VeredictoFila } from "@/lib/db/tipos";
import { aplicarCopia, MOTIVO_COPIA } from "@/lib/evidencia/copia";
import { evaluarFrescura, fechaExif } from "@/lib/evidencia/frescura";
import { sha256De } from "@/lib/evidencia/huella";
import { phashDe, UMBRAL_COPIA } from "@/lib/evidencia/phash";
import { consumirTokenEvidencia, emitirTokenEvidencia } from "@/lib/evidencia/token";
import { esPdf, nombreDeTipo, tipoPorBytes } from "@/lib/evidencia/tipo";
import { avisoArchivo, MAX_BYTES_ARCHIVO, validarBytes } from "@/lib/evidencia/validar";
import { esContrato } from "@/lib/escrow/cuerpos";
import { contextoDesdeEntorno, revisar } from "@/lib/revision/revisar";
import type { ResultadoRevision } from "@/lib/revision/armar";
import { maxIntentosMile, mileRequisitosActivo } from "@/lib/revision/requisitos-bandera";
import { leerRequisitos, serializarRevisionMile } from "@/lib/revision/requisitos";
import { unirDescripcion } from "@/lib/revision/snapshot-razones";
import { idiomaDe, COOKIE_IDIOMA } from "@/lib/ui/idioma";
import type { Idioma } from "@/lib/ui/idioma";
import { accesoEvidencia, type Visor } from "./alcance";
import { tareaCerrada } from "./etapa";
import { baseNoLista, json, sinFotos } from "./json";

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

export const AVISO_TOPE_MILE = "Mile already checked the maximum number of attempts.";

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

export async function leerFotoHttp(almacen: Almacen, fotos: Fotos | null, id: string, visor: Visor): Promise<Response> {
  try {
    await asegurarSemilla(almacen);
    const evidencia = await almacen.leerEvidencia(id);
    const acceso = await accesoEvidencia(almacen, visor, evidencia);
    if (!evidencia || acceso === "ausente") return json({ aviso: "We couldn't find that evidence." }, 404);
    if (acceso === "entrar") return json({ aviso: "Sign in to continue." }, 401);
    if (acceso === "no") return json({ aviso: "You can't view that evidence." }, 403);
    if (esBlobEjemplo(evidencia.blobId)) {
      const tarea = await almacen.leerTarea(evidencia.tareaId);
      return new Response(Buffer.from(marcadorPng(tarea?.tipo === "reembolso" ? "reembolso" : "trabajo")), {
        headers: {
          "content-type": "image/png",
          "cache-control": "private, max-age=3600",
          "x-content-type-options": "nosniff",
        },
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
    // TODO(intentos): the attempt cap is not decided. Replace the photo until the task is paid.
    if (tareaCerrada(tarea)) return json({ aviso: "This task is already paid." }, 409);
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
  if (foto.size <= 0) return json({ aviso: avisoArchivo("vacio") }, 400);
  if (foto.size > MAX_BYTES_ARCHIVO) return json({ aviso: avisoArchivo("grande") }, 413);

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
    // TODO(intentos): the attempt cap is not decided. Replace the photo until the task is paid.
    if (tareaCerrada(tarea)) return json({ aviso: "This task is already paid." }, 409);

    const bytes = new Uint8Array(await foto.arrayBuffer());
    const validado = validarBytes(bytes);
    if (!validado.ok) {
      const camara = tarea.tipo === "trabajo" && (validado.motivo === "falso" || validado.motivo === "tipo");
      if (camara) return json({ aviso: "Take the photo with the camera." }, 400);
      return json({ aviso: avisoArchivo(validado.motivo) }, validado.motivo === "grande" ? 413 : 400);
    }
    const tipo = validado.tipo;

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
    const mileActivo = mileRequisitosActivo() && leerRequisitos(tarea.requisitos).length > 0;
    let fotosPrevias = 0;
    if (mileActivo) {
      fotosPrevias = await deps.almacen.contarEvidencias(tareaId);
      if (fotosPrevias >= maxIntentosMile()) return json({ aviso: AVISO_TOPE_MILE }, 409);
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
    if (mileActivo && (await deps.almacen.columnasRequisitos())) {
      await deps.almacen.actualizarTarea(tareaId, { rechazo: null });
    }
    if (wallet && wallet !== tarea.walletCobro) await deps.almacen.actualizarTarea(tareaId, { walletCobro: wallet });
    const avisoCobro = asignado && !demo && !wallet ? AVISO_SIN_CUENTA : null;
    if (avisoCobro) console.warn(`payout account missing for task ${tareaId}`);

    const cerca = phash ? await esCopiaAjena(deps.almacen, phash, evidencia.id, tareaId) : false;
    if (cerca) await deps.almacen.actualizarEvidencia(evidencia.id, { motivoCopia: MOTIVO_COPIA });

    const leida = await deps.fotos.leer(blobId);
    const intento = mileActivo ? fotosPrevias + 1 : undefined;
    const idioma = idiomaDePedido(request);
    const revisarAhora = deps.revisarTarea ?? ((tareaActual, fotoActual) => revisarPorDefecto(tareaActual, fotoActual, { intento, idioma }));
    const trabajo = revisarAhora(tarea, leida).then((resultado) => aplicarCopia(resultado, cerca));
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

async function revisarPorDefecto(
  tarea: TareaFila,
  foto: Awaited<ReturnType<Fotos["leer"]>>,
  extra?: { intento?: number; idioma: Idioma },
): Promise<ResultadoRevision> {
  return revisar(tarea, foto, {
    ...contextoDesdeEntorno(),
    intento: extra?.intento,
    idioma: extra?.idioma,
  });
}

function idiomaDePedido(request: Request): Idioma {
  const cookie = request.headers.get("cookie") ?? "";
  const par = cookie.split(";").map((parte) => parte.trim()).find((parte) => parte.startsWith(`${COOKIE_IDIOMA}=`));
  const valor = par ? decodeURIComponent(par.slice(COOKIE_IDIOMA.length + 1)) : null;
  return idiomaDe(valor);
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
    textoScout: unirDescripcion(resultado.texto, resultado.detalle, resultado.lectura),
    choice: resultado.choice,
    noul: resultado.noul ? "si" : "no",
    score: resultado.score,
    origen: resultado.origen,
    mile: resultado.mile ? serializarRevisionMile(resultado.mile) : null,
  };
  await almacen.guardarVeredicto(veredicto);
  if (resultado.mile && resultado.origen !== "error" && (await almacen.columnasRequisitos())) {
    const cambio: CambioTarea = { rechazo: resultado.mile.rechazoJson };
    if (resultado.mile.accion === "rechazar") cambio.estado = "pendiente";
    await almacen.actualizarTarea(tareaId, cambio);
  }
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

/** A later photo of the same task is a retake, not a copy of someone else's file. */
async function esCopiaAjena(almacen: Almacen, phash: string, evidenciaId: string, tareaId: string): Promise<boolean> {
  const cercanas = await almacen.evidenciasCercanas(phash, UMBRAL_COPIA, evidenciaId);
  for (const cerca of cercanas) {
    const fila = await almacen.leerEvidencia(cerca.id);
    if (!fila || fila.tareaId !== tareaId) return true;
  }
  return false;
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
