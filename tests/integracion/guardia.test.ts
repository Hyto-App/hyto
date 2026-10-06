import assert from "node:assert/strict";
import test from "node:test";
import { cerrarEscriturasRemotas, motivoDeGuardia, motivoSuiteSync, planDeSuite } from "./guardia";
import { esHostLocal } from "./url-local";

test("la guardia acepta localhost, loopback, IPv6 y un servicio Docker", () => {
  for (const url of [
    "postgres://hyto:hyto@127.0.0.1:5432/hyto_integracion",
    "postgres://hyto:hyto@localhost/hyto",
    "postgres://hyto:hyto@[::1]:5432/hyto",
    "postgresql://hyto:hyto@[::1]/hyto",
    "postgres://hyto:hyto@postgres:5432/hyto",
    "postgres://hyto:hyto@db/hyto",
    "postgres://hyto:hyto@hyto_db:5432/hyto",
    "postgres://hyto:hyto@Postgres:5432/hyto",
  ]) {
    assert.equal(esHostLocal(url), true, url);
    assert.deepEqual(planDeSuite(url), { conectar: true, motivo: false });
  }
});

test("la guardia se niega a arrancar si la URL no es local", () => {
  for (const url of [
    "postgres://user:clave@ep-prueba.us-east-2.aws.neon.tech/neondb",
    "postgres://user:p@ss@ep-prueba.eu-central-1.aws.neon.tech/neondb",
    "postgres://hyto:hyto@10.1.2.3:5432/hyto",
    "postgres://hyto:hyto@db.example/hyto",
    "postgres://hyto:hyto@host.docker.internal:5432/hyto",
    "",
    "no-es-una-url",
  ]) {
    assert.equal(esHostLocal(url), false, url);
    const plan = planDeSuite(url);
    assert.equal(plan.conectar, false, url);
    assert.equal(typeof plan.motivo, "string");
    assert.equal(Boolean(plan.motivo), true);
  }
});

test("la suite se salta sin servidor y no consulta uno remoto", () => {
  assert.equal(motivoDeGuardia("postgres://hyto:hyto@127.0.0.1:5432/hyto", false), "no hay base local");
  assert.equal(motivoDeGuardia("postgres://hyto:hyto@postgres:5432/hyto", true), false);
  const inicio = Date.now();
  const motivo = motivoSuiteSync({
    NODE_ENV: "test",
    HYTO_TEST_DATABASE_URL: "postgres://user:clave@ep-prueba.us-east-2.aws.neon.tech/neondb",
  });
  assert.equal(motivo, "la URL no apunta a una base local");
  assert.equal(Date.now() - inicio < 200, true);
});

test("cerrar escrituras remotas borra Blob y la URL y anula los ganchos", async () => {
  const env: Record<string, string | undefined> = {
    DATABASE_URL: "postgres://user:clave@ep-prueba.us-east-2.aws.neon.tech/neondb",
    BLOB_READ_WRITE_TOKEN: "token-remoto",
    GROQ_API_KEY: "groq",
    GEMINI_API_KEY: "gemini",
    LAYA_URL: "https://laya.example",
    LAYA_API_KEY: "laya",
    TRUSTLESS_API_KEY: "trustless",
    NEXT_PUBLIC_CAVOS_APP_ID: "cavos",
    CAVOS_JWT_JWK: "{\"kty\":\"RSA\"}",
    CAVOS_JWKS_URL: "https://example.test/jwks",
  };
  const ganchos: {
    __HYTO_ALMACEN_PRUEBA?: () => Promise<unknown>;
    __HYTO_FOTOS_PRUEBA?: () => unknown;
  } = {};
  cerrarEscriturasRemotas(env, ganchos);
  assert.equal(env.DATABASE_URL, undefined);
  assert.equal(env.BLOB_READ_WRITE_TOKEN, undefined);
  assert.equal(env.GROQ_API_KEY, undefined);
  assert.equal(env.GEMINI_API_KEY, undefined);
  assert.equal(env.CAVOS_JWKS_URL, undefined);
  assert.equal(await ganchos.__HYTO_ALMACEN_PRUEBA?.(), null);
  assert.equal(ganchos.__HYTO_FOTOS_PRUEBA?.(), null);
});
