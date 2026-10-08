import type { ContextoRevision } from "@/lib/revision/revisar";
import { PRESUPUESTO_REVISION_MS } from "@/lib/revision/reintento";

/** Must equal `maxDuration` in `app/api/evidencias/route.ts`, in milliseconds. */
export const MAX_DURACION_SUBIDA_MS = 60_000;
/** Kept free at the end of the function for the verdict write (a few Neon round trips). */
export const MARGEN_GUARDADO_MS = 6_000;
/** Between the review's own deadline and the hard stop, so the review usually ends on its own. */
export const HOLGURA_TOPE_MS = 2_000;
/** How long the upload response waits for Mile before the rest runs in `after()`. */
export const PLAZO_RESPUESTA_MS = 2_800;

export type PlanRevision = {
  /** Budget handed to `revisar()` for Groq, Gemini and Laya together. */
  presupuestoMs: number;
  /** Hard stop for the background review. An error verdict is stored when it fires. */
  topeFondoMs: number;
};

/**
 * Both clocks count from when the request arrived, not from when the response left, because
 * Vercel ends the function `maxDuration` after the request started, `after()` included.
 */
export function planRevision(inicio: number, ahora = Date.now()): PlanRevision {
  const restante = inicio + MAX_DURACION_SUBIDA_MS - MARGEN_GUARDADO_MS - ahora;
  const topeFondoMs = Math.max(0, restante);
  const presupuestoMs = Math.max(0, Math.min(PRESUPUESTO_REVISION_MS, topeFondoMs - HOLGURA_TOPE_MS));
  return { presupuestoMs, topeFondoMs };
}

/** The response stops waiting after `PLAZO_RESPUESTA_MS` whenever a slow provider can run. */
export function usaCorte(entorno: Pick<ContextoRevision, "claveGroq" | "claveGemini" | "layaUrl">, textual: boolean): boolean {
  if (textual) return Boolean(entorno.layaUrl);
  return Boolean(entorno.claveGroq || entorno.claveGemini?.trim());
}

export type Espera<T> = { estado: "listo"; valor: T } | { estado: "fallo"; error: unknown } | { estado: "en_curso" };

/** Unlike a plain race, a rejection inside the window is reported, not mistaken for "still running". */
export function esperarCorte<T>(trabajo: Promise<T>, ms: number | null): Promise<Espera<T>> {
  return new Promise((resolve) => {
    const timer = ms === null ? undefined : setTimeout(() => resolve({ estado: "en_curso" }), ms);
    trabajo.then(
      (valor) => {
        if (timer !== undefined) clearTimeout(timer);
        resolve({ estado: "listo", valor });
      },
      (error: unknown) => {
        if (timer !== undefined) clearTimeout(timer);
        resolve({ estado: "fallo", error });
      },
    );
  });
}
