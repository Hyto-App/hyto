import type { DificultadTarea, PrioridadTarea } from "@/lib/integrante/tipos";

export function esPrioridad(valor: unknown): valor is PrioridadTarea {
  return valor === "normal" || valor === "high";
}

export function esDificultad(valor: unknown): valor is DificultadTarea {
  return valor === "easy" || valor === "medium" || valor === "hard";
}

/** Stored rows and old clients without the field read as normal. */
export function prioridadGuardada(valor: unknown): PrioridadTarea {
  return esPrioridad(valor) ? valor : "normal";
}

/** A missing or unknown difficulty stays unset. Medium is not invented. */
export function dificultadGuardada(valor: unknown): DificultadTarea | null {
  return esDificultad(valor) ? valor : null;
}

export function leerPrioridadEntrada(valor: unknown): PrioridadTarea | { aviso: string } {
  if (valor === undefined) return "normal";
  if (esPrioridad(valor)) return valor;
  return { aviso: "Choose Normal or High." };
}

export function leerDificultadEntrada(valor: unknown): DificultadTarea | null | { aviso: string } {
  if (valor === undefined || valor === null || valor === "") return null;
  if (esDificultad(valor)) return valor;
  return { aviso: "Choose Easy, Medium, Hard, or Not set." };
}
