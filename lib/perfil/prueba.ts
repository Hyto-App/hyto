import type { Proyecto, TareaFila } from "@/lib/db/tipos";
import { esContratoDemo, usuariosDemo } from "@/lib/sesion/demo";

/**
 * Demo and test events never count on a profile.
 * There is no "test" column yet, so this reads what the app already marks:
 * the demo event ids (`demo`, `demo-12-oct`, any `demo-…`), the seeded sample ZEEK, the demo accounts,
 * and an event name that starts with Demo, Test or Prueba as its own word
 * followed by nothing or a separator ("Prueba", "[Test] ZEEK", "Demo - GDG").
 * "Prueba de sonido" is a real event and is not excluded.
 */
const PALABRA = "(?:demo|test|testing|prueba|pruebas|ejemplo|sample)";
const NOMBRE_PRUEBA = new RegExp(`^\\s*(?:[[(]\\s*${PALABRA}\\s*[\\])]|${PALABRA}\\s*(?:$|[-–—:·|]))`, "i");

/** The seeded sample event (`lib/db/semilla.ts`, PROYECTO_ZEEK): sample amounts, not real work. */
const SEMILLA = { id: "zeek", creadoEn: "2026-09-27T12:00:00.000Z" };

export function esEventoDePrueba(
  proyecto: Pick<Proyecto, "id" | "nombre" | "organizadorId"> & { creadoEn?: string } | null | undefined,
): boolean {
  if (!proyecto) return true;
  const id = proyecto.id.trim().toLowerCase();
  if (id === "demo" || id.startsWith("demo-")) return true;
  if (id === SEMILLA.id && proyecto.creadoEn === SEMILLA.creadoEn) return true;
  const demo = new Set(usuariosDemo().map((usuario) => usuario.id));
  if (proyecto.organizadorId && demo.has(proyecto.organizadorId)) return true;
  if (proyecto.organizadorId?.startsWith("demo-")) return true;
  return NOMBRE_PRUEBA.test(proyecto.nombre ?? "");
}

export function esTareaDemo(tarea: Pick<TareaFila, "contratoEscrow" | "hashPago">): boolean {
  return esContratoDemo(tarea.contratoEscrow) || Boolean(tarea.hashPago && /placeholder/i.test(tarea.hashPago));
}
