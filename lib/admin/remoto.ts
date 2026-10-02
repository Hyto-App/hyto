import { bandejaDe, normalizarMonto, porPersona, resumir } from "@/lib/admin/vista";
import { cifraConfirmada } from "@/lib/escrow/monto";
import type { TareaAdmin, VistaAdmin } from "@/lib/admin/tipos";
import type { EstadoTarea, TipoTarea } from "@/lib/integrante/tipos";
import { etiquetaDesdeNota, notaDeTexto } from "@/lib/revision/pesos";

export type DetalleRevision = {
  tarea: TareaAdmin;
  foto: string | null;
  contratoEscrow: string | null;
  walletCobro: string | null;
  wallet: string | null;
};

export function montoDeVista(tarea: TareaAdmin): number | null {
  if (tarea.tipo === "reembolso") return cifraConfirmada(tarea.montoConfirmado, tarea.tope, tarea.monto);
  const normal = normalizarMonto(tarea.monto);
  if (!normal) return null;
  const monto = Number(normal);
  if (!(monto > 0) || !Number.isFinite(monto)) return null;
  return monto;
}

export function escrowFondeado(json: unknown): boolean | null {
  if (!json || typeof json !== "object") return null;
  const raiz = json as Record<string, unknown>;
  const escrow = raiz.escrow && typeof raiz.escrow === "object" ? (raiz.escrow as Record<string, unknown>) : raiz;
  return saldoPositivo(escrow.balance);
}

export async function leerFondeo(contrato: string, opciones: OpcionesRemoto = {}): Promise<boolean | null> {
  const id = contrato.trim();
  if (!id) return null;
  try {
    const respuesta = await pedir(opciones.fetch ?? fetch, `/api/escrow/${encodeURIComponent(id)}`);
    if (!respuesta.ok) return null;
    return escrowFondeado(await respuesta.json());
  } catch {
    return null;
  }
}

export type OpcionesRemoto = {
  fetch?: typeof fetch;
  proyectoId?: string;
};

export function botonesRevision(
  tarea: TareaAdmin,
  real: boolean,
  escrow: { contrato: string | null; fondeado: boolean | null } = { contrato: null, fondeado: null },
): {
  desplegar: boolean;
  fondear: boolean;
  pagar: boolean;
  aprobarLocal: boolean;
  pedirOtra: boolean;
} {
  if (!real) {
    const puede = tarea.estado === "en revisión" && tarea.veredicto !== null;
    return {
      desplegar: false,
      fondear: false,
      pagar: false,
      aprobarLocal: puede,
      // The sample hides another-photo only in the Met band. The grade never pays.
      pedirOtra: puede && tarea.veredicto !== "cumplió",
    };
  }
  const abierto = tarea.estado !== "pagado";
  const conContrato = Boolean(escrow.contrato);
  const bloqueado = tarea.tipo === "reembolso" && montoDeVista(tarea) === null;
  return {
    desplegar: !bloqueado && abierto && !conContrato,
    fondear: !bloqueado && abierto && conContrato && escrow.fondeado === false,
    // A percentage never approves the payment. Pay follows the escrow balance.
    pagar: !bloqueado && tarea.estado === "en revisión" && conContrato && escrow.fondeado === true,
    aprobarLocal: false,
    pedirOtra: tarea.estado === "en revisión",
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
    if (lista.ok) {
      const filas = await lista.json().catch(() => null);
      return cruzarLista(detalle, filaDe(filas, detalle.tarea.id));
    }
    return detalle;
  } catch {
    return null;
  }
}

export async function cargarVistaOrganizador(opciones: OpcionesRemoto = {}): Promise<VistaAdmin | null> {
  const fetchImpl = opciones.fetch ?? fetch;
  let filas: FilaTarea[];
  try {
    const lista = await pedir(fetchImpl, "/api/tareas");
    if (!lista.ok) return null;
    const leidas = filasDe(await lista.json());
    if (!leidas) return null;
    filas = opciones.proyectoId ? leidas.filter((fila) => fila.proyectoId === opciones.proyectoId) : leidas;
  } catch {
    return null;
  }

  if (filas.length === 0) {
    return armarVista([], await nombreProyecto(fetchImpl, opciones.proyectoId));
  }

  const detalles = await Promise.all(filas.map((fila) => leerUna(fetchImpl, fila.id)));
  if (detalles.some((item) => item === "ajeno" || item === "fallo")) return null;
  const porId = new Map(filas.map((fila) => [fila.id, fila]));
  const tareas = detalles.flatMap((item) => {
    if (!item || item === "ajeno" || item === "omitida" || item === "fallo") return [];
    return [cruzarLista(item, porId.get(item.tarea.id) ?? null).tarea];
  });
  if (tareas.length === 0 && detalles.some((item) => item === "omitida")) {
    return armarVista([], await nombreProyecto(fetchImpl, opciones.proyectoId));
  }
  if (tareas.length === 0) return null;
  return armarVista(tareas, await nombreProyecto(fetchImpl, opciones.proyectoId));
}

function cruzarLista(detalle: DetalleRevision, fila: FilaTarea | null): DetalleRevision {
  if (!fila) return detalle;
  const contratoEscrow = detalle.contratoEscrow ?? fila.contratoEscrow;
  const hashPago = detalle.tarea.hashPago ?? fila.hashPago;
  if (hashPago === detalle.tarea.hashPago && contratoEscrow === detalle.contratoEscrow) return detalle;
  return { ...detalle, contratoEscrow, tarea: { ...detalle.tarea, hashPago } };
}

async function leerUna(fetchImpl: typeof fetch, id: string): Promise<DetalleRevision | "ajeno" | "omitida" | "fallo"> {
  try {
    const revision = await pedir(fetchImpl, `/api/revision/${encodeURIComponent(id)}`);
    if (revision.status === 401) return "ajeno";
    if (revision.status === 403) return "omitida";
    if (!revision.ok) return "fallo";
    return detalleDe(await revision.json()) ?? "fallo";
  } catch {
    return "fallo";
  }
}

async function nombreProyecto(fetchImpl: typeof fetch, proyectoId?: string): Promise<string> {
  try {
    const consulta = proyectoId ? `/api/proyectos?id=${encodeURIComponent(proyectoId)}` : "/api/proyectos";
    const respuesta = await pedir(fetchImpl, consulta);
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
  return {
    tarea,
    foto,
    contratoEscrow: texto(datos.contratoEscrow),
    walletCobro: texto(datos.walletCobro),
    wallet: texto(datos.wallet),
  };
}

type FilaTarea = {
  id: string;
  proyectoId: string | null;
  hashPago: string | null;
  contratoEscrow: string | null;
};

function filasDe(json: unknown): FilaTarea[] | null {
  if (!json || typeof json !== "object") return null;
  const tareas = (json as { tareas?: unknown }).tareas;
  if (!Array.isArray(tareas)) return null;
  const filas: FilaTarea[] = [];
  for (const item of tareas) {
    if (!item || typeof item !== "object") continue;
    const datos = item as Record<string, unknown>;
    const id = texto(datos.id);
    if (!id) continue;
    const hashPago = texto(datos.hashPago);
    const contratoEscrow = texto(datos.contratoEscrow);
    filas.push({ id, proyectoId: texto(datos.proyectoId), hashPago, contratoEscrow });
  }
  return filas;
}

function filaDe(json: unknown, id: string): FilaTarea | null {
  return filasDe(json)?.find((fila) => fila.id === id) ?? null;
}

function leerTareaAdmin(valor: unknown): TareaAdmin | null {
  if (!valor || typeof valor !== "object") return null;
  const datos = valor as Record<string, unknown>;
  const id = texto(datos.id);
  const titulo = texto(datos.titulo);
  const tipo = tipoDe(datos.tipo);
  if (!id || !titulo || !tipo) return null;
  const pago = camposPago(datos);
  const nota = notaDeTexto(datos.nota);
  const etiqueta = veredictoDe(datos.veredicto);
  return {
    id,
    titulo,
    tipo,
    monto: texto(datos.monto) ?? "0",
    tope: texto(datos.tope),
    condicion: texto(datos.condicion) ?? "",
    miembroId: texto(datos.miembroId) ?? "",
    miembro: texto(datos.miembro) ?? "Unassigned",
    estado: estadoDe(datos.estado),
    veredicto: nota !== null ? etiquetaDesdeNota(nota) : etiqueta,
    nota,
    frase: texto(datos.frase),
    origen: origenDe(datos.origen),
    codigo: texto(datos.codigo),
    montoRevisado: texto(datos.montoRevisado),
    montoConfirmado: texto(datos.montoConfirmado),
    fecha: texto(datos.fecha),
    hashPago: pago.hashPago,
    credencialUrl: pago.credencialUrl,
    tipoArchivo: texto(datos.tipoArchivo),
    motivoCopia: texto(datos.motivoCopia),
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

function origenDe(valor: unknown): TareaAdmin["origen"] {
  if (valor === "scout" || valor === "guion" || valor === "stub" || valor === "error") return valor;
  return null;
}

export async function reintentarRevision(tareaId: string, opciones: OpcionesRemoto = {}): Promise<DetalleRevision | null> {
  const fetchImpl = opciones.fetch ?? fetch;
  const id = tareaId.trim();
  if (!id) return null;
  try {
    const revision = await fetchImpl(`/api/revision/${encodeURIComponent(id)}`, {
      method: "POST",
      cache: "no-store",
      signal: AbortSignal.timeout(25000),
    });
    if (!revision.ok) return null;
    return detalleDe(await revision.json());
  } catch {
    return null;
  }
}

function saldoPositivo(valor: unknown): boolean | null {
  const numero = typeof valor === "number" ? valor : typeof valor === "string" && valor.trim() ? Number(valor) : Number.NaN;
  if (!Number.isFinite(numero)) return null;
  return numero > 0;
}

function texto(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  const limpio = valor.trim();
  return limpio ? limpio : null;
}

export async function confirmarMonto(
  tareaId: string,
  monto: string,
  opciones: OpcionesRemoto = {},
): Promise<{ montoConfirmado: string } | { aviso: string }> {
  const id = tareaId.trim();
  if (!id) return { aviso: "The task is missing." };
  try {
    const respuesta = await (opciones.fetch ?? fetch)(`/api/revision/${encodeURIComponent(id)}/monto`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ monto }),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    const cuerpo = (await respuesta.json().catch(() => null)) as { aviso?: unknown; montoConfirmado?: unknown } | null;
    const aviso = typeof cuerpo?.aviso === "string" ? cuerpo.aviso : null;
    const guardado = typeof cuerpo?.montoConfirmado === "string" ? cuerpo.montoConfirmado : null;
    if (!respuesta.ok || !guardado) return { aviso: aviso ?? "The amount could not be confirmed." };
    return { montoConfirmado: guardado };
  } catch {
    return { aviso: "The amount could not be confirmed." };
  }
}

function pedir(fetchImpl: typeof fetch, url: string): Promise<Response> {
  return fetchImpl(url, { method: "GET", cache: "no-store", signal: AbortSignal.timeout(8000) });
}
