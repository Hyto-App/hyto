import { bandejaDe, porPersona, resumir } from "@/lib/admin/vista";
import type { TareaAdmin, Veredicto, VistaAdmin } from "@/lib/admin/tipos";

export const INTERVALO_SONDEO_MS = 4000;
export const TOPE_SONDEO_MS = 30_000;

export type Marca = {
  tareaId: string;
  estado: string;
  evidenciaId: string | null;
  creadaEn: string | null;
  veredicto: Veredicto | null;
  origen: TareaAdmin["origen"];
  sello: string;
};

export type TareaSondeo = {
  id: string;
  estado: string;
  veredicto: string | null;
  origen: string | null;
};

export type ResultadoSondeo = {
  ok: boolean;
  avisar: boolean;
};

const VEREDICTOS = new Set<Veredicto>(["cumplió", "parcial", "insuficiente"]);
const ORIGENES = new Set<NonNullable<TareaAdmin["origen"]>>(["scout", "guion", "stub", "error"]);
const ESTADOS = new Set(["pendiente", "en revisión", "pagado"]);

export function esperaSondeo(fallos: number, oculto: boolean, intervalo = INTERVALO_SONDEO_MS): number | null {
  if (oculto) return null;
  const base = Number.isFinite(intervalo) && intervalo >= 15 ? intervalo : INTERVALO_SONDEO_MS;
  if (fallos <= 0) return base;
  return Math.min(TOPE_SONDEO_MS, base * 2 ** Math.min(fallos, 4));
}

export function planearCambios(
  conocidas: ReadonlyMap<string, string>,
  marcas: readonly Marca[],
  tareas: readonly TareaSondeo[],
  opciones: { exigirFoto: boolean; fotoDe?: (tareaId: string) => string | null },
): { ids: string[]; siguientes: Map<string, string> } {
  const porId = new Map(tareas.map((tarea) => [tarea.id, tarea]));
  const siguientes = new Map<string, string>();
  const ids: string[] = [];
  for (const marca of marcas) {
    siguientes.set(marca.tareaId, marca.sello);
    const conocida = conocidas.get(marca.tareaId);
    if (conocida === marca.sello) continue;
    const tarea = porId.get(marca.tareaId) ?? null;
    if (conocida === undefined && yaVista(marca, tarea, opciones)) continue;
    ids.push(marca.tareaId);
  }
  return { ids, siguientes };
}

export function mismaTareaAdmin(a: TareaAdmin, b: TareaAdmin): boolean {
  const claves = new Set<string>([...Object.keys(a), ...Object.keys(b)]);
  for (const clave of claves) {
    if (a[clave as keyof TareaAdmin] !== b[clave as keyof TareaAdmin]) return false;
  }
  return true;
}

export function fusionarVista(vista: VistaAdmin, llegadas: readonly TareaAdmin[]): VistaAdmin {
  if (llegadas.length === 0) return vista;
  const porId = new Map(llegadas.map((tarea) => [tarea.id, tarea]));
  let cambio = false;
  const tareas = vista.tareas.map((tarea) => {
    const nueva = porId.get(tarea.id);
    if (!nueva) return tarea;
    porId.delete(tarea.id);
    if (mismaTareaAdmin(tarea, nueva)) return tarea;
    cambio = true;
    return nueva;
  });
  for (const extra of porId.values()) {
    tareas.push(extra);
    cambio = true;
  }
  if (!cambio) return vista;
  return {
    ...vista,
    tareas,
    bandeja: bandejaDe(tareas),
    resumen: resumir(tareas),
    personas: porPersona(tareas),
  };
}

export function leerCambios(valor: unknown): { cursor: string; cambios: Marca[] } | null {
  if (!valor || typeof valor !== "object") return null;
  const datos = valor as { cursor?: unknown; cambios?: unknown };
  if (typeof datos.cursor !== "string" || !/^[a-f0-9]{32}$/.test(datos.cursor)) return null;
  if (!Array.isArray(datos.cambios)) return null;
  const cambios: Marca[] = [];
  for (const item of datos.cambios) {
    const marca = leerMarca(item);
    if (!marca) return null;
    cambios.push(marca);
  }
  return { cursor: datos.cursor, cambios };
}

export async function leerNovedades(
  fetchImpl: typeof fetch,
  proyectoId: string,
  cursor: string | null,
  signal?: AbortSignal,
): Promise<
  | { tipo: "igual"; cursor: string }
  | { tipo: "cambio"; cursor: string; cambios: Marca[] }
  | { tipo: "fallo"; estado: number }
> {
  const since = cursor ? `?since=${encodeURIComponent(cursor)}` : "";
  const respuesta = await fetchImpl(`/api/eventos/${encodeURIComponent(proyectoId)}/novedades${since}`, {
    method: "GET",
    cache: "no-store",
    headers: cursor ? { "if-none-match": `"${cursor}"` } : {},
    signal: senalDe(signal),
  });
  if (respuesta.status === 304) return { tipo: "igual", cursor: cursor ?? "" };
  if (!respuesta.ok) return { tipo: "fallo", estado: respuesta.status };
  const cuerpo = (await respuesta.json().catch(() => null)) as unknown;
  const leido = leerCambios(cuerpo);
  if (!leido) return { tipo: "fallo", estado: respuesta.status };
  return leido.cursor ? { tipo: "cambio", cursor: leido.cursor, cambios: leido.cambios } : { tipo: "fallo", estado: respuesta.status };
}

function yaVista(
  marca: Marca,
  tarea: TareaSondeo | null,
  opciones: { exigirFoto: boolean; fotoDe?: (tareaId: string) => string | null },
): boolean {
  if (!tarea) {
    return marca.evidenciaId === null && marca.veredicto === null && marca.origen === null && marca.estado === "pendiente";
  }
  if (tarea.estado !== marca.estado) return false;
  if ((tarea.veredicto ?? null) !== marca.veredicto) return false;
  if ((tarea.origen ?? null) !== marca.origen) return false;
  if (!opciones.exigirFoto) return true;
  const foto = opciones.fotoDe?.(marca.tareaId) ?? null;
  if (marca.evidenciaId) return Boolean(foto && foto.includes(marca.evidenciaId));
  return !foto;
}

function leerMarca(valor: unknown): Marca | null {
  if (!valor || typeof valor !== "object") return null;
  const datos = valor as Record<string, unknown>;
  const tareaId = texto(datos.tareaId);
  const sello = texto(datos.sello);
  if (!tareaId || tareaId.length > 80 || !sello || !/^[a-f0-9]{32}$/.test(sello)) return null;
  if (typeof datos.estado !== "string" || !ESTADOS.has(datos.estado)) return null;
  const veredicto = datos.veredicto === null ? null : texto(datos.veredicto);
  if (veredicto !== null && !VEREDICTOS.has(veredicto as Veredicto)) return null;
  const origen = datos.origen === null ? null : texto(datos.origen);
  if (origen !== null && !ORIGENES.has(origen as NonNullable<TareaAdmin["origen"]>)) return null;
  const evidenciaId = datos.evidenciaId === null ? null : texto(datos.evidenciaId);
  if (datos.evidenciaId !== null && !evidenciaId) return null;
  const creadaEn = datos.creadaEn === null ? null : texto(datos.creadaEn);
  if (datos.creadaEn !== null && (!creadaEn || creadaEn.length > 40)) return null;
  return {
    tareaId,
    estado: datos.estado,
    evidenciaId,
    creadaEn,
    veredicto: veredicto as Veredicto | null,
    origen: origen as TareaAdmin["origen"],
    sello,
  };
}

function texto(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  const limpio = valor.trim();
  return limpio ? limpio : null;
}

function senalDe(signal?: AbortSignal): AbortSignal {
  const tiempo = AbortSignal.timeout(8000);
  if (!signal) return tiempo;
  if (typeof AbortSignal.any === "function") return AbortSignal.any([tiempo, signal]);
  return signal;
}
