export type OrdenTareas = "defecto" | "mayor" | "prioridad";

export type TareaConPago = {
  id: string;
  tipo: "trabajo" | "reembolso";
  monto: string | null;
  tope: string | null;
  prioridad?: string | null;
};

export type GrupoEvento<T> = {
  proyectoId: string;
  tareas: T[];
};

function textoPago(tarea: TareaConPago): string | null {
  const monto = tarea.monto?.trim() ?? "";
  if (tarea.tipo === "reembolso") {
    const tope = tarea.tope?.trim() ?? "";
    if (tope) return tope;
  }
  return monto || null;
}

/** Work uses monto. A reimbursement uses tope, then monto. Empty or non-finite values are missing. */
export function pagoNumerico(tarea: TareaConPago): number | null {
  const texto = textoPago(tarea);
  if (!texto) return null;
  const valor = Number(texto);
  if (!Number.isFinite(valor)) return null;
  return valor;
}

export function idsMejorPagadas<T extends TareaConPago>(tareas: readonly T[]): Set<string> {
  let mayor: number | null = null;
  for (const tarea of tareas) {
    const pago = pagoNumerico(tarea);
    if (pago == null || pago <= 0) continue;
    if (mayor == null || pago > mayor) mayor = pago;
  }
  const ids = new Set<string>();
  if (mayor == null) return ids;
  for (const tarea of tareas) {
    if (pagoNumerico(tarea) === mayor) ids.add(tarea.id);
  }
  return ids;
}

function compararPago(a: number | null, b: number | null): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return b - a;
}

function rangoPrioridad(tarea: { prioridad?: string | null }): number {
  return tarea.prioridad === "high" ? 0 : 1;
}

export function ordenarPorPago<T extends TareaConPago>(tareas: readonly T[], orden: OrdenTareas): T[] {
  const copia = [...tareas];
  if (orden === "defecto") return copia;
  return copia
    .map((tarea, indice) => ({ tarea, indice }))
    .sort((a, b) => {
      const diff = orden === "prioridad" ? rangoPrioridad(a.tarea) - rangoPrioridad(b.tarea) : compararPago(pagoNumerico(a.tarea), pagoNumerico(b.tarea));
      return diff === 0 ? a.indice - b.indice : diff;
    })
    .map((item) => item.tarea);
}

export function agruparPorEvento<T extends { proyectoId: string }>(
  tareas: readonly T[],
  modo: "unir" | "seguir",
): GrupoEvento<T>[] {
  if (modo === "seguir") {
    const grupos: GrupoEvento<T>[] = [];
    for (const tarea of tareas) {
      const proyectoId = tarea.proyectoId || "event";
      const ultimo = grupos[grupos.length - 1];
      if (ultimo && ultimo.proyectoId === proyectoId) ultimo.tareas.push(tarea);
      else grupos.push({ proyectoId, tareas: [tarea] });
    }
    return grupos;
  }

  const mapa = new Map<string, T[]>();
  for (const tarea of tareas) {
    const clave = tarea.proyectoId || "event";
    const grupo = mapa.get(clave);
    if (grupo) grupo.push(tarea);
    else mapa.set(clave, [tarea]);
  }
  return [...mapa.entries()].map(([proyectoId, lista]) => ({ proyectoId, tareas: lista }));
}
