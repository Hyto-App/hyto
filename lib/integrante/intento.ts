import { esBlobEjemplo } from "@/lib/db/semilla";

/**
 * The attempt number written next to Mile. A clean send is 1, even when earlier
 * files from a previous demo are still in the table. Example placeholders never count.
 * A stored number, from the verdict, wins. An open ask for other evidence keeps the series.
 */
export function numeroIntentoVisible(entrada: {
  filas: readonly { id: string; blobId: string | null }[];
  actualId: string | null;
  reintento: boolean;
  guardado: number | null;
}): number {
  if (!entrada.actualId) return 0;
  if (entrada.guardado !== null && entrada.guardado >= 1) return entrada.guardado;
  const propias = entrada.filas.filter((fila) => !esBlobEjemplo(fila.blobId ?? ""));
  const indice = propias.findIndex((fila) => fila.id === entrada.actualId);
  if (indice < 0) return 0;
  if (!entrada.reintento) return 1;
  return indice + 1;
}

/** The display attempt saved on the verdict, when the review wrote one. */
export function intentoGuardado(mile: string | null | undefined): number | null {
  if (!mile) return null;
  try {
    const parsed = JSON.parse(mile) as { intento?: unknown };
    const n = parsed?.intento;
    if (typeof n === "number" && Number.isInteger(n) && n >= 1 && n <= 99) return n;
  } catch {
    return null;
  }
  return null;
}

/** Keeps Mile's review JSON and adds the attempt the volunteer sees. */
export function mileConIntento(mile: string | null, intento: number | undefined): string | null {
  if (intento === undefined) return mile;
  let base: Record<string, unknown> = {};
  if (mile) {
    try {
      const parsed = JSON.parse(mile) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) base = parsed as Record<string, unknown>;
    } catch {
      base = {};
    }
  }
  base.intento = intento;
  return JSON.stringify(base);
}
