import { normalizarMonto } from "@/lib/admin/vista";
import type { Almacen, CambioTarea } from "@/lib/db/almacen";
import type { TareaFila } from "@/lib/db/tipos";
import { AVISO_MONTO_INVALIDO } from "@/lib/escrow/monto";
import { esOrganizador } from "./invitaciones";
import { json } from "./json";
import { tareaPublica } from "./tareas";

export const AVISO_SOLO_ORGANIZADOR = "Only the organizer can edit tasks.";
export const AVISO_CON_FOTO = "This task already has a photo, so it can't be edited.";
export const AVISO_CON_PAGO = "This task already has a payment, so it can't be edited.";
export const AVISO_MONTO_BLOQUEADO = "The amount is already locked in the payment, so this task can't be edited.";

const TITULO_MAX = 120;
const CONDICION_MAX = 500;

export function avisoBloqueo(tarea: Pick<TareaFila, "estado" | "hashPago" | "contratoEscrow">, tieneEvidencia: boolean): string | null {
  if (tarea.estado === "pagado" || Boolean(tarea.hashPago?.trim())) return AVISO_CON_PAGO;
  if (tarea.contratoEscrow?.trim()) return AVISO_MONTO_BLOQUEADO;
  if (tieneEvidencia) return AVISO_CON_FOTO;
  return null;
}

export async function editarTareaHttp(request: Request, almacen: Almacen, tareaId: string, usuarioId: string): Promise<Response> {
  const tarea = await almacen.leerTarea(tareaId);
  if (!tarea) return json({ aviso: "We couldn't find that task." }, 404);
  if (!(await esOrganizador(almacen, tarea.proyectoId, usuarioId))) {
    return json({ aviso: AVISO_SOLO_ORGANIZADOR }, 403);
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ aviso: "The body is not JSON." }, 400);
  }
  const leido = leerCambio(body, tarea);
  if ("aviso" in leido) return json({ aviso: leido.aviso }, 400);
  if (leido.cambio.miembroId) {
    const miembros = await almacen.listarMiembros(tarea.proyectoId);
    const miembro = miembros.find((item) => item.usuarioId === leido.cambio.miembroId && item.estado === "active");
    if (!miembro) return json({ aviso: "That person is not in this event." }, 400);
  }
  const fresco = await almacen.leerTarea(tarea.id);
  if (!fresco) return json({ aviso: "We couldn't find that task." }, 404);
  const bloqueo = avisoBloqueo(fresco, Boolean(await almacen.ultimaEvidencia(fresco.id)));
  if (bloqueo) return json({ aviso: bloqueo }, 409);
  await almacen.actualizarTarea(fresco.id, leido.cambio);
  const guardada = await almacen.leerTarea(fresco.id);
  return json({ tarea: tareaPublica(guardada ?? { ...fresco, ...leido.cambio }) });
}

function leerCambio(body: unknown, tarea: TareaFila): { cambio: CambioTarea } | { aviso: string } {
  if (!body || typeof body !== "object") return { aviso: "The body is not JSON." };
  const crudo = body as Record<string, unknown>;
  const cambio: CambioTarea = {};
  if ("titulo" in crudo) {
    if (typeof crudo.titulo !== "string" || !crudo.titulo.trim()) return { aviso: "Enter a title." };
    const titulo = crudo.titulo.trim();
    if (titulo.length > TITULO_MAX) return { aviso: "Title is too long." };
    cambio.titulo = titulo;
  }
  if ("condicion" in crudo) {
    if (typeof crudo.condicion !== "string") return { aviso: "Enter what the photo must show." };
    const condicion = crudo.condicion.trim();
    if (condicion.length > CONDICION_MAX) return { aviso: "That note is too long." };
    cambio.condicion = condicion;
  }
  if ("monto" in crudo) {
    const monto = montoDe(crudo.monto);
    if (!monto) return { aviso: AVISO_MONTO_INVALIDO };
    cambio.monto = monto;
  }
  if ("tope" in crudo) {
    if (tarea.tipo !== "reembolso") return { aviso: "Work tasks don't have a cap." };
    const tope = montoDe(crudo.tope);
    if (!tope) return { aviso: AVISO_MONTO_INVALIDO };
    cambio.tope = tope;
  }
  if ("miembroId" in crudo) {
    if (typeof crudo.miembroId !== "string") return { aviso: "Choose a person in this event." };
    cambio.miembroId = crudo.miembroId.trim();
  }
  if (Object.keys(cambio).length === 0) return { aviso: "Nothing to save." };
  return { cambio };
}

function montoDe(valor: unknown): string | null {
  const texto = typeof valor === "number" && Number.isFinite(valor) ? String(valor) : typeof valor === "string" ? valor : "";
  return normalizarMonto(texto);
}
