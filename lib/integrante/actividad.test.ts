import assert from "node:assert/strict";
import test from "node:test";
import { instanteGuardado, seguimientoDe, type TareaActividad } from "./actividad";

const base: TareaActividad = {
  estado: "pendiente",
  etapa: null,
  hashPago: null,
  enviadaEn: null,
  nota: null,
  veredicto: null,
  revisionFallida: false,
};

test("sin foto no hay eventos ni horas inventadas", () => {
  const vista = seguimientoDe(base);
  assert.deepEqual(vista.eventos, []);
  assert.deepEqual(vista.pasos, []);
  assert.equal(instanteGuardado("no-es-fecha"), null);
  assert.equal(instanteGuardado(null), null);
});

test("pendiente no arma Approved, el envío ni la revisión de Mile", () => {
  const vista = seguimientoDe({
    ...base,
    etapa: "enviada_organizador",
    enviadaEn: "2026-10-01T18:00:00.000Z",
    nota: 65,
    veredicto: "parcial",
  });
  assert.deepEqual(vista.eventos, []);
  assert.deepEqual(vista.pasos, []);
});

test("la foto guarda su hora y Mile no tiene una", () => {
  const vista = seguimientoDe({
    ...base,
    estado: "en revisión",
    etapa: "enviada_organizador",
    enviadaEn: "2026-10-06T15:04:00.000Z",
    nota: 86,
    veredicto: "cumplió",
  });
  assert.deepEqual(vista.eventos, [
    { id: "envio", en: "2026-10-06T15:04:00.000Z" },
    { id: "mile", en: null },
  ]);
  assert.deepEqual(
    vista.pasos.map((paso) => paso.estado),
    ["ahora", "despues", "despues"],
  );
});

test("un hash sin pago no marca aprobada y deja el pago en camino, sin hora", () => {
  const vista = seguimientoDe({
    ...base,
    estado: "en revisión",
    etapa: "aprobada",
    enviadaEn: "2026-10-06T15:04:00.000Z",
    nota: 90,
    veredicto: "cumplió",
    hashPago: "ab".repeat(32),
  });
  assert.deepEqual(
    vista.pasos.map((paso) => paso.estado),
    ["ahora", "hecho", "ahora"],
  );
  assert.deepEqual(
    vista.eventos.map((evento) => evento.id),
    ["envio", "mile", "camino"],
  );
  assert.equal(vista.eventos.every((evento) => evento.id === "envio" || evento.en === null), true);
  assert.equal(vista.eventos.some((evento) => evento.id === "aprobada"), false);
});

test("pagada con hash cierra los tres pasos y no inventa la hora del pago", () => {
  const vista = seguimientoDe({
    ...base,
    estado: "pagado",
    etapa: "aprobada",
    hashPago: "cd".repeat(32),
    nota: 90,
    veredicto: "cumplió",
  });
  assert.deepEqual(
    vista.pasos.map((paso) => paso.id),
    ["aprobada", "enviado", "pagado"],
  );
  assert.deepEqual(
    vista.pasos.map((paso) => paso.estado),
    ["hecho", "hecho", "hecho"],
  );
  const pagado = vista.eventos.find((evento) => evento.id === "pagado");
  assert.equal(pagado?.en, null);
});

test("una revisión fallida no dice que Mile ya revisó", () => {
  const vista = seguimientoDe({
    ...base,
    estado: "en revisión",
    etapa: "en_revision",
    enviadaEn: "2026-10-06T15:04:00.000Z",
    revisionFallida: true,
  });
  assert.deepEqual(
    vista.eventos.map((evento) => evento.id),
    ["envio"],
  );
});
