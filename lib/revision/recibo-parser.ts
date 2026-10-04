export type MonedaRecibo = "CRC" | "USD";

export type MontoRecibo = {
  /** Integer cents. 15.179,99 is 1517999, not 1518. */
  centavos: number;
  /** Two-decimal string, such as "15179.99". */
  texto: string;
  cantidad: number;
  moneda: MonedaRecibo | null;
};

type Estilo = "crc" | "us" | "coma" | "punto" | "entero";

const MESES: Record<string, number> = {
  enero: 1,
  febrero: 2,
  marzo: 3,
  abril: 4,
  mayo: 5,
  junio: 6,
  julio: 7,
  agosto: 8,
  septiembre: 9,
  setiembre: 9,
  octubre: 10,
  noviembre: 11,
  diciembre: 12,
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
};

/**
 * Reads one printed receipt total. This is not normalizarMonto and must not feed the escrow.
 * Dot-as-thousands and comma-as-decimal (15.179,99 or ₡15.179,99) is CRC.
 * Comma-as-thousands and dot-as-decimal (15,179.99) keeps the number and does not assume USDC.
 */
export function leerMontoRecibo(valor: string): MontoRecibo | null {
  const original = valor.trim();
  if (!original) return null;
  const nucleo = original.replace(/[\s\u00a0\u202f]/g, "").replace(/[^\d.,]/g, "");
  const partes = partir(nucleo);
  if (!partes) return null;
  return {
    centavos: partes.centavos,
    texto: partes.texto,
    cantidad: Number(partes.texto),
    moneda: monedaDe(pistaExplicita(original), partes.estilo),
  };
}

/** DD/MM/YYYY or YYYY-MM-DD. 02/10/2026 is 2026-10-02. */
export function leerFechaRecibo(valor: string): string | null {
  const texto = valor.trim();
  if (!texto) return null;
  const iso = /\b(\d{4})-(\d{2})-(\d{2})\b/.exec(texto);
  if (iso) {
    const anio = Number(iso[1]);
    const mes = Number(iso[2]);
    const dia = Number(iso[3]);
    if (fechaValida(anio, mes, dia)) return formatear(anio, mes, dia);
  }
  const dmy = /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/.exec(texto);
  if (dmy) {
    const dia = Number(dmy[1]);
    const mes = Number(dmy[2]);
    const anio = Number(dmy[3]);
    if (fechaValida(anio, mes, dia)) return formatear(anio, mes, dia);
  }
  return null;
}

export type ComparacionFecha = "coincide" | "no_coincide" | "sin_fecha_pedida" | "sin_fecha_recibo";

/**
 * Without a year in the request, only the day and the month are compared.
 * "2 de octubre" matches 2026-10-02 and does not match 2026-10-03.
 */
export function compararFechaPedido(pedido: string, fechaIso: string | null): ComparacionFecha {
  const recibo = fechaIso ? leerFechaRecibo(fechaIso) : null;
  if (!recibo) return "sin_fecha_recibo";
  const pedida = fechaPedida(pedido);
  if (!pedida) return "sin_fecha_pedida";
  const [anio, mes, dia] = recibo.split("-").map(Number);
  if (pedida.dia !== dia || pedida.mes !== mes) return "no_coincide";
  if (pedida.anio !== null && pedida.anio !== anio) return "no_coincide";
  return "coincide";
}

function pistaExplicita(texto: string): "CRC" | "USD" | "ambas" | null {
  const crc = /₡/.test(texto) || /\bCRC\b/i.test(texto) || /col[oó]nes/i.test(texto);
  const usd = /\$/.test(texto) || /\bUSD\b/i.test(texto) || /\bdollars?\b/i.test(texto);
  if (crc && usd) return "ambas";
  if (crc) return "CRC";
  if (usd) return "USD";
  return null;
}

function monedaDe(pista: "CRC" | "USD" | "ambas" | null, estilo: Estilo): MonedaRecibo | null {
  if (estilo === "crc" || estilo === "coma") return "CRC";
  if (pista === "CRC") return "CRC";
  if (pista === "USD") return "USD";
  return null;
}

function partir(nucleo: string): { centavos: number; texto: string; estilo: Estilo } | null {
  const crcDec = /^(\d{1,3}(?:\.\d{3})+),(\d{1,2})$/.exec(nucleo);
  if (crcDec) return empaquetar(crcDec[1].replaceAll(".", ""), crcDec[2], "crc");
  const crcEnt = /^(\d{1,3}(?:\.\d{3})+)$/.exec(nucleo);
  if (crcEnt) return empaquetar(crcEnt[1].replaceAll(".", ""), "", "crc");
  const usDec = /^(\d{1,3}(?:,\d{3})+)\.(\d{1,2})$/.exec(nucleo);
  if (usDec) return empaquetar(usDec[1].replaceAll(",", ""), usDec[2], "us");
  const usEnt = /^(\d{1,3}(?:,\d{3})+)$/.exec(nucleo);
  if (usEnt) return empaquetar(usEnt[1].replaceAll(",", ""), "", "us");
  const coma = /^(\d+),(\d{1,2})$/.exec(nucleo);
  if (coma) return empaquetar(coma[1], coma[2], "coma");
  const punto = /^(\d+)\.(\d{1,2})$/.exec(nucleo);
  if (punto) return empaquetar(punto[1], punto[2], "punto");
  const entero = /^(\d+)$/.exec(nucleo);
  if (entero) return empaquetar(entero[1], "", "entero");
  return null;
}

function empaquetar(entero: string, fraccion: string, estilo: Estilo): { centavos: number; texto: string; estilo: Estilo } | null {
  if (!/^\d+$/.test(entero) || (entero.length > 1 && entero.startsWith("0"))) return null;
  const frac = (fraccion + "00").slice(0, 2);
  const centavos = Number(entero) * 100 + Number(frac);
  if (!Number.isSafeInteger(centavos)) return null;
  return { centavos, texto: `${entero}.${frac}`, estilo };
}

type FechaPedida = { index: number; dia: number; mes: number; anio: number | null };

function fechaPedida(pedido: string): FechaPedida | null {
  const texto = sinAcento(pedido);
  const lista: FechaPedida[] = [];
  const sumar = (index: number, dia: number, mes: number, anio: number | null) => {
    const anioValido = anio ?? 2024;
    if (!fechaValida(anioValido, mes, dia)) return;
    lista.push({ index, dia, mes, anio });
  };

  for (const match of texto.matchAll(/(\d{1,2})\s+de\s+([a-z]+)(?:\s+de\s+(\d{4}))?/g)) {
    const mes = mesDe(match[2] ?? "");
    if (!mes || match.index === undefined) continue;
    sumar(match.index, Number(match[1]), mes, match[3] ? Number(match[3]) : null);
  }
  for (const match of texto.matchAll(/\b([a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,)?(?:\s+(\d{4}))?/g)) {
    const mes = mesDe(match[1] ?? "");
    if (!mes || match.index === undefined) continue;
    sumar(match.index, Number(match[2]), mes, match[3] ? Number(match[3]) : null);
  }
  for (const match of texto.matchAll(/\b(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?([a-z]+)(?:\s+(\d{4}))?/g)) {
    const mes = mesDe(match[2] ?? "");
    if (!mes || match.index === undefined) continue;
    sumar(match.index, Number(match[1]), mes, match[3] ? Number(match[3]) : null);
  }
  for (const match of texto.matchAll(/\b(\d{4})-(\d{2})-(\d{2})\b/g)) {
    if (match.index === undefined) continue;
    sumar(match.index, Number(match[3]), Number(match[2]), Number(match[1]));
  }
  for (const match of texto.matchAll(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g)) {
    if (match.index === undefined) continue;
    sumar(match.index, Number(match[1]), Number(match[2]), Number(match[3]));
  }

  lista.sort((a, b) => a.index - b.index || Number(b.anio !== null) - Number(a.anio !== null));
  return lista[0] ?? null;
}

function mesDe(palabra: string): number | null {
  return MESES[palabra] ?? null;
}

function sinAcento(valor: string): string {
  return valor.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

function fechaValida(anio: number, mes: number, dia: number): boolean {
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return false;
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  return fecha.getUTCFullYear() === anio && fecha.getUTCMonth() === mes - 1 && fecha.getUTCDate() === dia;
}

function formatear(anio: number, mes: number, dia: number): string {
  return `${String(anio).padStart(4, "0")}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}
