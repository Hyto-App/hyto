import { evidenciaEjemplo, tareasEjemplo } from "./ejemplos";
import type { EstadoTarea, Evidencia, Tarea, TipoTarea } from "./tipos";

const ESTADOS: EstadoTarea[] = ["pendiente", "en revisión", "pagado"];
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
  evidencia: Evidencia;
  ejemplo: boolean;
};

export class ErrorDeSesion extends Error {
  readonly aviso: string;

  constructor(aviso: string) {
    super(aviso);
    this.name = "ErrorDeSesion";
    this.aviso = aviso;
  }
}

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
  };
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

async function avisoDeAuth(respuesta: Response): Promise<string> {
  try {
    const json = (await respuesta.json()) as { aviso?: unknown };
    if (json && typeof json.aviso === "string" && json.aviso.trim()) return json.aviso.trim();
  } catch {
    // cuerpo vacío o no JSON
  }
  return "Sign in to continue.";
}

async function pedir(url: string, init: RequestInit, fetchImpl: typeof fetch): Promise<Response> {
  return fetchImpl(url, { ...init, signal: AbortSignal.timeout(4000) });
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

export async function subirEvidencia(tarea: Tarea, foto: Blob, opciones: OpcionesRuta = {}): Promise<FotoEnviada> {
  const fetchImpl = opciones.fetch ?? fetch;
  const base = opciones.baseUrl ?? "";
  const cuerpo = new FormData();
  cuerpo.set("tareaId", tarea.id);
  cuerpo.set("foto", foto, "evidencia.jpg");
  if (tarea.miembroId) cuerpo.set("miembroId", tarea.miembroId);
  if (tarea.walletCobro) cuerpo.set("wallet", tarea.walletCobro);

  try {
    const respuesta = await pedir(`${base}/api/evidencias`, { method: "POST", body: cuerpo }, fetchImpl);
    if (respuesta.status === 401 || respuesta.status === 403) throw new ErrorDeSesion(await avisoDeAuth(respuesta));
    if (!respuesta.ok) throw new Error(String(respuesta.status));
    const creada = normalizarEvidencia(await leerJson(respuesta), tarea.id);
    if (!creada) throw new Error("forma");

    try {
      const lectura = await pedir(`${base}/api/evidencias/${creada.id}`, { method: "GET" }, fetchImpl);
      if (!lectura.ok) return { evidencia: creada, ejemplo: false };
      const leida = normalizarEvidencia(await leerJson(lectura), tarea.id);
      return { evidencia: leida ?? creada, ejemplo: false };
    } catch (error) {
      if (error instanceof ErrorDeSesion) throw error;
      return { evidencia: creada, ejemplo: false };
    }
  } catch (error) {
    if (error instanceof ErrorDeSesion) throw error;
    return { evidencia: evidenciaEjemplo(tarea), ejemplo: true };
  }
}
