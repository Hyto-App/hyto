import type { Almacen } from "@/lib/db/almacen";
import { esBlobEjemplo } from "@/lib/db/semilla";
import type { EvidenciaFila, TareaFila, VeredictoFila } from "@/lib/db/tipos";
import { desdeFallo } from "@/lib/revision/armar";
import { FalloRevision, registrarFallo } from "@/lib/revision/fallo";
import { guardarRevision } from "./evidencias";
import { MAX_DURACION_SUBIDA_MS } from "./plazo-revision";

/**
 * Past this age the upload function that owned the review has ended, so no verdict is coming.
 * It is the upload's whole `maxDuration`, counted from `creadaEn`, which is set while that request runs.
 */
export const ESPERA_VEREDICTO_MS = MAX_DURACION_SUBIDA_MS;

export function revisionVencida(
  tarea: Pick<TareaFila, "estado">,
  evidencia: Pick<EvidenciaFila, "blobId" | "creadaEn"> | null,
  veredicto: VeredictoFila | null,
  ahora = Date.now(),
): boolean {
  if (!evidencia || veredicto) return false;
  if (tarea.estado !== "en revisión" || esBlobEjemplo(evidencia.blobId)) return false;
  const enviada = Date.parse(evidencia.creadaEn);
  if (!Number.isFinite(enviada)) return false;
  return ahora - enviada > ESPERA_VEREDICTO_MS;
}

/**
 * The verdict row for a file. A real photo still "in review" after `ESPERA_VEREDICTO_MS` with no
 * row gets a timeout error row here, so screens stop saying Mile is still checking and the member can resend.
 * A failed write returns no row; the next read tries again.
 */
export async function veredictoAlLeer(
  almacen: Almacen,
  tarea: Pick<TareaFila, "id" | "estado">,
  evidencia: EvidenciaFila | null,
  ahora = Date.now(),
): Promise<VeredictoFila | null> {
  if (!evidencia) return null;
  const fila = await almacen.veredictoDe(evidencia.id);
  if (!revisionVencida(tarea, evidencia, fila, ahora)) return fila;
  const fallo = new FalloRevision("tiempo", { fuente: "revision", providerMessage: "sin veredicto al leer" });
  registrarFallo(fallo);
  try {
    await guardarRevision(almacen, evidencia.id, tarea.id, desdeFallo(fallo));
  } catch (error) {
    console.error("[revision]", error instanceof Error ? error.message : "could not store the timeout");
    return null;
  }
  return almacen.veredictoDe(evidencia.id);
}
