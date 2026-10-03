import type { Fotos } from "@/lib/blob/fotos";
import type { Almacen } from "@/lib/db/almacen";
import { asegurarSemilla, esBlobEjemplo } from "@/lib/db/semilla";
import { enlacePago } from "@/lib/admin/vista";
import { contextoDesdeEntorno, revisar } from "@/lib/revision/revisar";
import { guardarRevision } from "./evidencias";
import { conciliarPagoPendiente, fondeoDeTarea } from "./firma";
import { tareaAdmin } from "./informe";
import { baseNoLista, json } from "./json";

const ESPERA_REVISION_MS = 30_000;
const revisionEnCurso = new Set<string>();
const revisionEsperaHasta = new Map<string, number>();

export function reservarRevision(tareaId: string, ahora = Date.now()): boolean {
  if (revisionEnCurso.has(tareaId)) return false;
  if ((revisionEsperaHasta.get(tareaId) ?? 0) > ahora) return false;
  revisionEnCurso.add(tareaId);
  return true;
}

export function liberarRevision(tareaId: string, ahora = Date.now()): void {
  revisionEnCurso.delete(tareaId);
  revisionEsperaHasta.set(tareaId, ahora + ESPERA_REVISION_MS);
}

export function reiniciarCandadosRevision(): void {
  revisionEnCurso.clear();
  revisionEsperaHasta.clear();
}

export async function leerRevisionHttp(
  almacen: Almacen,
  fotos: Fotos | null,
  tareaId: string,
  forzar = false,
  wallet = "",
): Promise<Response> {
  try {
    await asegurarSemilla(almacen);
    const tarea = await almacen.leerTarea(tareaId);
    if (!tarea) return json({ aviso: "We couldn't find that task." }, 404);
    if (forzar && (tarea.estado === "pagado" || Boolean(tarea.contratoEscrow?.trim()))) {
      return json({ aviso: "This task can no longer be reviewed." }, 409);
    }
    const evidencia = await almacen.ultimaEvidencia(tareaId);
    const blobReal = evidencia !== null && !esBlobEjemplo(evidencia.blobId);
    const veredicto = evidencia ? await almacen.veredictoDe(evidencia.id) : null;
    const puedeForzar = !veredicto || veredicto.origen === "error";
    if (forzar && evidencia && blobReal && fotos && puedeForzar) {
      let reservado = false;
      if (forzar) {
        if (!reservarRevision(tareaId)) return json({ aviso: "Wait a moment before reviewing again." }, 429);
        reservado = true;
      }
      try {
        const foto = await fotos.leer(evidencia.blobId);
        const resultado = await revisar(tarea, foto, contextoDesdeEntorno());
        await guardarRevision(almacen, evidencia.id, tarea.id, resultado);
      } finally {
        if (reservado) liberarRevision(tareaId);
      }
    }
    let actual = (await almacen.leerTarea(tareaId)) ?? tarea;
    if (await conciliarPagoPendiente(almacen, actual).catch(() => false)) {
      actual = (await almacen.leerTarea(tareaId)) ?? actual;
    }
    const vista = await tareaAdmin(almacen, actual);
    const hashFondeo = await fondeoDeTarea(almacen, actual).catch(() => null);
    return json({
      tarea: vista,
      foto: evidencia ? `/api/evidencias/${evidencia.id}/foto` : null,
      enlacePago: enlacePago(vista.hashPago),
      contratoEscrow: actual.contratoEscrow,
      hashFondeo,
      walletCobro: actual.walletCobro,
      wallet,
    });
  } catch {
    return baseNoLista();
  }
}
