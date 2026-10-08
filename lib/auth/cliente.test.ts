import assert from "node:assert/strict";
import test from "node:test";
import { fijarWallet, publicarSesion } from "./cliente";

const WALLET = "G" + "C".repeat(55);

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

test("guardar la wallet pide un reto, lo firma y no abre el alta de testnet", async () => {
  const original = globalThis.fetch;
  const pedidos: { url: string; cuerpo: unknown }[] = [];
  const firmados: string[] = [];
  globalThis.fetch = (async (input, init) => {
    const cuerpo = JSON.parse(String(init?.body));
    pedidos.push({ url: String(input), cuerpo });
    if (String(input).endsWith("/reto")) return json({ mensaje: "firma esto", token: "reto-1" });
    return json({ wallet: WALLET });
  }) as typeof fetch;
  try {
    const guardada = await fijarWallet(WALLET, async (mensaje) => {
      firmados.push(mensaje);
      return new Uint8Array([1, 2, 3]);
    });
    assert.deepEqual(guardada, { ok: true });
    assert.deepEqual(firmados, ["firma esto"]);
    assert.deepEqual(pedidos[0], { url: "/api/sesion/wallet/reto", cuerpo: { wallet: WALLET } });
    assert.equal(pedidos[1]?.url, "/api/sesion/wallet");
    assert.deepEqual(pedidos[1]?.cuerpo, { wallet: WALLET, reto: "reto-1", firma: btoa("\u0001\u0002\u0003") });

    pedidos.length = 0;
    globalThis.fetch = (async () => json({ listo: true, wallet: WALLET })) as typeof fetch;
    assert.deepEqual(await fijarWallet(WALLET), { ok: true });

    globalThis.fetch = (async (input) => {
      if (String(input).endsWith("/reto")) return json({ mensaje: "firma esto", token: "reto-1" });
      return json({ wallet: WALLET });
    }) as typeof fetch;
    assert.deepEqual(await fijarWallet(WALLET), { ok: false, aviso: "Sign this account to prove you control it." });

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