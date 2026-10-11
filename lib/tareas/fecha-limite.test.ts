import assert from "node:assert/strict";
import test from "node:test";
import {
  AVISO_FECHA_LEJANA,
  AVISO_FECHA_PASADA,
  diaValido,
  fechaGuardadaVisible,
  hoyLocal,
  moverDia,
  problemaFecha,
  problemaFechaLocal,
  rangoFecha,
  rangoServidor,
} from "./fecha-limite";
import { leerFechaProyecto } from "@/lib/api/proyectos";
import { mensajeClaro } from "@/lib/ui/claro";

// 10 Oct 2026, 20:13 in Costa Rica (UTC−6) is already 11 Oct in UTC.
const NOCHE_CR = new Date("2026-10-11T02:13:00Z");

test("el rango del navegador va de hoy a hoy más cinco años", () => {
  const ahora = new Date(2026, 9, 10, 20, 13);
  assert.equal(hoyLocal(ahora), "2026-10-10");
  assert.deepEqual(rangoFecha(ahora), { min: "2026-10-10", max: "2031-10-10" });
});

test("una fecha pasada, un año absurdo o un día que no existe no pasan en el navegador", () => {
  const ahora = new Date(2026, 9, 10, 9, 0);
  assert.equal(problemaFechaLocal("", ahora), null);
  assert.equal(problemaFechaLocal("2026-10-10", ahora), null);
  assert.equal(problemaFechaLocal("2026-10-09", ahora), "pasada");
  assert.equal(problemaFechaLocal("2005-03-01", ahora), "pasada");
  assert.equal(problemaFechaLocal("0005-03-01", ahora), "formato");
  assert.equal(problemaFechaLocal("2026-02-30", ahora), "formato");
  assert.equal(problemaFechaLocal("2031-10-10", ahora), null);
  assert.equal(problemaFechaLocal("2031-10-11", ahora), "lejana");
  assert.equal(problemaFechaLocal("20260-01-01", ahora), "formato");
});

test("moverDia respeta meses cortos y años bisiestos", () => {
  assert.equal(moverDia("2028-02-29", { anios: 1 }), "2029-02-28");
  assert.equal(moverDia("2026-12-31", { dias: 1 }), "2027-01-01");
  assert.equal(moverDia("2026-03-01", { dias: -1 }), "2026-02-28");
  assert.equal(diaValido("2028-02-29")?.dia, 29);
  assert.equal(diaValido("2027-02-29"), null);
});

test("el servidor deja un día de margen por zona horaria y nada más", () => {
  assert.deepEqual(rangoServidor(NOCHE_CR), { min: "2026-10-10", max: "2031-10-12" });
  // The person in Costa Rica still picks 10 Oct at 8 PM: it passes.
  assert.equal(problemaFecha("2026-10-10", rangoServidor(NOCHE_CR)), null);
  assert.equal(problemaFecha("2026-10-09", rangoServidor(NOCHE_CR)), "pasada");
});

test("la API rechaza fechas pasadas y lejanas con un mensaje claro", () => {
  assert.equal(leerFechaProyecto("2026-10-10", NOCHE_CR), "2026-10-10");
  assert.equal(leerFechaProyecto(" 2027-01-15 ", NOCHE_CR), "2027-01-15");
  assert.equal(leerFechaProyecto("", NOCHE_CR), null);
  assert.equal(leerFechaProyecto(undefined, NOCHE_CR), null);
  assert.deepEqual(leerFechaProyecto("2005-06-01", NOCHE_CR), { aviso: AVISO_FECHA_PASADA });
  assert.deepEqual(leerFechaProyecto("2026-10-08", NOCHE_CR), { aviso: AVISO_FECHA_PASADA });
  assert.deepEqual(leerFechaProyecto("2099-01-01", NOCHE_CR), { aviso: AVISO_FECHA_LEJANA });
  assert.match((leerFechaProyecto("2026-13-01", NOCHE_CR) as { aviso: string }).aviso, /a day like/);
  assert.match((leerFechaProyecto(20261010, NOCHE_CR) as { aviso: string }).aviso, /a day like/);
});

test("el aviso del servidor se lee en español con el texto de Angie", () => {
  assert.equal(mensajeClaro(AVISO_FECHA_PASADA, "es"), "Elija una fecha de hoy en adelante");
  assert.equal(mensajeClaro(AVISO_FECHA_PASADA, "en"), "Choose a date from today onward");
  assert.equal(mensajeClaro(AVISO_FECHA_LEJANA, "es"), "Elija una fecha dentro de los próximos 5 años");
});

test("una fecha guardada en el pasado se sigue mostrando y una rota no rompe la pantalla", () => {
  assert.equal(fechaGuardadaVisible("2024-01-05", "es", { day: "numeric", month: "long", year: "numeric" }), "5 de enero de 2024");
  assert.equal(fechaGuardadaVisible("2005-03-01", "en", { day: "numeric", month: "short" }), "Mar 1");
  assert.equal(fechaGuardadaVisible("no-es-fecha", "es", { day: "numeric" }), null);
  assert.equal(fechaGuardadaVisible(null, "es", { day: "numeric" }), null);
});
