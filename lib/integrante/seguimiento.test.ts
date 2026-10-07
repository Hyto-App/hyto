import assert from "node:assert/strict";
import test from "node:test";
import {
  esperaRevision,
  INTERVALO_SEGUIMIENTO_MS,
  LIMITE_SEGUIMIENTO_MS,
  mostrarReintento,
  plazoRevisionVencido,
  reintentoEnLista,
  seguirConsultando,
  seguirEnLista,
  topeSeguimientoMs,
} from "./seguimiento";

const enRevision = { estado: "en revisión", nota: null } as const;

test("polls every 3 s for up to 60 s", () => {
  assert.equal(INTERVALO_SEGUIMIENTO_MS, 3000);
  assert.equal(LIMITE_SEGUIMIENTO_MS, 60000);
});

test("waits only for a sent task without a grade", () => {
  assert.equal(esperaRevision(enRevision), true);
  assert.equal(esperaRevision({ estado: "en revisión" }), true);
  assert.equal(esperaRevision({ estado: "en revisión", nota: 0 }), false);
  assert.equal(esperaRevision({ estado: "pendiente", nota: null }), false);
  assert.equal(esperaRevision({ estado: "pagado", nota: null }), false);
});

test("a stored failure is not still in review", () => {
  assert.equal(esperaRevision({ ...enRevision, revisionFallida: true }), false);
  assert.equal(esperaRevision({ estado: "en revisión", nota: null, revisionFallida: false }), true);
});

test("the follow window is counted from when the photo was sent", () => {
  const ahora = 1_700_000_060_000;
  const reciente = new Date(ahora - 10_000).toISOString();
  const vieja = new Date(ahora - LIMITE_SEGUIMIENTO_MS).toISOString();
  assert.equal(plazoRevisionVencido({ enviadaEn: reciente, nota: null }, ahora), false);
  assert.equal(plazoRevisionVencido({ enviadaEn: vieja, nota: null }, ahora), true);
  assert.equal(plazoRevisionVencido({ enviadaEn: vieja, nota: 80 }, ahora), false);
  assert.equal(plazoRevisionVencido({ enviadaEn: null, nota: null }, ahora), false);
  assert.equal(topeSeguimientoMs(reciente, ahora, false), LIMITE_SEGUIMIENTO_MS - 10_000);
  assert.equal(topeSeguimientoMs(vieja, ahora, false), 0);
  assert.equal(topeSeguimientoMs(vieja, ahora, true), LIMITE_SEGUIMIENTO_MS);
});

test("retry is shown for a failure, a spent wait, or a photo already past the window", () => {
  const ahora = 1_700_000_060_000;
  const base = {
    estado: "en revisión" as const,
    nota: null,
    enviadaEn: new Date(ahora).toISOString(),
    etapa: "en_revision" as const,
    hashPago: null,
  };
  const quieto = { esperaLocal: false, esperaAgotada: false, ahora };
  assert.equal(mostrarReintento(base, quieto), false);
  assert.equal(mostrarReintento({ ...base, revisionFallida: true }, quieto), true);
  assert.equal(mostrarReintento({ ...base, revisionFallida: true }, { ...quieto, esperaLocal: true }), true);
  assert.equal(mostrarReintento(base, { esperaLocal: false, esperaAgotada: true, ahora }), true);
  assert.equal(
    mostrarReintento({ ...base, enviadaEn: new Date(ahora - LIMITE_SEGUIMIENTO_MS).toISOString() }, quieto),
    true,
  );
  assert.equal(
    mostrarReintento({ ...base, enviadaEn: new Date(ahora - LIMITE_SEGUIMIENTO_MS).toISOString() }, { ...quieto, esperaLocal: true }),
    false,
  );
  assert.equal(mostrarReintento({ ...base, nota: 84 }, quieto), false);
  assert.equal(mostrarReintento({ ...base, nota: 40, revisionFallida: true }, quieto), false);
  assert.equal(mostrarReintento({ ...base, estado: "pagado" }, { ...quieto, esperaAgotada: true }), false);
});

test("My tasks keeps asking only while the minute is still open", () => {
  const ahora = 1_700_000_060_000;
  const reciente = {
    id: "a",
    ...enRevision,
    enviadaEn: new Date(ahora - 10_000).toISOString(),
  };
  const vieja = {
    id: "b",
    ...enRevision,
    enviadaEn: new Date(ahora - LIMITE_SEGUIMIENTO_MS).toISOString(),
  };
  const sinFecha = { id: "c", ...enRevision, enviadaEn: null };
  assert.equal(seguirEnLista([reciente], ahora, new Map()), true);
  assert.equal(seguirEnLista([vieja], ahora, new Map()), true);
  assert.equal(seguirEnLista([vieja], ahora, new Map([["b", ahora - LIMITE_SEGUIMIENTO_MS * 2]])), false);
  assert.equal(seguirEnLista([sinFecha], ahora, new Map([["c", ahora - 1_000]])), true);
  assert.equal(seguirEnLista([sinFecha], ahora, new Map([["c", ahora - LIMITE_SEGUIMIENTO_MS * 2]])), false);
  assert.equal(seguirEnLista([{ ...reciente, nota: 80 }], ahora, new Map()), false);
  assert.equal(reintentoEnLista(reciente, ahora, undefined), false);
  assert.equal(reintentoEnLista(vieja, ahora, undefined), true);
  assert.equal(reintentoEnLista(sinFecha, ahora, ahora - LIMITE_SEGUIMIENTO_MS), true);
  assert.equal(reintentoEnLista({ ...reciente, revisionFallida: true }, ahora, undefined), true);
});

test("stops when the grade arrives, the state changes or 60 s pass", () => {
  assert.equal(seguirConsultando(enRevision, enRevision, 3000), true);
  assert.equal(seguirConsultando(enRevision, { estado: "en revisión", nota: 80 }, 3000), false);
  assert.equal(seguirConsultando(enRevision, { estado: "pagado", nota: null }, 3000), false);
  assert.equal(seguirConsultando(enRevision, { estado: "pendiente", nota: null }, 3000), false);
  assert.equal(seguirConsultando(enRevision, enRevision, 30000), true);
  assert.equal(seguirConsultando(enRevision, enRevision, 60000), false);
});
