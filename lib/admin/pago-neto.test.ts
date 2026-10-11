import assert from "node:assert/strict";
import test from "node:test";
import { pagadoNetoEvento, pagoNetoTarea } from "./pago-neto";
import { marcadorPng } from "../blob/marcador";
import { tieneEvidenciaVigente } from "../api/editar-tarea";
import { ID_PROYECTO_DEMO } from "../db/semilla";
import type { TareaFila } from "../db/tipos";
import { texto } from "../ui/diccionario";

const pagada = { tipo: "trabajo" as const, monto: "20", tope: null, estado: "pagado" as const, montoConfirmado: null, montoRevisado: null };

test("a paid task shows the net received, with the gross minus the fee below", () => {
  const es = pagoNetoTarea(pagada, "es");
  assert.equal(es?.corto, "US$19,94");
  assert.equal(es?.detalle, "US$20,00 menos comisión de US$0,06");
  assert.equal(pagoNetoTarea({ ...pagada, estado: "pendiente" as never }, "es"), null);
});

test("the event paid total is the sum of nets, the same figure each task shows", () => {
  const total = pagadoNetoEvento([pagada, { ...pagada, estado: "pendiente" as never }], "es");
  assert.equal(total.corto, "US$19,94");
  assert.equal(total.detalle, "US$20,00 menos comisión de US$0,06");
});

test("the volunteer's paid label reads «Pagado · recibió …»", () => {
  assert.equal(texto("es", "evidencia.pagadoRecibio", { amount: "US$19,94" }), "Pagado · recibió US$19,94");
  assert.equal(texto("en", "evidencia.pagadoRecibio", { amount: "US$19.94" }), "Paid · received US$19.94");
});

test("the sample image caption is drawn per language", () => {
  const en = Buffer.from(marcadorPng("trabajo", "en"));
  const es = Buffer.from(marcadorPng("trabajo", "es"));
  assert.notDeepEqual(en, es);
  assert.deepEqual(Buffer.from(marcadorPng("trabajo")), en);
});

test("a pending demo task with an old file from an earlier run does not lock editing", async () => {
  const tarea = { id: "t", proyectoId: ID_PROYECTO_DEMO, estado: "pendiente", hashPago: null, rechazo: null } as unknown as TareaFila;
  const almacen = { ultimaEvidencia: async () => ({ id: "ev" }) } as never;
  assert.equal(await tieneEvidenciaVigente(almacen, tarea), false);
  assert.equal(await tieneEvidenciaVigente(almacen, { ...tarea, estado: "en revisión" } as TareaFila), true);
  assert.equal(await tieneEvidenciaVigente(almacen, { ...tarea, proyectoId: "otro" } as TareaFila), true);
  assert.equal(await tieneEvidenciaVigente({ ultimaEvidencia: async () => null } as never, tarea), false);
});
