import type { Fotos } from "@/lib/blob/fotos";
import type { Almacen } from "@/lib/db/almacen";
import { asegurarSemilla, esBlobEjemplo } from "@/lib/db/semilla";
import { enlacePago } from "@/lib/admin/vista";
import { contextoDesdeEntorno, revisar } from "@/lib/revision/revisar";
import { guardarRevision } from "./evidencias";
import { tareaAdmin } from "./informe";
import { baseNoLista, json } from "./json";

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
    if (!tarea) return json({ aviso: "No encontramos esa tarea." }, 404);
    const evidencia = await almacen.ultimaEvidencia(tareaId);
    const blobReal = evidencia !== null && !esBlobEjemplo(evidencia.blobId);
    if (evidencia && blobReal && fotos && (forzar || !(await almacen.veredictoDe(evidencia.id)))) {
      const foto = await fotos.leer(evidencia.blobId);
      const resultado = await revisar(tarea, foto, contextoDesdeEntorno());
      await guardarRevision(almacen, evidencia.id, tarea.id, resultado);
    }
    const actual = (await almacen.leerTarea(tareaId)) ?? tarea;
    const vista = await tareaAdmin(almacen, actual);
    return json({
      tarea: vista,
      foto: evidencia && blobReal ? `/api/evidencias/${evidencia.id}/foto` : null,
      enlacePago: enlacePago(vista.hashPago),
      contratoEscrow: actual.contratoEscrow,
      walletCobro: actual.walletCobro,
      wallet,
    });
  } catch {
    return baseNoLista();
  }
}
