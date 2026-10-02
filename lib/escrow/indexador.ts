import { leerEscrow } from "./modulo";

export type Espera = (ms: number) => Promise<void>;

// The Trustless Work read model is eventually consistent. Keep the total under a serverless request budget.
export const PAUSAS_INDEXADOR_MS: readonly number[] = [1000, 2000, 3000];

export const dormir: Espera = (ms) => new Promise((resolver) => setTimeout(resolver, ms));

export type OpcionesSondeo = {
  esperar?: Espera;
  pausas?: readonly number[];
  leer?: (contrato: string) => Promise<Record<string, unknown>>;
};

// Reads the escrow until `listo` holds. Returns the last read that satisfied it, or null on timeout.
export async function sondearEscrow(
  contrato: string,
  listo: (escrow: Record<string, unknown>) => boolean,
  opciones: OpcionesSondeo = {},
): Promise<Record<string, unknown> | null> {
  const esperar = opciones.esperar ?? dormir;
  const pausas = opciones.pausas ?? PAUSAS_INDEXADOR_MS;
  const leer = opciones.leer ?? ((id: string) => leerEscrow(id));
  for (let intento = 0; intento <= pausas.length; intento += 1) {
    if (intento > 0) await esperar(pausas[intento - 1] ?? 0);
    try {
      const escrow = await leer(contrato);
      if (listo(escrow)) return escrow;
    } catch {
      continue;
    }
  }
  return null;
}

export function hitoLiberado(escrow: Record<string, unknown>): boolean {
  const hitos = Array.isArray(escrow.milestones) ? escrow.milestones : [];
  const hito = hitos[0];
  if (!hito || typeof hito !== "object") return false;
  const datos = hito as Record<string, unknown>;
  if (datos.released === true) return true;
  const flags = datos.flags && typeof datos.flags === "object" ? (datos.flags as Record<string, unknown>) : null;
  return flags?.released === true;
}

export function esHashPago(hash: string | null | undefined): hash is string {
  return typeof hash === "string" && /^[a-fA-F0-9]{64}$/.test(hash);
}
