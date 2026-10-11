import { normalizarMonto, textoMonto } from "@/lib/admin/vista";
import { aUnidades, faltaParaCrear, RESERVA_USDC, type FaltaSaldo } from "@/lib/escrow/saldo";
import type { TipoTarea } from "@/lib/integrante/tipos";
import { formatearMonto } from "@/lib/integrante/formato";
import type { Idioma } from "@/lib/ui/idioma";
import { texto, type Clave } from "@/lib/ui/diccionario";

/** One task card in «Crear proyecto». Only `titulo` and `monto` are required to create. */
export type FilaCrear = {
  clave: string;
  titulo: string;
  tipo: TipoTarea;
  monto: string;
  condicion: string;
  /** Email of the person who does it. Empty leaves the task unassigned. */
  asignado: string;
};

let siguiente = 0;

export function filaVacia(clave?: string): FilaCrear {
  siguiente += 1;
  return { clave: clave ?? `t${Date.now().toString(36)}${siguiente}`, titulo: "", tipo: "trabajo", monto: "", condicion: "", asignado: "" };
}

export type Presupuesto = {
  /** Cents. */
  trabajo: number;
  reembolso: number;
  total: number;
  /** Tasks that already count: a title or an amount. */
  tareas: number;
  /** Balance as text, or null when it is unknown (demo, no wallet, network error). */
  saldo: string | null;
  /** Balance minus the total, in cents. Null when the balance is unknown. */
  quedan: number | null;
  /** What is missing to lock the total plus the reserve. Null when it is covered or unknown. */
  falta: FaltaSaldo | null;
  reserva: string;
};

function centavosDe(valor: string | null): number {
  if (!valor) return 0;
  return Math.round(Number(valor) * 100);
}

export function cuentaFila(fila: FilaCrear): boolean {
  return Boolean(fila.titulo.trim() || fila.monto.trim());
}

/** The bottom bar reads this: totals, task count, and whether the balance covers the total plus the reserve. */
export function calcularPresupuesto(filas: readonly FilaCrear[], saldo: string | null): Presupuesto {
  let trabajo = 0;
  let reembolso = 0;
  for (const fila of filas) {
    const monto = normalizarMonto(fila.monto);
    if (!monto) continue;
    if (fila.tipo === "reembolso") reembolso += centavosDe(monto);
    else trabajo += centavosDe(monto);
  }
  const total = trabajo + reembolso;
  const unidades = saldo === null ? null : aUnidades(saldo);
  const saldoCentavos = unidades === null ? null : Number(unidades / 100_000n);
  return {
    trabajo,
    reembolso,
    total,
    tareas: filas.filter(cuentaFila).length,
    saldo: saldoCentavos === null ? null : textoMonto(saldoCentavos),
    quedan: saldoCentavos === null ? null : saldoCentavos - total,
    falta: faltaParaCrear(saldo, textoMonto(total)),
    reserva: RESERVA_USDC,
  };
}

/** The create button is off before the request in demo, while saving, after creating, or without enough balance. */
export function puedeCrear(p: Presupuesto, estado: { demo: boolean; enviando: boolean; creado: boolean }): boolean {
  return !estado.demo && !estado.enviando && !estado.creado && p.falta === null && p.total > 0;
}

export type ErrorTareas = "faltaTarea" | "faltaTitulo" | "faltaMonto" | "montoInvalido" | "correoInvalido";

/** First problem in the task list, or null when every counted task can be sent. */
export function revisarTareas(filas: readonly FilaCrear[]): { error: ErrorTareas; clave: string | null } | null {
  const contadas = filas.filter(cuentaFila);
  if (contadas.length === 0) return { error: "faltaTarea", clave: filas[0]?.clave ?? null };
  for (const fila of contadas) {
    if (!fila.titulo.trim()) return { error: "faltaTitulo", clave: fila.clave };
    if (fila.monto.trim() && !normalizarMonto(fila.monto)) return { error: "montoInvalido", clave: fila.clave };
    if (!normalizarMonto(fila.monto)) return { error: "faltaMonto", clave: fila.clave };
    const correo = fila.asignado.trim();
    if (correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) return { error: "correoInvalido", clave: fila.clave };
  }
  return null;
}

/** Body for POST /api/proyectos. Empty cards are dropped. Priority and difficulty keep their defaults. */
export function cuerpoCrear(entrada: { nombre: string; descripcion: string; contextoIa: string; filas: readonly FilaCrear[] }) {
  return {
    nombre: entrada.nombre.trim(),
    descripcion: entrada.descripcion.trim(),
    contextoIa: entrada.contextoIa.trim(),
    tareas: entrada.filas.filter(cuentaFila).map((fila) => ({
      titulo: fila.titulo.trim(),
      tipo: fila.tipo,
      monto: normalizarMonto(fila.monto),
      condicion: fila.condicion.trim(),
      asignado: fila.asignado.trim(),
      prioridad: "normal" as const,
      dificultad: null,
    })),
  };
}

const EJEMPLO: { tipo: TipoTarea; monto: string; titulo: Clave; condicion: Clave }[] = [
  { tipo: "trabajo", monto: "25", titulo: "crear.ejemploT1", condicion: "crear.ejemploE1" },
  { tipo: "trabajo", monto: "20", titulo: "crear.ejemploT2", condicion: "crear.ejemploE2" },
  { tipo: "trabajo", monto: "15", titulo: "crear.ejemploT3", condicion: "crear.ejemploE3" },
  { tipo: "trabajo", monto: "20", titulo: "crear.ejemploT4", condicion: "crear.ejemploE4" },
  { tipo: "reembolso", monto: "40", titulo: "crear.ejemploT5", condicion: "crear.ejemploE5" },
];

/** «Casa de alquiler»: five ready tasks (four work tasks and one reimbursement with its invoice). */
export function ejemploCasaAlquiler(idioma: Idioma): { nombre: string; descripcion: string; filas: FilaCrear[] } {
  return {
    nombre: texto(idioma, "crear.ejemploNombre"),
    descripcion: texto(idioma, "crear.ejemploDescripcion"),
    filas: EJEMPLO.map((item, indice) => ({
      clave: `ejemplo-${indice + 1}`,
      titulo: texto(idioma, item.titulo),
      tipo: item.tipo,
      monto: item.monto,
      condicion: texto(idioma, item.condicion),
      asignado: "",
    })),
  };
}

/** «25» shows as «25.00» in both languages. Anything not yet a valid amount shows as typed. */
export function montoEnCampo(valor: string, idioma: Idioma): string {
  const monto = normalizarMonto(valor);
  if (!monto) return valor;
  return formatearMonto(monto, idioma).replace(/^\s*US\$\s*/, "");
}
