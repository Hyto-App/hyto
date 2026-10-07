import assert from "node:assert/strict";
import test from "node:test";
import { armarSalud, baseAlcanzable, responderSalud, versionDeApp } from "./salud";

test("salud ok cuando la base responde", async () => {
  const respuesta = await responderSalud(async () => true, "abc1234def");
  assert.equal(respuesta.status, 200);
  assert.match(respuesta.headers.get("cache-control") ?? "", /no-store/);
  assert.deepEqual(await respuesta.json(), {
    ok: true,
    status: "ok",
    version: "abc1234def",
    db: "up",
  });
});

test("salud no es 200 cuando la base no responde", async () => {
  const respuesta = await responderSalud(async () => false, null);
  assert.equal(respuesta.status, 503);
  assert.deepEqual(await respuesta.json(), {
    ok: false,
    status: "down",
    version: null,
    db: "down",
  });
});

test("un fallo de la prueba no filtra el error", async () => {
  const respuesta = await responderSalud(async () => {
    throw new Error("postgres://user:super-secret-password@db.example/hyto");
  }, null);
  assert.equal(respuesta.status, 503);
  const texto = await respuesta.text();
  assert.equal(texto.includes("super-secret"), false);
  assert.equal(texto.includes("postgres://"), false);
  assert.deepEqual(JSON.parse(texto), { ok: false, status: "down", version: null, db: "down" });
});

test("la versión es el sha o la del paquete, y nada más", () => {
  assert.equal(versionDeApp({ VERCEL_GIT_COMMIT_SHA: "ABC1234DEF" }), "abc1234def");
  assert.equal(versionDeApp({ VERCEL_GIT_COMMIT_SHA: "  deadbeef  ", npm_package_version: "1.2.3" }), "deadbeef");
  assert.equal(versionDeApp({ npm_package_version: "1.2.3" }), "1.2.3");
  assert.equal(versionDeApp({}), null);
  assert.equal(versionDeApp({ VERCEL_GIT_COMMIT_SHA: "not a sha", npm_package_version: "1.0.0" }), "1.0.0");
  assert.equal(versionDeApp({ npm_package_version: "1.0.0 secret" }), null);
});

test("sin url la base no está alcanzable y no se consulta", async () => {
  assert.equal(await baseAlcanzable(null), false);
  assert.equal(await baseAlcanzable("   "), false);
});

test("el cuerpo de salud solo trae ok, status, version y db", () => {
  assert.deepEqual(Object.keys(armarSalud(true, "abc").cuerpo).sort(), ["db", "ok", "status", "version"]);
});
