import assert from "node:assert/strict";
import test from "node:test";
import { AVISO_ORIGEN_CAVOS } from "./errores";
import { cuentaTrasConexion, fijarWallet, publicarSesion, type IngresoCerrado } from "./cliente";

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

test("si el vault rechaza el sitio, el ingreso no queda abierto y el aviso no dice que venció", async () => {
  const metodos: string[] = [];
  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    metodos.push(`${init?.method ?? "GET"} ${String(input)}`);
    return json({ ok: true });
  }) as typeof fetch;
  const aviso =
    "kit/vault: add https://preview.example to this app's allowed web origins in the Cavos dashboard";
  const cerrado = await cuentaTrasConexion(
    async () => {
      throw new Error(aviso);
    },
    async () => {
      throw new Error("no debía guardar la cuenta");
    },
    fetchImpl,
  );
  assert.deepEqual(cerrado, { aviso: AVISO_ORIGEN_CAVOS, direccion: null, guardada: false });
  assert.deepEqual(metodos, ["DELETE /api/sesion"]);
  assert.equal(cerrado.aviso?.includes("expired"), false);
  assert.equal(cerrado.aviso?.includes("preview.example"), false);
});

test("sin dirección de cobro también cierra el ingreso a medias", async () => {
  const metodos: string[] = [];
  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    metodos.push(`${init?.method ?? "GET"} ${String(input)}`);
    return json({ ok: true });
  }) as typeof fetch;
  const cerrado = await cuentaTrasConexion(async () => null, async () => ({ aviso: null, direccion: null, guardada: true }), fetchImpl);
  assert.equal(cerrado.guardada, false);
  assert.equal(cerrado.aviso, "Could not sign in.");
  assert.deepEqual(metodos, ["DELETE /api/sesion"]);
});

test("un alta de testnet a medias conserva el ingreso porque la cuenta ya quedó guardada", async () => {
  const metodos: string[] = [];
  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    metodos.push(`${init?.method ?? "GET"} ${String(input)}`);
    return json({ ok: true });
  }) as typeof fetch;
  const pendiente: IngresoCerrado = {
    aviso: "We couldn't add the USDC trustline on Stellar testnet.",
    direccion: WALLET,
    guardada: true,
  };
  const cerrado = await cuentaTrasConexion(async () => ({ address: WALLET, billetera: {} as never }), async () => pendiente, fetchImpl);
  assert.deepEqual(cerrado, pendiente);
  assert.deepEqual(metodos, []);
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