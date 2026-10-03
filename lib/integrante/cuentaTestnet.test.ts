import assert from "node:assert/strict";
import test from "node:test";
import { AVISO_FAUCET_TESTNET, AVISO_SOLO_TESTNET } from "./avisosRed";
import { asegurarCuentaEnTestnet, avisoDeCuenta, FRIENDBOT_TESTNET } from "./cuentaTestnet";
import { HORIZON_TESTNET } from "./trustline";

const WALLET = "G" + "A".repeat(55);

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function cuenta(sequence = "4"): Response {
  return json({ sequence, balances: [{ asset_type: "native", balance: "10000" }] });
}

test("una cuenta que ya está en testnet no pasa por Friendbot", async () => {
  const urls: string[] = [];
  const resultado = await asegurarCuentaEnTestnet(WALLET, {
    esperar: async () => undefined,
    fetch: async (input) => {
      urls.push(String(input));
      return cuenta("9");
    },
  });
  assert.equal(resultado.ok, true);
  if (resultado.ok) assert.equal(resultado.creada, false);
  assert.deepEqual(urls, [`${HORIZON_TESTNET}/accounts/${WALLET}`]);
  assert.equal(avisoDeCuenta(resultado), null);
});

test("si Horizon responde 404, Friendbot abre la cuenta y se vuelve a leer", async () => {
  const urls: string[] = [];
  let lecturas = 0;
  const resultado = await asegurarCuentaEnTestnet(WALLET, {
    esperar: async () => undefined,
    fetch: async (input) => {
      const url = String(input);
      urls.push(url);
      if (url.startsWith(FRIENDBOT_TESTNET)) return json({ successful: true });
      lecturas += 1;
      return lecturas === 1 ? new Response("missing", { status: 404 }) : cuenta("15");
    },
  });
  assert.equal(resultado.ok, true);
  if (!resultado.ok) return;
  assert.equal(resultado.creada, true);
  assert.equal(resultado.cuenta.sequence, "15");
  assert.equal(urls[0], `${HORIZON_TESTNET}/accounts/${WALLET}`);
  assert.equal(urls[1], `${FRIENDBOT_TESTNET}?addr=${WALLET}`);
  assert.ok(urls.every((url) => url.startsWith(HORIZON_TESTNET) || url.startsWith(`${FRIENDBOT_TESTNET}?addr=`)));
  assert.equal(urls.some((url) => url.includes("https://horizon.stellar.org/")), false);
});

test("Friendbot que dice que la cuenta ya está fondeada igual deja seguir", async () => {
  let lecturas = 0;
  const resultado = await asegurarCuentaEnTestnet(WALLET, {
    esperar: async () => undefined,
    fetch: async (input) => {
      const url = String(input);
      if (url.startsWith(FRIENDBOT_TESTNET)) {
        return json({ detail: "account already funded to starting balance" }, 400);
      }
      lecturas += 1;
      return lecturas === 1 ? new Response("missing", { status: 404 }) : cuenta("3");
    },
  });
  assert.equal(resultado.ok, true);
  if (resultado.ok) assert.equal(resultado.creada, true);
});

test("si Friendbot falla no se inventa la cuenta", async () => {
  const urls: string[] = [];
  const resultado = await asegurarCuentaEnTestnet(WALLET, {
    esperar: async () => undefined,
    fetch: async (input) => {
      const url = String(input);
      urls.push(url);
      if (url.startsWith(FRIENDBOT_TESTNET)) return new Response("down", { status: 503 });
      return new Response("missing", { status: 404 });
    },
  });
  assert.deepEqual(resultado, { ok: false, motivo: "faucet" });
  assert.equal(avisoDeCuenta(resultado), AVISO_FAUCET_TESTNET);
  assert.equal(urls.filter((url) => url.startsWith(FRIENDBOT_TESTNET)).length, 1);
});

test("en la red pública no se llama a Friendbot", async () => {
  const urls: string[] = [];
  const resultado = await asegurarCuentaEnTestnet(WALLET, {
    env: { ...process.env, HYTO_STELLAR_NETWORK: "mainnet" },
    esperar: async () => undefined,
    fetch: async (input) => {
      urls.push(String(input));
      return new Response("missing", { status: 404 });
    },
  });
  assert.deepEqual(resultado, { ok: false, motivo: "mainnet" });
  assert.equal(avisoDeCuenta(resultado), AVISO_SOLO_TESTNET);
  assert.equal(urls.some((url) => url.includes("friendbot")), false);
  assert.deepEqual(urls, [`${HORIZON_TESTNET}/accounts/${WALLET}`]);
});
