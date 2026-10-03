import type { Espera } from "@/lib/escrow/indexador";

const dormir: Espera = (ms) => new Promise((resolver) => setTimeout(resolver, ms));

// The Trustless Work read model is eventually consistent. Back off so an open review screen stays well under the read limit.
export const PAUSAS_CONSULTA_MS: readonly number[] = [3_000, 5_000, 8_000, 13_000, 20_000];

export type EstadoConsulta = "leyendo" | "agotada" | null;

export type OpcionesConsulta<T> = {
  leer: () => Promise<T>;
  listo: (valor: T) => boolean;
  pausas?: readonly number[];
  esperar?: Espera;
  // False skips the first immediate read, for callers that just read once themselves.
  inmediata?: boolean;
  vivo?: () => boolean;
};

export type ResultadoConsulta<T> = { listo: true; valor: T } | { listo: false };

// Reads until `listo` holds. A read that throws counts as not ready. Stops early when `vivo` turns false.
export async function consultarHasta<T>(opciones: OpcionesConsulta<T>): Promise<ResultadoConsulta<T>> {
  const pausas = opciones.pausas ?? PAUSAS_CONSULTA_MS;
  const esperar = opciones.esperar ?? dormir;
  const vivo = opciones.vivo ?? (() => true);
  const inmediata = opciones.inmediata ?? true;
  const esperas = inmediata ? [0, ...pausas] : [...pausas];
  for (const pausa of esperas) {
    if (pausa > 0) await esperar(pausa);
    if (!vivo()) return { listo: false };
    try {
      const valor = await opciones.leer();
      if (!vivo()) return { listo: false };
      if (opciones.listo(valor)) return { listo: true, valor };
    } catch {
      continue;
    }
  }
  return { listo: false };
}
