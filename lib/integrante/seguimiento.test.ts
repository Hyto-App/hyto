import assert from "node:assert/strict";
import test from "node:test";
import { esperaRevision, INTERVALO_SEGUIMIENTO_MS, LIMITE_SEGUIMIENTO_MS, seguirConsultando } from "./seguimiento";

const enRevision = { estado: "en revisión", nota: null } as const;

test("polls every 3 s for up to 30 s", () => {
  assert.equal(INTERVALO_SEGUIMIENTO_MS, 3000);
  assert.equal(LIMITE_SEGUIMIENTO_MS, 30000);
});

test("waits only for a sent task without a grade", () => {
  assert.equal(esperaRevision(enRevision), true);
  assert.equal(esperaRevision({ estado: "en revisión" }), true);
  assert.equal(esperaRevision({ estado: "en revisión", nota: 0 }), false);
  assert.equal(esperaRevision({ estado: "pendiente", nota: null }), false);
  assert.equal(esperaRevision({ estado: "pagado", nota: null }), false);
});

test("stops when the grade arrives, the state changes or 30 s pass", () => {
  assert.equal(seguirConsultando(enRevision, enRevision, 3000), true);
  assert.equal(seguirConsultando(enRevision, { estado: "en revisión", nota: 80 }, 3000), false);
  assert.equal(seguirConsultando(enRevision, { estado: "pagado", nota: null }, 3000), false);
  assert.equal(seguirConsultando(enRevision, { estado: "pendiente", nota: null }, 3000), false);
  assert.equal(seguirConsultando(enRevision, enRevision, 30000), false);
});
