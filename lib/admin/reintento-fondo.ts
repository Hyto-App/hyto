import { pedirReintentoRevision, type DetalleRevision } from "@/lib/admin/remoto";

export const MAX_INTENTOS_FONDO = 2;
export const DEMORA_PRIMER_FONDO_MS = 1_200;
export const PAUSA_FONDO_MS = 32_000;
export const ESPERA_SI_OCUPADO_MS = 1_000;

export type MemoriaFondo = {
  enCurso: Set<string>;
  intentos: Map<string, number>;
  ultimo: Map<string, number>;
  ancla: Map<string, number>;
};

const memoriaGlobal = crearMemoriaFondo();
const oyentes = new Set<() => void>();

export function crearMemoriaFondo(): MemoriaFondo {
  return {
    enCurso: new Set(),
    intentos: new Map(),
    ultimo: new Map(),
    ancla: new Map(),
  };
}

export function reiniciarReintentoFondo(): void {
  memoriaGlobal.enCurso.clear();
  memoriaGlobal.intentos.clear();
  memoriaGlobal.ultimo.clear();
  memoriaGlobal.ancla.clear();
}

export function reintentoFondoEnCurso(id: string, memoria: MemoriaFondo = memoriaGlobal): boolean {
  return memoria.enCurso.has(id.trim());
}

export function suscribirReintentoFondo(oyente: () => void): () => void {
  oyentes.add(oyente);
  return () => {
    oyentes.delete(oyente);
  };
}

function avisar(): void {
  for (const oyente of oyentes) oyente();
}

export function soltarAnclaFondo(id: string, memoria: MemoriaFondo = memoriaGlobal): void {
  const limpio = id.trim();
  if (!limpio || memoria.enCurso.has(limpio)) return;
  memoria.ancla.delete(limpio);
}

// The pause is longer than the 30s lock in lib/api/revision.ts, so the next run is not rejected.
export function esperaFondo(id: string, ahora: number, memoria: MemoriaFondo = memoriaGlobal): number | null {
  const limpio = id.trim();
  if (!limpio) return null;
  if (memoria.enCurso.has(limpio)) return ESPERA_SI_OCUPADO_MS;
  const hechos = memoria.intentos.get(limpio) ?? 0;
  if (hechos >= MAX_INTENTOS_FONDO) return null;
  if (hechos === 0) {
    let ancla = memoria.ancla.get(limpio);
    if (ancla === undefined) {
      memoria.ancla.set(limpio, ahora);
      ancla = ahora;
    }
    const porAncla = ancla + DEMORA_PRIMER_FONDO_MS;
    const porUltimo = memoria.ultimo.has(limpio) ? (memoria.ultimo.get(limpio) ?? 0) + PAUSA_FONDO_MS : porAncla;
    const listo = Math.max(porAncla, porUltimo);
    return listo <= ahora ? 0 : listo - ahora;
  }
  const listo = (memoria.ultimo.get(limpio) ?? ahora) + PAUSA_FONDO_MS;
  return listo <= ahora ? 0 : listo - ahora;
}

export async function correrReintento(
  id: string,
  modo: "manual" | "fondo",
  fetchImpl?: typeof fetch,
): Promise<{ ok: true; detalle: DetalleRevision } | { ok: false; aviso: string } | null> {
  const limpio = id.trim();
  if (!limpio) return { ok: false, aviso: "The review could not be retried." };
  if (memoriaGlobal.enCurso.has(limpio)) {
    return modo === "manual" ? { ok: false, aviso: "Wait 30 seconds before reviewing again." } : null;
  }
  if (modo === "fondo" && (memoriaGlobal.intentos.get(limpio) ?? 0) >= MAX_INTENTOS_FONDO) return null;
  memoriaGlobal.enCurso.add(limpio);
  avisar();
  try {
    const resultado = await pedirReintentoRevision(limpio, fetchImpl ? { fetch: fetchImpl } : {});
    memoriaGlobal.ultimo.set(limpio, Date.now());
    return resultado;
  } finally {
    if (modo === "fondo") memoriaGlobal.intentos.set(limpio, (memoriaGlobal.intentos.get(limpio) ?? 0) + 1);
    memoriaGlobal.enCurso.delete(limpio);
    avisar();
  }
}
