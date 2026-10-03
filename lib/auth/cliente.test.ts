import assert from "node:assert/strict";
import test from "node:test";
import { fijarWallet, publicarSesion } from "./cliente";

const WALLET = "G" + "C".repeat(55);

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

test("guardar la wallet no pide el alta de testnet; eso lo hace solo Sign up", async () => {
  const original = globalThis.fetch;
  const pedidos: { url: string; cuerpo: unknown }[] = [];
  globalThis.fetch = (async (input, init) => {
    pedidos.push({ url: String(input), cuerpo: JSON.parse(String(init?.body)) });
    return json({ wallet: WALLET });
  }) as typeof fetch;
  try {
    const guardada = await fijarWallet(WALLET);
    assert.deepEqual(guardada, { ok: true });
    assert.deepEqual(pedidos, [{ url: "/api/sesion/wallet", cuerpo: { wallet: WALLET } }]);

    globalThis.fetch = (async () => json({ aviso: "No." }, 400)) as typeof fetch;
    assert.deepEqual(await fijarWallet(WALLET), { ok: false, aviso: "No." });
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