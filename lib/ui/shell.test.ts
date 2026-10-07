import assert from "node:assert/strict";
import test from "node:test";
import { seccionDe } from "@/components/admin/Marco";
import { destinoVolver } from "./volver";
import { en, es, rutas, leerTexto } from "./diccionario";

test("Join is its own section, not Account", () => {
  assert.equal(seccionDe("/join"), "unirme");
  assert.equal(seccionDe("/join/HYTO-ABC"), "unirme");
  assert.equal(seccionDe("/cuentas"), "cuenta");
  assert.equal(seccionDe("/cuentas/preparar"), "cuenta");
  assert.equal(seccionDe("/configuracion"), "cuenta");
  assert.equal(seccionDe("/tareas/abc"), "tareas");
  assert.equal(seccionDe("/mis-tareas"), "tareas");
  assert.equal(seccionDe("/revision/abc"), "bandeja");
  assert.equal(seccionDe("/informe"), "informe");
  assert.equal(seccionDe("/eventos/abc/informe"), "informe");
  assert.equal(seccionDe("/eventos/abc/tareas"), "tareasEvento");
  assert.equal(seccionDe("/eventos/abc"), "bandeja");
  assert.equal(seccionDe("/eventos"), "eventos");
  assert.equal(seccionDe("/eventos/nuevo"), "eventos");
});

test("Back exists on the pass-through screens with the spec defaults", () => {
  assert.deepEqual(destinoVolver("/join"), { href: "/mis-tareas", etiqueta: "volver" });
  assert.deepEqual(destinoVolver("/join/x"), { href: "/mis-tareas", etiqueta: "volver" });
  assert.deepEqual(destinoVolver("/tareas/1"), { href: "/mis-tareas", etiqueta: "volver" });
  assert.equal(destinoVolver("/revision/1")?.etiqueta, "volver");
  assert.deepEqual(destinoVolver("/eventos/nuevo"), { href: "/eventos", etiqueta: "cancelar" });
  assert.deepEqual(destinoVolver("/cuentas/preparar"), { href: "/configuracion", etiqueta: "cancelar" });
  assert.equal(destinoVolver("/mis-tareas"), null);
  assert.equal(destinoVolver("/eventos"), null);
});

const JERGA = /escrow|testnet|trustline|xdr|soroban|friendbot|mainnet/i;
const GRUPOS = ["tareas.", "evidencia.", "nav.", "mile.", "confirmar.", "cuenta.", "ayuda.", "actividad."];

test("no forbidden words in the copy of the redesigned screens", () => {
  for (const clave of rutas(en)) {
    if (!GRUPOS.some((grupo) => clave.startsWith(grupo))) continue;
    for (const idioma of ["en", "es"] as const) {
      const valor = leerTexto(idioma, clave);
      assert.ok(!JERGA.test(valor), `${idioma} ${clave}: ${valor}`);
    }
  }
});

test("new copy keeps the same keys in both languages", () => {
  assert.deepEqual(rutas(en).sort(), rutas(es).sort());
  assert.equal(leerTexto("es", "tareas.hello").includes("{name}"), true);
});
