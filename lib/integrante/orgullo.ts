import { textoMonto } from "@/lib/admin/vista";
import { textoDesdeUnidades } from "@/lib/escrow/recibido";
import type { Idioma } from "@/lib/ui/idioma";

/** Meses del panel. Costa Rica no cambia de hora, y es la zona que ya usa el formato de fechas. */
export const ZONA_MESES = "America/Costa_Rica";

const VENTANA_MESES = 6;
const RECIENTES = 5;

/**
 * Texto claramente ficticio. No es una cuenta de la red.
 */
export const DIRECCION_MUESTRA = "EJEMPLO-NO-ES-UNA-CUENTA";
export const SALDO_MUESTRA = "48.20";

export type TareaCuenta = {
  id: string;
  titulo: string;
  proyectoId: string;
  proyecto: string;
  pagada: boolean;
  monto: string;
  pagadoEn: string | null;
};

export type MesOrgullo = {
  clave: string;
  etiqueta: string;
  etiquetaLarga: string;
  total: string;
};

export type TareaReciente = {
  id: string;
  titulo: string;
  proyecto: string;
  monto: string;
  pagadoEn: string | null;
};

export type InsigniaOrgullo = {
  id: string;
  titulo: string;
  detalle: string;
  obtenida: boolean;
};

export type ConteosOrgullo = {
  tareas: number;
  proyectos: number;
  racha: number;
};

export type Orgullo = {
  vacio: boolean;
  esteMes: string;
  mesPasado: string;
  total: string;
  meses: MesOrgullo[];
  tareasCompletadas: number;
  proyectosCompletados: number;
  racha: number;
  mejorMes: { clave: string; etiqueta: string; total: string } | null;
  recientes: TareaReciente[];
  insignias: InsigniaOrgullo[];
  /** Pagos con monto y sin fecha guardada. Entran al total, no a un mes. */
  sinFecha: number;
};

export type EstadoSaldo = "ok" | "ausente" | "error" | "sin-wallet";

export type VistaCuenta = {
  demo: boolean;
  muestra: boolean;
  email: string;
  wallet: string | null;
  walletMuestra: boolean;
  saldo: string | null;
  saldoEstado: EstadoSaldo;
  orgullo: Orgullo;
};

const REGLAS: {
  id: string;
  titulo: string;
  detalle: string;
  obtenida: (conteo: ConteosOrgullo) => boolean;
}[] = [
  {
    id: "primera-tarea",
    titulo: "First task",
    detalle: "A paid task",
    obtenida: (conteo) => conteo.tareas >= 1,
  },
  {
    id: "cinco-tareas",
    titulo: "Five tasks",
    detalle: "Five paid tasks",
    obtenida: (conteo) => conteo.tareas >= 5,
  },
  {
    id: "diez-tareas",
    titulo: "Ten tasks",
    detalle: "Ten paid tasks",
    obtenida: (conteo) => conteo.tareas >= 10,
  },
  {
    id: "primer-proyecto",
    titulo: "First project",
    detalle: "Every task in a project paid",
    obtenida: (conteo) => conteo.proyectos >= 1,
  },
  {
    id: "tres-proyectos",
    titulo: "Three projects",
    detalle: "Three projects finished",
    obtenida: (conteo) => conteo.proyectos >= 3,
  },
  {
    id: "racha-tres",
    titulo: "Three-month streak",
    detalle: "Earnings three months in a row",
    obtenida: (conteo) => conteo.racha >= 3,
  },
];

export function insigniasDe(conteo: ConteosOrgullo): InsigniaOrgullo[] {
  return REGLAS.map((regla) => ({
    id: regla.id,
    titulo: regla.titulo,
    detalle: regla.detalle,
    obtenida: regla.obtenida(conteo),
  }));
}

export function claveDeFecha(fecha: Date, zona: string = ZONA_MESES): string | null {
  if (Number.isNaN(fecha.getTime())) return null;
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: zona,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(fecha);
  const anio = partes.find((parte) => parte.type === "year")?.value;
  const mes = partes.find((parte) => parte.type === "month")?.value;
  if (!anio || !mes) return null;
  return `${anio}-${mes}`;
}

export function claveMesDe(iso: string | null, zona: string = ZONA_MESES): string | null {
  if (!iso) return null;
  return claveDeFecha(new Date(iso), zona);
}

export function desplazarMes(clave: string, delta: number): string {
  const [anio, mes] = clave.split("-").map(Number);
  const indice = anio * 12 + (mes - 1) + delta;
  const siguienteAnio = Math.floor(indice / 12);
  const siguienteMes = (indice % 12) + 1;
  return `${siguienteAnio}-${String(siguienteMes).padStart(2, "0")}`;
}

export function armarOrgullo(
  tareas: TareaCuenta[],
  ahora: Date = new Date(),
  zona: string = ZONA_MESES,
  idioma: Idioma = "en",
): Orgullo {
  const pagadas = tareas.filter((tarea) => tarea.pagada);
  const porMes = new Map<string, bigint>();
  let totalCentavos = 0n;
  let sinFecha = 0;

  for (const tarea of pagadas) {
    const cifra = unidadesDeMonto(tarea.monto);
    if (cifra === null || cifra <= 0n) continue;
    // Cada tarea ya se muestra redondeada al centavo. El total es la suma de
    // esos centavos, así que sumar las tareas da la misma cifra.
    const cents = centavosDeUnidades(cifra);
    totalCentavos += cents;
    const clave = claveMesDe(tarea.pagadoEn, zona);
    if (!clave) {
      sinFecha += 1;
      continue;
    }
    porMes.set(clave, (porMes.get(clave) ?? 0n) + cents);
  }

  const actual = claveDeFecha(ahora, zona);
  const hayMeses = [...porMes.values()].some((cifra) => cifra > 0n);
  const meses = actual && hayMeses ? ventana(actual, porMes, idioma) : [];
  const conteo: ConteosOrgullo = {
    tareas: pagadas.length,
    proyectos: proyectosCompletados(tareas),
    racha: actual ? rachaHasta(actual, porMes) : 0,
  };

  return {
    vacio: pagadas.length === 0,
    esteMes: textoDeCentavos(actual ? (porMes.get(actual) ?? 0n) : 0n),
    mesPasado: textoDeCentavos(actual ? (porMes.get(desplazarMes(actual, -1)) ?? 0n) : 0n),
    total: textoDeCentavos(totalCentavos),
    meses,
    tareasCompletadas: conteo.tareas,
    proyectosCompletados: conteo.proyectos,
    racha: conteo.racha,
    mejorMes: mejor(porMes),
    recientes: recientes(pagadas),
    insignias: insigniasDe(conteo),
    sinFecha,
  };
}

/** Actividad de ejemplo para el modo demo. Las fechas se mueven con el mes actual para que el gráfico no se vea viejo. */
export function tareasMuestra(ahora: Date = new Date()): TareaCuenta[] {
  const en = (delta: number) => isoEnMes(ahora, delta);
  return [
    tareaMuestra("muestra-booth", "Set up the booth", "muestra-zeek", "ZEEK", true, "20", en(0)),
    tareaMuestra("muestra-meal", "Team meal", "muestra-zeek", "ZEEK", true, "12.40", en(0)),
    tareaMuestra("muestra-checkin", "Check-in list", "muestra-zeek", "ZEEK", true, "20", en(-1)),
    tareaMuestra("muestra-welcome", "Welcome table", "muestra-harbor", "Harbor night", true, "20", en(-1)),
    tareaMuestra("muestra-photo", "Photo wall", "muestra-harbor", "Harbor night", true, "20", en(-2)),
    tareaMuestra("muestra-banners", "Booth banners", "muestra-studio", "Studio week", true, "20", en(-3)),
    tareaMuestra("muestra-notes", "Closing notes", "muestra-studio", "Studio week", false, "20", null),
  ];
}

function tareaMuestra(
  id: string,
  titulo: string,
  proyectoId: string,
  proyecto: string,
  pagada: boolean,
  monto: string,
  pagadoEn: string | null,
): TareaCuenta {
  return { id, titulo, proyectoId, proyecto, pagada, monto, pagadoEn };
}

function isoEnMes(ahora: Date, delta: number): string {
  const actual = claveDeFecha(ahora) ?? "2026-10";
  const destino = desplazarMes(actual, delta);
  if (delta === 0 && claveDeFecha(ahora) === destino) return new Date(ahora.getTime()).toISOString();
  const [anio, mes] = destino.split("-").map(Number);
  return new Date(Date.UTC(anio, mes - 1, 15, 18, 0, 0)).toISOString();
}

function ventana(actual: string, porMes: Map<string, bigint>, idioma: Idioma = "en"): MesOrgullo[] {
  const inicio = desplazarMes(actual, -(VENTANA_MESES - 1));
  const meses: MesOrgullo[] = [];
  for (let indice = 0; indice < VENTANA_MESES; indice += 1) {
    const clave = desplazarMes(inicio, indice);
    meses.push({
      clave,
      etiqueta: etiqueta(clave, "short", idioma),
      etiquetaLarga: etiqueta(clave, "long", idioma),
      total: textoDeCentavos(porMes.get(clave) ?? 0n),
    });
  }
  return meses;
}

function etiqueta(clave: string, mes: "short" | "long", idioma: Idioma = "en"): string {
  const [anio, numero] = clave.split("-").map(Number);
  return new Intl.DateTimeFormat(idioma === "es" ? "es-CR" : "en-US", {
    month: mes,
    year: mes === "long" ? "numeric" : undefined,
    timeZone: "UTC",
  }).format(new Date(Date.UTC(anio, numero - 1, 1)));
}

function rachaHasta(actual: string, porMes: Map<string, bigint>): number {
  const previo = desplazarMes(actual, -1);
  let cursor: string | null = positivo(porMes, actual) ? actual : positivo(porMes, previo) ? previo : null;
  let racha = 0;
  while (cursor && positivo(porMes, cursor)) {
    racha += 1;
    cursor = desplazarMes(cursor, -1);
  }
  return racha;
}

function positivo(porMes: Map<string, bigint>, clave: string): boolean {
  return (porMes.get(clave) ?? 0n) > 0n;
}

function mejor(porMes: Map<string, bigint>): Orgullo["mejorMes"] {
  let elegido: { clave: string; cifra: bigint } | null = null;
  for (const [clave, cifra] of porMes) {
    if (cifra <= 0n) continue;
    if (!elegido || cifra > elegido.cifra || (cifra === elegido.cifra && clave > elegido.clave)) {
      elegido = { clave, cifra };
    }
  }
  if (!elegido) return null;
  return { clave: elegido.clave, etiqueta: etiqueta(elegido.clave, "long"), total: textoDeCentavos(elegido.cifra) };
}

function recientes(pagadas: TareaCuenta[]): TareaReciente[] {
  return [...pagadas]
    .sort((a, b) => {
      if (a.pagadoEn && b.pagadoEn && a.pagadoEn !== b.pagadoEn) return a.pagadoEn < b.pagadoEn ? 1 : -1;
      if (a.pagadoEn && !b.pagadoEn) return -1;
      if (!a.pagadoEn && b.pagadoEn) return 1;
      return a.titulo.localeCompare(b.titulo);
    })
    .slice(0, RECIENTES)
    .map((tarea) => {
      const unidades = unidadesDeMonto(tarea.monto);
      return {
        id: tarea.id,
        titulo: tarea.titulo,
        proyecto: tarea.proyecto,
        monto: unidades !== null && unidades > 0n ? textoCifra(unidades) : "",
        pagadoEn: tarea.pagadoEn,
      };
    });
}

const ESCALA_MONTO = 10_000_000n;
const UNIDAD_CENTAVO = 100_000n;

/** Up to 7 decimals, so a net such as 1.994 is not dropped the way a 2-decimal parser would. */
function unidadesDeMonto(valor: string): bigint | null {
  const limpio = valor.trim();
  if (!/^\d+(\.\d{1,7})?$/.test(limpio)) return null;
  const [entera, fraccion = ""] = limpio.split(".");
  return BigInt(entera) * ESCALA_MONTO + BigInt(fraccion.padEnd(7, "0"));
}

function centavosDeUnidades(unidades: bigint): bigint {
  return (unidades + UNIDAD_CENTAVO / 2n) / UNIDAD_CENTAVO;
}

function textoDeCentavos(centavos: bigint): string {
  if (centavos <= 0n) return "0";
  return textoMonto(Number(centavos));
}

function textoCifra(unidades: bigint): string {
  if (unidades <= 0n) return "0";
  if (unidades % UNIDAD_CENTAVO === 0n) return textoMonto(Number(unidades / UNIDAD_CENTAVO));
  return textoDesdeUnidades(unidades);
}

function proyectosCompletados(tareas: TareaCuenta[]): number {
  const grupos = new Map<string, boolean[]>();
  for (const tarea of tareas) {
    const flags = grupos.get(tarea.proyectoId) ?? [];
    flags.push(tarea.pagada);
    grupos.set(tarea.proyectoId, flags);
  }
  let total = 0;
  for (const flags of grupos.values()) {
    if (flags.length > 0 && flags.every(Boolean)) total += 1;
  }
  return total;
}
