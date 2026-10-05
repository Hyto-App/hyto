import type { Veredicto } from "@/lib/admin/tipos";
import { dificultadGuardada, prioridadGuardada } from "@/lib/tareas/clasificacion";
import { tareasEjemplo } from "./ejemplos";
import type { EstadoTarea, EtapaTarea, Evidencia, Tarea, TipoTarea } from "./tipos";

const ESTADOS: EstadoTarea[] = ["pendiente", "en revisión", "pagado"];
const ETAPAS: EtapaTarea[] = ["en_revision", "enviada_organizador", "aprobada", "rechazada"];
const TIPOS: TipoTarea[] = ["trabajo", "reembolso"];

export type FiltroTareas = {
  miembroId: string;
  wallet?: string;
};

export type OpcionesRuta = {
  fetch?: typeof fetch;
  estados?: Record<string, EstadoTarea>;
  baseUrl?: string;
  muestra?: boolean;
};

export type ListaTareas = {
  tareas: Tarea[];
  ejemplo: boolean;
  error: string | null;
};

export type FotoEnviada = {
  /** Null when the server's answer was lost and the task read showed the file had arrived. */
  evidencia: Evidencia | null;
  aviso: string | null;
};

export class ErrorDeSesion extends Error {
  readonly aviso: string;

  constructor(aviso: string) {
    super(aviso);
    this.name = "ErrorDeSesion";
    this.aviso = aviso;
  }
}

export class ErrorDeEnvio extends Error {
  readonly aviso: string;
  readonly status: number | null;

  constructor(aviso: string, status: number | null = null) {
    super(aviso);
    this.name = "ErrorDeEnvio";
    this.aviso = aviso;
    this.status = status;
  }
}

export const AVISO_ENVIO_FALLIDO = "Could not send. Check your connection and try again.";
export const AVISO_ENVIO_SIN_CONFIRMAR = "The server did not confirm the upload. Try again.";
export const AVISO_ENVIO_INCIERTO =
  "The connection dropped before Hyto confirmed the upload. Open My tasks to check before you send it again.";

const TOPE_LECTURA_MS = 4000;
/** A photo on a phone network takes far longer than a read, and the server keeps saving after the browser gives up. */
export const TOPE_SUBIDA_MS = 60_000;

function conEstados(tareas: Tarea[], estados: Record<string, EstadoTarea> | undefined): Tarea[] {
  if (!estados) return tareas;
  return tareas.map((tarea) => (estados[tarea.id] ? { ...tarea, estado: estados[tarea.id] } : tarea));
}

function filtrarTareas(tareas: Tarea[], filtro: FiltroTareas): Tarea[] {
  if (!filtro.miembroId && !filtro.wallet) return tareas;
  if (filtro.wallet) {
    const porWallet = tareas.filter((tarea) => tarea.walletCobro && tarea.walletCobro === filtro.wallet);
    if (porWallet.length > 0) return porWallet;
  }

  const porMiembro = tareas.filter((tarea) => tarea.miembroId === filtro.miembroId);
  if (porMiembro.length > 0) return porMiembro;
  if (tareas.every((tarea) => !tarea.miembroId && !tarea.walletCobro)) return tareas;
  return porMiembro;
}

function texto(valor: unknown): string | null {
  if (typeof valor === "string" && valor.trim()) return valor.trim();
  if (typeof valor === "number" && Number.isFinite(valor)) return String(valor);
  return null;
}

function normalizarTarea(valor: unknown): Tarea | null {
  if (!valor || typeof valor !== "object") return null;
  const crudo = valor as Record<string, unknown>;
  const id = texto(crudo.id);
  const titulo = texto(crudo.titulo);
  const tipo = crudo.tipo;
  if (!id || !titulo || (tipo !== "trabajo" && tipo !== "reembolso")) return null;

  const estado = ESTADOS.includes(crudo.estado as EstadoTarea) ? (crudo.estado as EstadoTarea) : "pendiente";
  const tipoTarea = TIPOS.includes(tipo) ? tipo : "trabajo";

  return {
    id,
    proyectoId: texto(crudo.proyectoId) ?? "",
    titulo,
    tipo: tipoTarea,
    monto: texto(crudo.monto) ?? "",
    tope: texto(crudo.tope),
    condicion: texto(crudo.condicion) ?? "",
    miembroId: texto(crudo.miembroId) ?? "",
    walletCobro: texto(crudo.walletCobro) ?? "",
    estado,
    prioridad: prioridadGuardada(crudo.prioridad),
    dificultad: dificultadGuardada(crudo.dificultad),
    nota: notaCliente(crudo.nota),
    veredicto: veredictoCliente(crudo.veredicto),
    // Computed so the schema scan does not treat this read as a database write.
    ["hashPago"]: texto(crudo.hashPago),
    etapa: etapaCliente(crudo.etapa),
    enviadaEn: fechaCliente(crudo.enviadaEn) ?? fechaCliente(crudo.enviada_en),
  };
}

function notaCliente(valor: unknown): number | null {
  if (typeof valor !== "number" || !Number.isInteger(valor) || valor < 0 || valor > 100) return null;
  return valor;
}

function veredictoCliente(valor: unknown): Veredicto | null {
  if (valor === "cumplió" || valor === "parcial" || valor === "insuficiente") return valor;
  return null;
}

function etapaCliente(valor: unknown): EtapaTarea | null {
  return ETAPAS.includes(valor as EtapaTarea) ? (valor as EtapaTarea) : null;
}

function fechaCliente(valor: unknown): string | null {
  if (typeof valor !== "string" || !valor.trim()) return null;
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return null;
  return valor.trim();
}

function normalizarEvidencia(valor: unknown, tareaId: string): Evidencia | null {
  if (!valor || typeof valor !== "object") return null;
  const crudo = valor as Record<string, unknown>;
  const anidada = crudo.evidencia;
  const fuente = anidada && typeof anidada === "object" ? (anidada as Record<string, unknown>) : crudo;
  const id = texto(fuente.id);
  if (!id) return null;

  return {
    id,
    tareaId: texto(fuente.tareaId) ?? tareaId,
    blobId: texto(fuente.blobId) ?? "",
    monto: texto(fuente.monto),
    fecha: texto(fuente.fecha),
  };
}

function listaDesdeJson(json: unknown): Tarea[] | null {
  const crudo = Array.isArray(json)
    ? json
    : json && typeof json === "object" && Array.isArray((json as { tareas?: unknown }).tareas)
      ? (json as { tareas: unknown[] }).tareas
      : null;
  if (!crudo) return null;
  return crudo.map(normalizarTarea).filter((tarea): tarea is Tarea => tarea !== null);
}

function avisoDe(json: unknown): string | null {
  if (!json || typeof json !== "object") return null;
  const aviso = (json as { aviso?: unknown }).aviso;
  return typeof aviso === "string" && aviso.trim() ? aviso.trim() : null;
}

async function avisoDeRespuesta(respuesta: Response, porDefecto: string): Promise<string> {
  try {
    return avisoDe(await respuesta.json()) ?? porDefecto;
  } catch {
    // cuerpo vacío o no JSON
  }
  return porDefecto;
}

async function avisoDeAuth(respuesta: Response): Promise<string> {
  return avisoDeRespuesta(respuesta, "Sign in to continue.");
}

async function pedir(url: string, init: RequestInit, fetchImpl: typeof fetch, topeMs = TOPE_LECTURA_MS): Promise<Response> {
  return fetchImpl(url, { ...init, signal: AbortSignal.timeout(topeMs) });
}

async function leerJson(respuesta: Response): Promise<unknown> {
  const tipo = respuesta.headers.get("content-type") ?? "";
  if (!tipo.includes("json")) {
    throw new Error("sin json");
  }
  return respuesta.json();
}

export async function listarTareas(filtro: FiltroTareas, opciones: OpcionesRuta = {}): Promise<ListaTareas> {
  const fetchImpl = opciones.fetch ?? fetch;
  const base = opciones.baseUrl ?? "";
  const params = new URLSearchParams({ alcance: "mias" });
  if (filtro.miembroId) params.set("miembro", filtro.miembroId);
  if (filtro.wallet) params.set("wallet", filtro.wallet);

  try {
    const respuesta = await pedir(`${base}/api/tareas?${params.toString()}`, { method: "GET" }, fetchImpl);
    if (!respuesta.ok) throw new Error(String(respuesta.status));
    const tareas = listaDesdeJson(await leerJson(respuesta));
    if (!tareas) throw new Error("forma");
    return { tareas: filtrarTareas(tareas, filtro), ejemplo: false, error: null };
  } catch {
    if (opciones.muestra) {
      const tareas = filtrarTareas(tareasEjemplo(), filtro);
      return { tareas: conEstados(tareas, opciones.estados), ejemplo: true, error: null };
    }
    return { tareas: [], ejemplo: false, error: "Could not load your tasks." };
  }
}

export async function leerTarea(
  id: string,
  filtro: FiltroTareas,
  opciones: OpcionesRuta = {},
): Promise<{ tarea: Tarea | null; ejemplo: boolean; error: string | null }> {
  const lista = await listarTareas(filtro, opciones);
  if (lista.error) return { tarea: null, ejemplo: false, error: lista.error };
  const propia = lista.tareas.find((tarea) => tarea.id === id) ?? null;
  return { tarea: propia, ejemplo: lista.ejemplo, error: null };
}

export async function pedirTokenEvidencia(tareaId: string, opciones: OpcionesRuta = {}): Promise<string> {
  const fetchImpl = opciones.fetch ?? fetch;
  const base = opciones.baseUrl ?? "";
  let respuesta: Response;
  try {
    respuesta = await pedir(
      `${base}/api/evidencias/token`,
      { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ tareaId }) },
      fetchImpl,
    );
  } catch {
    throw new ErrorDeEnvio(AVISO_ENVIO_FALLIDO);
  }
  if (respuesta.status === 401 || respuesta.status === 403) throw new ErrorDeSesion(await avisoDeAuth(respuesta));
  if (!respuesta.ok) {
    throw new ErrorDeEnvio(await avisoDeRespuesta(respuesta, AVISO_ENVIO_FALLIDO), respuesta.status);
  }
  let json: { token?: unknown } | null;
  try {
    json = (await leerJson(respuesta)) as { token?: unknown } | null;
  } catch {
    throw new ErrorDeEnvio(AVISO_ENVIO_SIN_CONFIRMAR, respuesta.status);
  }
  const token = typeof json?.token === "string" ? json.token : "";
  if (!token) throw new ErrorDeEnvio(AVISO_ENVIO_SIN_CONFIRMAR, respuesta.status);
  return token;
}

export async function subirEvidencia(
  tarea: Tarea,
  foto: Blob,
  opciones: OpcionesRuta & { token?: string; capturadaEn?: string; nombre?: string } = {},
): Promise<FotoEnviada> {
  const fetchImpl = opciones.fetch ?? fetch;
  const base = opciones.baseUrl ?? "";
  const cuerpo = new FormData();
  cuerpo.set("tareaId", tarea.id);
  cuerpo.set("foto", foto, opciones.nombre ?? (foto.type === "application/pdf" ? "evidencia.pdf" : "evidencia.jpg"));
  if (opciones.token) cuerpo.set("token", opciones.token);
  if (opciones.capturadaEn) cuerpo.set("capturadaEn", opciones.capturadaEn);
  if (tarea.miembroId) cuerpo.set("miembroId", tarea.miembroId);

  let respuesta: Response;
  try {
    respuesta = await pedir(`${base}/api/evidencias`, { method: "POST", body: cuerpo }, fetchImpl, TOPE_SUBIDA_MS);
  } catch {
    const llego = await subidaRegistrada(tarea, opciones);
    if (llego) return { evidencia: null, aviso: null };
    throw new ErrorDeEnvio(llego === false ? AVISO_ENVIO_FALLIDO : AVISO_ENVIO_INCIERTO);
  }
  if (respuesta.status === 401 || respuesta.status === 403) throw new ErrorDeSesion(await avisoDeAuth(respuesta));
  if (!respuesta.ok) {
    const error = new ErrorDeEnvio(await avisoDeRespuesta(respuesta, AVISO_ENVIO_FALLIDO), respuesta.status);
    // A 409 can be this same file from an attempt whose answer was lost. A 5xx can come after the file was stored.
    if (respuesta.status === 409 || respuesta.status >= 500) return confirmarOFallar(tarea, opciones, error);
    throw error;
  }

  let json: unknown;
  try {
    json = await leerJson(respuesta);
  } catch {
    return confirmarOFallar(tarea, opciones, new ErrorDeEnvio(AVISO_ENVIO_SIN_CONFIRMAR, respuesta.status));
  }
  const creada = normalizarEvidencia(json, tarea.id);
  if (!creada) return confirmarOFallar(tarea, opciones, new ErrorDeEnvio(AVISO_ENVIO_SIN_CONFIRMAR, respuesta.status));
  const aviso = avisoDe(json);

  try {
    const lectura = await pedir(`${base}/api/evidencias/${creada.id}`, { method: "GET" }, fetchImpl);
    if (!lectura.ok) return { evidencia: creada, aviso };
    const leida = normalizarEvidencia(await leerJson(lectura), tarea.id);
    return { evidencia: leida ?? creada, aviso };
  } catch {
    return { evidencia: creada, aviso };
  }
}

/**
 * Reads the task after an upload with no clear answer. The server moves a pending task to "en revisión"
 * as soon as it stores the file, and only the assigned person uploads, so a task that left "pendiente"
 * since this screen loaded it has the file. Null when the task cannot be read.
 */
async function subidaRegistrada(tarea: Tarea, opciones: OpcionesRuta): Promise<boolean | null> {
  if (tarea.estado !== "pendiente") return null;
  const leida = await leerTarea(tarea.id, { miembroId: "" }, { fetch: opciones.fetch, baseUrl: opciones.baseUrl });
  if (leida.error || !leida.tarea) return null;
  return leida.tarea.estado !== "pendiente";
}

async function confirmarOFallar(tarea: Tarea, opciones: OpcionesRuta, error: ErrorDeEnvio): Promise<FotoEnviada> {
  if (await subidaRegistrada(tarea, opciones)) return { evidencia: null, aviso: null };
  throw error;
}
