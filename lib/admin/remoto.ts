import { bandejaDe, porPersona, resumir } from "@/lib/admin/vista";
import type { TareaAdmin, VistaAdmin } from "@/lib/admin/tipos";
import type { EstadoTarea, TipoTarea } from "@/lib/integrante/tipos";

export type DetalleRevision = {
  tarea: TareaAdmin;
  foto: string | null;
};

export type OpcionesRemoto = {
  fetch?: typeof fetch;
};

export function botonesRevision(tarea: TareaAdmin, real: boolean): {
  desplegar: boolean;
  pagar: boolean;
  aprobarLocal: boolean;
  pedirOtra: boolean;
} {
  if (!real) {
    const puede = tarea.estado === "en revisión" && tarea.veredicto !== null;
    return {
      desplegar: false,
      pagar: false,
      aprobarLocal: puede,
      pedirOtra: puede && tarea.veredicto !== "cumplió",
    };
  }
  return {
    desplegar: tarea.estado !== "pagado",
    pagar: tarea.estado === "en revisión",
    aprobarLocal: false,
    pedirOtra: false,
  };
}

export async function cargarDetalleOrganizador(tareaId: string, opciones: OpcionesRemoto = {}): Promise<DetalleRevision | null> {
  const fetchImpl = opciones.fetch ?? fetch;
  const id = tareaId.trim();
  if (!id) return null;
  try {
    const [lista, revision] = await Promise.all([
      pedir(fetchImpl, "/api/tareas"),
      pedir(fetchImpl, `/api/revision/${encodeURIComponent(id)}`),
    ]);
    if (revision.status === 401 || revision.status === 403) return null;
    if (!revision.ok) return null;
    const detalle = detalleDe(await revision.json());
    if (!detalle) return null;
    if (lista.ok) await lista.json().catch(() => null);
    return detalle;
  } catch {
    return null;
  }
}

export async function cargarVistaOrganizador(opciones: OpcionesRemoto = {}): Promise<VistaAdmin | null> {
  const fetchImpl = opciones.fetch ?? fetch;
  let ids: string[];
  try {
    const lista = await pedir(fetchImpl, "/api/tareas");
    if (!lista.ok) return null;
    const leidos = idsDe(await lista.json());
    if (!leidos) return null;
    ids = leidos;
  } catch {
    return null;
  }

  if (ids.length === 0) {
    if (!(await esOrganizador(fetchImpl))) return null;
    return armarVista([], await nombreProyecto(fetchImpl));
  }

  const detalles = await Promise.all(ids.map((id) => leerUna(fetchImpl, id)));
  if (detalles.some((item) => item === "ajeno")) return null;
  const tareas = detalles.flatMap((item) => (item && item !== "ajeno" && item !== "fallo" ? [item.tarea] : []));
  if (tareas.length === 0) return null;
  return armarVista(tareas, await nombreProyecto(fetchImpl));
}

async function leerUna(fetchImpl: typeof fetch, id: string): Promise<DetalleRevision | "ajeno" | "fallo"> {
  try {
    const revision = await pedir(fetchImpl, `/api/revision/${encodeURIComponent(id)}`);
    if (revision.status === 401 || revision.status === 403) return "ajeno";
    if (!revision.ok) return "fallo";
    return detalleDe(await revision.json()) ?? "fallo";
  } catch {
    return "fallo";
  }
}

async function esOrganizador(fetchImpl: typeof fetch): Promise<boolean> {
  try {
    const revision = await pedir(fetchImpl, "/api/revision/hyto-sin-tarea");
    return revision.status === 404;
  } catch {
    return false;
  }
}

async function nombreProyecto(fetchImpl: typeof fetch): Promise<string> {
  try {
    const respuesta = await pedir(fetchImpl, "/api/proyectos");
    if (!respuesta.ok) return "";
    const json = (await respuesta.json()) as { proyecto?: { nombre?: unknown } };
    return typeof json.proyecto?.nombre === "string" ? json.proyecto.nombre : "";
  } catch {
    return "";
  }
}

function armarVista(tareas: TareaAdmin[], nombre: string): VistaAdmin {
  return {
    nombre,
    ejemplo: false,
    propio: false,
    tareas,
    bandeja: bandejaDe(tareas),
    resumen: resumir(tareas),
    personas: porPersona(tareas),
  };
}

function detalleDe(json: unknown): DetalleRevision | null {
  if (!json || typeof json !== "object") return null;
  const datos = json as Record<string, unknown>;
  const tarea = leerTareaAdmin(datos.tarea);
  if (!tarea) return null;
  const foto = typeof datos.foto === "string" && datos.foto.trim() ? datos.foto.trim() : null;
  return { tarea, foto };
}

function idsDe(json: unknown): string[] | null {
  if (!json || typeof json !== "object") return null;
  const tareas = (json as { tareas?: unknown }).tareas;
  if (!Array.isArray(tareas)) return null;
  const ids: string[] = [];
  for (const item of tareas) {
    if (!item || typeof item !== "object") continue;
    const id = (item as { id?: unknown }).id;
    if (typeof id === "string" && id.trim()) ids.push(id.trim());
  }
  return ids;
}

function leerTareaAdmin(valor: unknown): TareaAdmin | null {
  if (!valor || typeof valor !== "object") return null;
  const datos = valor as Record<string, unknown>;
  const id = texto(datos.id);
  const titulo = texto(datos.titulo);
  const tipo = tipoDe(datos.tipo);
  if (!id || !titulo || !tipo) return null;
  const pago = camposPago(datos);
  return {
    id,
    titulo,
    tipo,
    monto: texto(datos.monto) ?? "0",
    tope: texto(datos.tope),
    condicion: texto(datos.condicion) ?? "",
    miembroId: texto(datos.miembroId) ?? "",
    miembro: texto(datos.miembro) ?? "Sin asignar",
    estado: estadoDe(datos.estado),
    veredicto: veredictoDe(datos.veredicto),
    frase: texto(datos.frase),
    montoRevisado: texto(datos.montoRevisado),
    fecha: texto(datos.fecha),
    hashPago: pago.hashPago,
    credencialUrl: pago.credencialUrl,
  };
}

function camposPago(datos: Record<string, unknown>): { hashPago: string | null; credencialUrl: string | null } {
  const hashPago = texto(datos.hashPago);
  const credencialUrl = texto(datos.credencialUrl);
  return { hashPago, credencialUrl };
}

function tipoDe(valor: unknown): TipoTarea | null {
  if (valor === "trabajo" || valor === "reembolso") return valor;
  return null;
}

function estadoDe(valor: unknown): EstadoTarea {
  if (valor === "pendiente" || valor === "en revisión" || valor === "pagado") return valor;
  return "pendiente";
}

function veredictoDe(valor: unknown): TareaAdmin["veredicto"] {
  if (valor === "cumplió" || valor === "parcial" || valor === "insuficiente") return valor;
  return null;
}

function texto(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  const limpio = valor.trim();
  return limpio ? limpio : null;
}

function pedir(fetchImpl: typeof fetch, url: string): Promise<Response> {
  return fetchImpl(url, { method: "GET", cache: "no-store", signal: AbortSignal.timeout(8000) });
}
