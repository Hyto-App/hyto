import assert from "node:assert/strict";
import test from "node:test";
import { decidirMigracionDeploy } from "./migrar-deploy";

const URL = "postgres://usuario:clave@ep-hyto.us-east-2.aws.neon.tech/hyto?sslmode=require";

test("fuera de Vercel no migra", () => {
  const decision = decidirMigracionDeploy({ DATABASE_URL: URL });
  assert.deepEqual(decision, { accion: "omitir", motivo: "This is not a Vercel build." });
});

test("producción sin URL detiene el deploy y un preview sin URL sigue", () => {
  assert.equal(decidirMigracionDeploy({ VERCEL: "1", VERCEL_ENV: "production" }).accion, "fallar");
  assert.equal(decidirMigracionDeploy({ VERCEL: "1", VERCEL_ENV: "preview" }).accion, "omitir");
});

test("un deploy de Vercel migra solo el host de su DATABASE_URL y no enciende features", () => {
  const previo = process.env.HYTO_ORGANIZACIONES;
  delete process.env.HYTO_ORGANIZACIONES;
  try {
    const decision = decidirMigracionDeploy({
      VERCEL: "1",
      VERCEL_ENV: "production",
      DATABASE_URL: URL,
      HYTO_ORGANIZACIONES: "on",
    });
    assert.equal(decision.accion, "migrar");
    if (decision.accion !== "migrar") return;
    assert.equal(decision.host, "ep-hyto.us-east-2.aws.neon.tech");
    assert.equal(decision.url.includes("clave"), true);
    assert.equal(process.env.HYTO_ORGANIZACIONES, undefined);
    const texto = JSON.stringify({ accion: decision.accion, host: decision.host });
    assert.equal(texto.includes("clave"), false);
  } finally {
    if (previo === undefined) delete process.env.HYTO_ORGANIZACIONES;
    else process.env.HYTO_ORGANIZACIONES = previo;
  }
});
