import { texto, type Clave } from "@/lib/ui/diccionario";
import type { Idioma } from "@/lib/ui/idioma";

/** Status chips on the project inbox: «Todas · Por revisar · Pagadas · Pendientes», each with its count. */
export type FiltroEstado = "all" | "en revisión" | "pagado" | "pendiente";

export const FILTROS_ESTADO: readonly { id: FiltroEstado; clave: Clave }[] = [
  { id: "all", clave: "proyecto.todas" },
  { id: "en revisión", clave: "proyecto.porRevisar" },
  { id: "pagado", clave: "proyecto.pagadas" },
  { id: "pendiente", clave: "proyecto.pendientes" },
];

export function chipsEstado(tareas: readonly { estado: string }[]): { id: FiltroEstado; clave: Clave; n: number }[] {
  return FILTROS_ESTADO.map((filtro) => ({
    ...filtro,
    n: filtro.id === "all" ? tareas.length : tareas.filter((tarea) => tarea.estado === filtro.id).length,
  }));
}

const ORDEN: Record<string, number> = { "en revisión": 0, pagado: 1, pendiente: 2 };

/** To review first, then paid, then pending; the order inside each group stays as it came. */
export function filtrarPorEstado<T extends { estado: string }>(tareas: readonly T[], filtro: FiltroEstado): T[] {
  const lista = filtro === "all" ? [...tareas] : tareas.filter((tarea) => tarea.estado === filtro);
  return lista
    .map((tarea, indice) => ({ tarea, indice }))
    .sort((a, b) => (ORDEN[a.tarea.estado] ?? 3) - (ORDEN[b.tarea.estado] ?? 3) || a.indice - b.indice)
    .map((item) => item.tarea);
}

/**
 * The one primary button on the review screen.
 * Evidence in review: «Bloquear y aprobar» while the budget is not locked, «Aprobar y pagar» once it is.
 * No evidence yet: only the lock exists, so it keeps «Bloquear presupuesto» («Terminar de bloquear» to resume).
 */
export function rotuloPrincipalRevision(estado: {
  enRevision: boolean;
  desplegar: boolean;
  fondear: boolean;
  pagar: boolean;
}): Clave | null {
  if (estado.pagar) return "pago.approvePay";
  if (estado.desplegar || estado.fondear) {
    if (estado.enRevision) return "proyecto.bloquearAprobar";
    return estado.fondear ? "pago.finishLocking" : "pago.lockBudget";
  }
  return null;
}

/** The three dots of «Evidencia recibida · Presupuesto bloqueado · Pagado». */
export type EstadoPaso = "hecho" | "ahora" | "luego";

export function pasosRevision(estado: { evidencia: boolean; bloqueado: boolean; pagado: boolean }): [EstadoPaso, EstadoPaso, EstadoPaso] {
  if (estado.pagado) return ["hecho", "hecho", "hecho"];
  const evidencia: EstadoPaso = estado.evidencia ? "hecho" : "ahora";
  const bloqueo: EstadoPaso = estado.bloqueado ? "hecho" : estado.evidencia ? "ahora" : "luego";
  // Paid only after the payment exists. Locking the budget does not start this step.
  const pago: EstadoPaso = "luego";
  return [evidencia, bloqueo, pago];
}

/** Step 3 before the signature says the payment is still pending. «Paid · Now» only after it exists. */
export function rotuloPasoPago(pagado: boolean, idioma: Idioma): string {
  return texto(idioma, pagado ? "proyecto.pasoPagadoAhora" : "proyecto.pasoPagoPendiente");
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * A person's label for the screen. Never a raw email or an internal id: those come back null so the
 * caller can say «Voluntario» instead.
 */
export function nombrePersona(valor: string | null | undefined): string | null {
  const limpio = (valor ?? "").trim();
  if (!limpio || limpio.includes("@") || UUID.test(limpio)) return null;
  return limpio;
}

/** Whole percent paid, for the budget bar. */
export function porcentajePagado(pagado: string, total: string): number {
  const p = Number(pagado);
  const t = Number(total);
  if (!(t > 0) || !Number.isFinite(p)) return 0;
  return Math.max(0, Math.min(100, Math.round((p / t) * 100)));
}

const FRASES_MILE: Record<string, string> = {
  "The answers say this is what was requested.": "Mile sees that it matches what was asked.",
  "The answers say this expense is what was requested.": "Mile sees this expense matches what was asked.",
  "Las respuestas dicen que esto es lo pedido.": "Mile ve que coincide con lo pedido.",
  "Las respuestas dicen que este gasto es lo pedido.": "Mile ve que este gasto coincide con lo pedido.",
};

/**
 * The review's Mile block speaks as Mile: «Las respuestas dicen que…» becomes «Mile ve que…»
 * («The answers say…» → «Mile sees…»). Stored tags keep their text; this is only how they read here.
 */
export function fraseMile(explicacion: string): string {
  const fija = FRASES_MILE[explicacion];
  if (fija) return fija;
  if (explicacion.startsWith("Las respuestas dicen que ")) return `Mile ve que ${explicacion.slice("Las respuestas dicen que ".length)}`;
  if (explicacion.startsWith("The answers say ")) return `Mile sees ${explicacion.slice("The answers say ".length)}`;
  return explicacion;
}
