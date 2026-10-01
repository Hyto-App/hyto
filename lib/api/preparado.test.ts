import assert from "node:assert/strict";
import test from "node:test";
import { emitirTokenPreparado, VIGENCIA_PREPARADO_MS, verificarTokenPreparado } from "./preparado";

const env = { HYTO_TOKEN_SECRET: "hyto-token-secret-for-tests-32ch" };
const carga = {
  usuarioId: "organizador",
  sesionId: "tok",
  huella: "ab".repeat(32),
  accion: "liberar",
  tareaId: "stand",
  monto: "",
};

test("el token ata usuario, sesión, huella y vence a los 10 minutos", () => {
  const ahora = 1_700_000_000_000;
  const token = emitirTokenPreparado(carga, ahora, env);
  assert.ok(token);
  const ok = verificarTokenPreparado(token, { usuarioId: carga.usuarioId, sesionId: carga.sesionId, huella: carga.huella }, ahora + 1000, env);
  assert.equal(ok.ok, true);
  if (ok.ok) assert.equal(ok.carga.exp, ahora + VIGENCIA_PREPARADO_MS);

  const vencido = verificarTokenPreparado(token, { usuarioId: carga.usuarioId, sesionId: carga.sesionId, huella: carga.huella }, ahora + VIGENCIA_PREPARADO_MS, env);
  assert.deepEqual(vencido, { ok: false, codigo: "vencido" });
});

test("rechaza otra sesión, otro usuario, otra huella y una firma alterada", () => {
  const token = emitirTokenPreparado(carga, Date.now(), env);
  assert.ok(token);
  assert.equal(
    verificarTokenPreparado(token, { usuarioId: "otro", sesionId: carga.sesionId, huella: carga.huella }, Date.now(), env).ok,
    false,
  );
  assert.equal(
    verificarTokenPreparado(token, { usuarioId: carga.usuarioId, sesionId: "otra", huella: carga.huella }, Date.now(), env).ok,
    false,
  );
  const huella = verificarTokenPreparado(token, { usuarioId: carga.usuarioId, sesionId: carga.sesionId, huella: "cd".repeat(32) }, Date.now(), env);
  assert.deepEqual(huella, { ok: false, codigo: "huella" });
  const [cuerpo, mac] = token.split(".");
  const alterado = `${cuerpo}.${mac.slice(0, -1)}${mac.endsWith("a") ? "b" : "a"}`;
  assert.deepEqual(
    verificarTokenPreparado(alterado, { usuarioId: carga.usuarioId, sesionId: carga.sesionId, huella: carga.huella }, Date.now(), env),
    { ok: false, codigo: "invalido" },
  );
});

test("sin secreto de servidor no firma ni verifica", () => {
  const vacio = {};
  assert.equal(emitirTokenPreparado(carga, Date.now(), vacio), null);
  const token = emitirTokenPreparado(carga, Date.now(), env);
  assert.ok(token);
  assert.deepEqual(
    verificarTokenPreparado(token, { usuarioId: carga.usuarioId, sesionId: carga.sesionId, huella: carga.huella }, Date.now(), vacio),
    { ok: false, codigo: "secreto" },
  );
});

test("producción no usa la clave de pruebas y un secreto corto no firma", () => {
  const produccion = { NODE_ENV: "production", HYTO_TEST_SESSION_KEY: "clave-de-prueba" };
  assert.equal(emitirTokenPreparado(carga, Date.now(), produccion), null);
  assert.equal(emitirTokenPreparado(carga, Date.now(), { HYTO_TOKEN_SECRET: "demasiado-corto", NODE_ENV: "production" }), null);
  const enPruebas = {
    NODE_ENV: "production",
    NODE_TEST_CONTEXT: "child-v8",
    HYTO_TEST_SESSION_KEY: "clave-de-prueba",
  };
  assert.ok(emitirTokenPreparado(carga, Date.now(), enPruebas));
  assert.ok(emitirTokenPreparado(carga, Date.now(), { NODE_ENV: "development", HYTO_TEST_SESSION_KEY: "clave-de-prueba" }));
});
