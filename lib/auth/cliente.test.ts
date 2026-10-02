import assert from "node:assert/strict";
import test from "node:test";
import { AVISO_FAUCET_TESTNET } from "../integrante/avisosRed";
import { fijarWallet, publicarSesion } from "./cliente";

const WALLET = "G" + "C".repeat(55);

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

test("el alta viaja solo cuando el ingreso es de un usuario nuevo", async () => {
  const original = globalThis.fetch;
  const cuerpos: unknown[] = [];
  globalThis.fetch = (async (_input, init) => {
    cuerpos.push(JSON.parse(String(init?.body)));
    const alta = (cuerpos.at(-1) as { alta?: boolean }).alta === true;
    return json(alta ? { wallet: WALLET, enRed: false, aviso: "red" } : { wallet: WALLET });
  }) as typeof fetch;
  try {
    const ingreso = await fijarWallet(WALLET, false);
    const alta = await fijarWallet(WALLET, true);
    assert.equal(ingreso.ok, true);
    if (ingreso.ok) {
      assert.equal(ingreso.enRed, null);
      assert.equal(ingreso.aviso, null);
    }
    assert.equal(alta.ok, true);
    if (alta.ok) {
      assert.equal(alta.enRed, false);
      assert.equal(alta.aviso, "red");
    }
    assert.deepEqual(cuerpos, [{ wallet: WALLET }, { wallet: WALLET, alta: true }]);

    globalThis.fetch = (async () => json({ wallet: WALLET, enRed: false })) as typeof fetch;
    const sinTexto = await fijarWallet(WALLET, true);
    assert.equal(sinTexto.ok, true);
    if (sinTexto.ok) assert.equal(sinTexto.aviso, AVISO_FAUCET_TESTNET);
  } finally {
    globalThis.fetch = original;
  }
});

test("publicarSesion marca nuevo solo cuando el servidor lo dice", async () => {
  const original = globalThis.fetch;
  const vistos: unknown[] = [];
  globalThis.fetch = (async (_input, init) => {
    vistos.push(JSON.parse(String(init?.body)));
    const correo = (vistos.at(-1) as { email: string }).email;
    return json({ rol: "voluntario", nuevo: correo === "nueva@hyto.app" });
  }) as typeof fetch;
  try {
    const nueva = await publicarSesion("nueva@hyto.app", "tok");
    const vieja = await publicarSesion("ana@hyto.app", "tok");
    assert.equal(nueva.ok && nueva.nuevo, true);
    assert.equal(vieja.ok && vieja.nuevo, false);
  } finally {
    globalThis.fetch = original;
  }
});