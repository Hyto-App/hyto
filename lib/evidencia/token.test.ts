import assert from "node:assert/strict";
import test from "node:test";
import { VIGENCIA_EVIDENCIA_MS, consumirTokenEvidencia, emitirTokenEvidencia, reiniciarTokensEvidencia } from "./token";
import { asegurarSecretoPrueba } from "./muestras";

const ENV = { HYTO_TOKEN_SECRET: "hyto-test-token-secret-32chars!!", NODE_ENV: "test" };

test("el token dura unos dos minutos y no se puede reutilizar", () => {
  reiniciarTokensEvidencia();
  asegurarSecretoPrueba();
  const ahora = 1_000_000;
  const token = emitirTokenEvidencia({ usuarioId: "ana", tareaId: "stand" }, ahora, ENV);
  assert.ok(token);
  const primero = consumirTokenEvidencia(token!, { usuarioId: "ana", tareaId: "stand" }, ahora + 1000, ENV);
  assert.equal(primero.ok, true);
  if (primero.ok) assert.equal(primero.carga.exp - primero.carga.iat, VIGENCIA_EVIDENCIA_MS);
  const reuso = consumirTokenEvidencia(token!, { usuarioId: "ana", tareaId: "stand" }, ahora + 1000, ENV);
  assert.equal(reuso.ok, false);
  if (!reuso.ok) assert.equal(reuso.codigo, "reusado");
});

test("un token vencido, de otra tarea o sin firma no pasa", () => {
  reiniciarTokensEvidencia();
  const ahora = 2_000_000;
  const token = emitirTokenEvidencia({ usuarioId: "ana", tareaId: "stand" }, ahora, ENV);
  assert.ok(token);
  const vencido = consumirTokenEvidencia(token!, { usuarioId: "ana", tareaId: "stand" }, ahora + VIGENCIA_EVIDENCIA_MS + 1, ENV);
  assert.equal(vencido.ok, false);
  if (!vencido.ok) assert.equal(vencido.codigo, "vencido");

  const fresco = emitirTokenEvidencia({ usuarioId: "ana", tareaId: "stand" }, ahora, ENV)!;
  const otra = consumirTokenEvidencia(fresco, { usuarioId: "ana", tareaId: "comida" }, ahora, ENV);
  assert.equal(otra.ok, false);
  if (!otra.ok) assert.equal(otra.codigo, "tarea");
  const ajeno = consumirTokenEvidencia(fresco, { usuarioId: "otro", tareaId: "stand" }, ahora, ENV);
  assert.equal(ajeno.ok, false);
  if (!ajeno.ok) assert.equal(ajeno.codigo, "usuario");
  assert.equal(consumirTokenEvidencia("no.firma", { usuarioId: "ana", tareaId: "stand" }, ahora, ENV).ok, false);
  assert.equal(emitirTokenEvidencia({ usuarioId: "ana", tareaId: "stand" }, ahora, { HYTO_TOKEN_SECRET: "corto", NODE_ENV: "production" }), null);
});
