import { esTiempo, FalloRevision, type CodigoFalloRevision } from "./fallo";

export const INTENTOS_REVISION = 3;
export const PAUSAS_REINTENTO_MS = [200, 500] as const;
export const PRESUPUESTO_REVISION_MS = 20_000;
export const TOPE_GROQ_MS = 12_000;
export const TOPE_LAYA_MS = 8_000;

const MIN_INTENTO_MS = 700;

export type OpcionesReintento = {
  deadline: number;
  topeIntentoMs: number;
  intentos?: number;
  pausas?: readonly number[];
  ahora?: () => number;
  esperar?: (ms: number) => Promise<void>;
};

export function esReintentable(error: unknown): boolean {
  if (error instanceof FalloRevision) return codigoReintentable(error.code, error.status);
  if (esTiempo(error) || error instanceof TypeError) return true;
  return false;
}

function codigoReintentable(codigo: CodigoFalloRevision, status: number | null): boolean {
  if (codigo === "tiempo") return true;
  if (codigo !== "proveedor") return false;
  if (status === null || status === 408) return true;
  return status >= 500 && status <= 599;
}

export function esperaReintento(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  if (process.env.NODE_TEST_CONTEXT?.trim()) return Promise.resolve();
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function conReintentos<T>(trabajo: (signal: AbortSignal) => Promise<T>, opciones: OpcionesReintento): Promise<T> {
  const intentos = opciones.intentos ?? INTENTOS_REVISION;
  const pausas = opciones.pausas ?? PAUSAS_REINTENTO_MS;
  const ahora = opciones.ahora ?? Date.now;
  const esperar = opciones.esperar ?? esperaReintento;
  let ultimo: unknown;
  for (let i = 0; i < intentos; i += 1) {
    if (i > 0) {
      const pausa = pausas[Math.min(i - 1, pausas.length - 1)] ?? 0;
      if (opciones.deadline - ahora() < pausa + MIN_INTENTO_MS) break;
      await esperar(pausa);
    }
    const tope = Math.min(opciones.topeIntentoMs, opciones.deadline - ahora());
    if (tope < MIN_INTENTO_MS) break;
    try {
      return await trabajo(AbortSignal.timeout(tope));
    } catch (error) {
      ultimo = error;
      if (!esReintentable(error)) throw error;
    }
  }
  if (ultimo instanceof Error) throw ultimo;
  throw new FalloRevision("tiempo", { fuente: "revision", providerMessage: "presupuesto" });
}
