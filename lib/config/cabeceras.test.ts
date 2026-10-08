import assert from "node:assert/strict";
import test from "node:test";
import { cabecerasSeguridad, politicaCsp } from "./cabeceras";

test("la CSP de producción deja entrar a Cavos, Horizon y el vault, y no a la red de desarrollo", () => {
  const politica = politicaCsp(false);
  assert.match(politica, /default-src 'self'/);
  assert.match(politica, /object-src 'none'/);
  assert.match(politica, /frame-ancestors 'none'/);
  assert.match(politica, /https:\/\/cavos\.xyz/);
  assert.match(politica, /https:\/\/vault\.cavos\.xyz/);
  assert.match(politica, /https:\/\/horizon-testnet\.stellar\.org/);
  assert.match(politica, /https:\/\/horizon\.stellar\.org/);
  assert.match(politica, /https:\/\/soroban-testnet\.stellar\.org/);
  assert.match(politica, /https:\/\/friendbot\.stellar\.org/);
  assert.equal(politica.includes("api.groq.com"), false);
  assert.equal(politica.includes("generativelanguage.googleapis.com"), false);
  assert.equal(politica.includes("trustlesswork.com"), false);
  assert.equal(politica.includes("ws:"), false);
  assert.equal(politica.includes("unsafe-eval"), false);
});

test("en desarrollo la CSP también abre el websocket del servidor local", () => {
  const politica = politicaCsp(true);
  assert.match(politica, /connect-src[^;]*\sws:/);
  assert.match(politica, /http:\/\/localhost:\*/);
});

test("las cabeceras incluyen nosniff, el marco y la cámara de las evidencias", () => {
  const claves = new Map(cabecerasSeguridad(false, false).map((cabecera) => [cabecera.key, cabecera.value]));
  assert.equal(claves.get("X-Content-Type-Options"), "nosniff");
  assert.equal(claves.get("X-Frame-Options"), "DENY");
  assert.match(claves.get("Referrer-Policy") ?? "", /strict-origin-when-cross-origin/);
  assert.match(claves.get("Permissions-Policy") ?? "", /camera=\(self\)/);
  assert.equal(claves.get("Content-Security-Policy"), politicaCsp(false));
  assert.equal(politicaCsp(false).includes("vercel.live"), false);
});

test("la barra de preview de Vercel entra en script-src solo cuando el entorno es preview", () => {
  const previo = process.env.VERCEL_ENV;
  try {
    process.env.VERCEL_ENV = "preview";
    const preview = politicaCsp(false, true);
    assert.match(preview, /script-src[^;]*https:\/\/vercel\.live\/_next-live\/feedback\/feedback\.js/);
    assert.equal(cabecerasSeguridad(false).find((cabecera) => cabecera.key === "Content-Security-Policy")?.value, preview);
    process.env.VERCEL_ENV = "production";
    const produccion = cabecerasSeguridad(false).find((cabecera) => cabecera.key === "Content-Security-Policy")?.value ?? "";
    assert.equal(produccion.includes("vercel.live"), false);
  } finally {
    if (previo === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = previo;
  }
});
