import type { Almacen } from "@/lib/db/almacen";
import { AVISO_MONTO_TARDE, validarMontoConfirmado } from "@/lib/escrow/monto";
import { json } from "./json";

export async function confirmarMontoHttp(almacen: Almacen, tareaId: string, body: unknown): Promise<Response> {
  const tarea = await almacen.leerTarea(tareaId);
  if (!tarea) return json({ aviso: "We couldn't find that task." }, 404);
  if (tarea.tipo !== "reembolso") return json({ aviso: "This task has a fixed amount." }, 400);
  if (tarea.estado === "pagado" || tarea.contratoEscrow?.trim()) return json({ aviso: AVISO_MONTO_TARDE }, 409);
  const evidencia = await almacen.ultimaEvidencia(tarea.id);
  if (!evidencia) return json({ aviso: "Submit a receipt before confirming the amount." }, 400);
  const leido = validarMontoConfirmado(montoDe(body), tarea.tope, tarea.monto);
  if ("aviso" in leido) return json({ aviso: leido.aviso }, 400);
  await almacen.actualizarEvidencia(evidencia.id, { montoConfirmado: leido.monto });
  return json({ montoConfirmado: leido.monto });
}

function montoDe(body: unknown): unknown {
  if (!body || typeof body !== "object") return null;
  return (body as { monto?: unknown }).monto;
}
