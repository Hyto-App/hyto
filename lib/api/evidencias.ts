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
import { esEvidenciaTextual, esImagen, nombreDeTipo, tipoPorBytes } from "@/lib/evidencia/tipo";
import { avisoArchivo, MAX_BYTES_ARCHIVO, validarBytes } from "@/lib/evidencia/validar";
import { esContrato } from "@/lib/escrow/cuerpos";
import { desdeFallo, type ResultadoRevision } from "@/lib/revision/armar";
import { falloDeExcepcion, FalloRevision, registrarFallo } from "@/lib/revision/fallo";
import { contextoDesdeEntorno, revisar } from "@/lib/revision/revisar";
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
        "x-content-type-options": "nosniff",
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
    const validado = validarBytes(bytes, { tipo: foto.type, nombre: nombreDeArchivo(foto) });
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
    const sha256 = sha256De(bytes);
    const duplicado = await clasificarDuplicado(deps.almacen, sha256, tareaId);
    if (duplicado.tipo === "otra" || duplicado.tipo === "hecha") {
      return json({ aviso: "This file was already submitted." }, 409);
    }

    const mileActivo = mileRequisitosActivo() && leerRequisitos(tarea.requisitos).length > 0;
    let fotosPrevias = 0;
    if (duplicado.tipo === "nuevo" && mileActivo) {
      fotosPrevias = await deps.almacen.contarEvidencias(tareaId);
      if (fotosPrevias >= maxIntentosMile()) return json({ aviso: AVISO_TOPE_MILE }, 409);
    }

    if (duplicado.tipo === "reintentar") {
      if (tarea.estado === "pendiente") await deps.almacen.actualizarTarea(tareaId, { estado: "en revisión" });
      if (wallet && wallet !== tarea.walletCobro) await deps.almacen.actualizarTarea(tareaId, { walletCobro: wallet });
      const avisoCobro = asignado && !demo && !wallet ? AVISO_SIN_CUENTA : null;
      if (avisoCobro) console.warn(`payout account missing for task ${tareaId}`);
      const idioma = idiomaDePedido(request);
      const intento = mileActivo ? await deps.almacen.contarEvidencias(tareaId) : undefined;
      await correrRevision(deps, tarea, duplicado.evidencia, {
        cerca: false,
        intento,
        idioma,
        bytes,
        tipo,
      });
      const guardada = (await deps.almacen.leerEvidencia(duplicado.evidencia.id)) ?? duplicado.evidencia;
      return json({ evidencia: evidenciaPublica(guardada), ...(avisoCobro ? { aviso: avisoCobro } : {}) }, 201);
    }

    let phash: string | null = null;
    if (esImagen(tipo)) {
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

    const cerca =
      phash && tarea.tipo !== "reembolso" ? await esCopiaAjena(deps.almacen, phash, evidencia.id, tareaId) : false;
    if (cerca) await deps.almacen.actualizarEvidencia(evidencia.id, { motivoCopia: MOTIVO_COPIA });

    const idioma = idiomaDePedido(request);
    const intento = mileActivo ? fotosPrevias + 1 : undefined;
    await correrRevision(deps, tarea, evidencia, { cerca, intento, idioma, bytes, tipo });
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

/** Hard stop for the review that continues after the upload response. A row is stored either way. */
export const TOPE_REVISION_FONDO_MS = 55_000;

export function cerrarRevisionEnFondo(
  almacen: Almacen,
  evidenciaId: string,
  tareaId: string,
  trabajo: Promise<ResultadoRevision>,
  ms = TOPE_REVISION_FONDO_MS,
): Promise<void> {
  return conTopeDuro(trabajo, ms)
    .then((resultado) => guardarRevision(almacen, evidenciaId, tareaId, resultado))
    .catch((error: unknown) => guardarFalloDeRevision(almacen, evidenciaId, tareaId, error));
}

function veredictoDeTiempo(): ResultadoRevision {
  const fallo = new FalloRevision("tiempo", { fuente: "revision" });
  registrarFallo(fallo);
  return desdeFallo(fallo);
}

function conTopeDuro(trabajo: Promise<ResultadoRevision>, ms: number): Promise<ResultadoRevision> {
  let temporizador: ReturnType<typeof setTimeout> | undefined;
  const limite = new Promise<ResultadoRevision>((resolve) => {
    temporizador = setTimeout(() => resolve(veredictoDeTiempo()), ms);
  });
  const vigilado = trabajo.then(
    (valor) => valor,
    (error: unknown) => Promise.reject(error),
  );
  // A rejection that arrives after the timeout already won must not surface as unhandled.
  vigilado.catch(() => undefined);
  return Promise.race([vigilado, limite]).finally(() => {
    if (temporizador !== undefined) clearTimeout(temporizador);
  });
}

async function guardarFalloDeRevision(
  almacen: Almacen,
  evidenciaId: string,
  tareaId: string,
  error: unknown,
): Promise<void> {
  const fallo = falloDeExcepcion(error, "revision");
  registrarFallo(fallo);
  try {
    await guardarRevision(almacen, evidenciaId, tareaId, desdeFallo(fallo));
  } catch (guardado) {
    console.error("[revision]", guardado instanceof Error ? guardado.message : "could not store the failure");
  }
}

function texto(valor: FormDataEntryValue | null): string {
  return typeof valor === "string" ? valor.trim() : "";
}

function nombreDeArchivo(entrada: Blob): string {
  if (typeof File !== "undefined" && entrada instanceof File) return entrada.name;
  return "";
}

export function tipoDeFoto(declarado: string, bytes: Uint8Array): string {
  const olido = tipoPorBytes(bytes);
  if (olido) return olido;
  if (bytes.length >= 6 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) return "image/gif";
  const limpio = declarado.trim().toLowerCase();
  if (limpio === "image/jpg" || limpio === "image/pjpeg") return "image/jpeg";
  if (limpio.startsWith("image/")) return limpio;
  if (limpio === "application/pdf") return "application/pdf";
  if (limpio === "text/html" || limpio === "text/plain" || limpio === "text/markdown") return "text/plain";
  return "application/octet-stream";
}

function disposicionDe(declarado: string, bytes: Uint8Array): string {
  const tipo = tipoDeFoto(declarado, bytes);
  if (tipo === "application/pdf") return 'inline; filename="invoice.pdf"';
  if (tipo === "text/plain") return 'inline; filename="evidencia.txt"';
  return "inline";
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

type Duplicado =
  | { tipo: "nuevo" }
  | { tipo: "otra" | "hecha" }
  | { tipo: "reintentar"; evidencia: EvidenciaFila };

/**
 * Identical bytes on another task stay a 409. The same file on this task is reviewed again
 * only when Mile never finished (no verdict, or an error verdict). A finished grade stays 409.
 */
async function clasificarDuplicado(almacen: Almacen, sha256: string, tareaId: string): Promise<Duplicado> {
  const previa = await almacen.evidenciaPorSha256(sha256);
  if (!previa) return { tipo: "nuevo" };
  if (previa.tareaId !== tareaId) return { tipo: "otra" };
  const veredicto = await almacen.veredictoDe(previa.id);
  if (!veredicto || veredicto.origen === "error") return { tipo: "reintentar", evidencia: previa };
  return { tipo: "hecha" };
}

async function correrRevision(
  deps: DepsEvidencia,
  tarea: TareaFila,
  evidencia: EvidenciaFila,
  extra: { cerca: boolean; intento: number | undefined; idioma: Idioma; bytes: Uint8Array; tipo: string },
): Promise<void> {
  if (!deps.fotos) return;
  const leida = await deps.fotos.leer(evidencia.blobId);
  const revisarAhora =
    deps.revisarTarea ?? ((tareaActual, fotoActual) => revisarPorDefecto(tareaActual, fotoActual, { intento: extra.intento, idioma: extra.idioma }));
  const trabajo = revisarAhora(tarea, leida).then((resultado) => aplicarCopia(resultado, extra.cerca));
  const entorno = contextoDesdeEntorno();
  const textual = esEvidenciaTextual({ tipo: extra.tipo, bytes: extra.bytes });
  const conTope = !deps.revisarTarea && (textual ? Boolean(entorno.layaUrl) : Boolean(entorno.claveGroq));
  const listo = conTope ? await conPlazo(trabajo, PLAZO_MS) : await trabajo;
  if (listo) {
    await guardarRevision(deps.almacen, evidencia.id, tarea.id, listo);
  } else if (deps.continuar) {
    deps.continuar(cerrarRevisionEnFondo(deps.almacen, evidencia.id, tarea.id, trabajo));
  }
}

/**
 * Near-duplicates are only this task, and only a work photo. A receipt is judged by sha256.
 * Another task's similar layout is not a copy. A later, different photo on this task is a retake
 * unless the hash is within UMBRAL_COPIA of a photo already on this task.
 */
async function esCopiaAjena(almacen: Almacen, phash: string, evidenciaId: string, tareaId: string): Promise<boolean> {
  const cercanas = await almacen.evidenciasCercanas(phash, UMBRAL_COPIA, evidenciaId);
  for (const cerca of cercanas) {
    const fila = await almacen.leerEvidencia(cerca.id);
    if (fila && fila.tareaId === tareaId) return true;
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
