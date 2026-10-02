import exifr from "exifr";

export const TOLERANCIA_FRESCURA_MS = 3 * 60 * 1000;

export type FrescuraOk = {
  ok: true;
  capturadaEn: string;
  frescura: "captura" | "exif";
};

export type FrescuraNo = {
  ok: false;
  aviso: string;
};

const AVISO_VIEJA = "This photo is not a fresh camera capture.";
const AVISO_SIN_HORA = "The capture time is missing.";

export async function fechaExif(bytes: Uint8Array): Promise<Date | null> {
  try {
    const valor = (await exifr.parse(bytes, { pick: ["DateTimeOriginal"] })) as { DateTimeOriginal?: unknown } | undefined;
    const fecha = valor?.DateTimeOriginal;
    if (fecha instanceof Date && !Number.isNaN(fecha.getTime())) return fecha;
    return null;
  } catch {
    return null;
  }
}

export function evaluarFrescura(entrada: {
  capturadaEn: string | null;
  emitidoEn: number;
  ahora: number;
  exif: Date | null;
  toleranciaMs?: number;
}): FrescuraOk | FrescuraNo {
  const tolerancia = entrada.toleranciaMs ?? TOLERANCIA_FRESCURA_MS;
  if (entrada.exif) {
    const marca = entrada.exif.getTime();
    if (!cerca(marca, entrada.ahora, tolerancia) || !cerca(marca, entrada.emitidoEn, tolerancia)) {
      return { ok: false, aviso: AVISO_VIEJA };
    }
    return { ok: true, capturadaEn: entrada.exif.toISOString(), frescura: "exif" };
  }
  const marca = fechaCliente(entrada.capturadaEn);
  if (marca === null) return { ok: false, aviso: AVISO_SIN_HORA };
  if (!cerca(marca, entrada.ahora, tolerancia) || !cerca(marca, entrada.emitidoEn, tolerancia)) {
    return { ok: false, aviso: AVISO_VIEJA };
  }
  return { ok: true, capturadaEn: new Date(marca).toISOString(), frescura: "captura" };
}

function fechaCliente(valor: string | null): number | null {
  if (!valor) return null;
  const marca = Date.parse(valor);
  if (!Number.isFinite(marca)) return null;
  return marca;
}

function cerca(marca: number, referencia: number, tolerancia: number): boolean {
  return Math.abs(marca - referencia) <= tolerancia;
}
