import assert from "node:assert/strict";
import test from "node:test";
import { USDC } from "./identidades";
import { asegurarCuentaTestnet, esLlamadaTestnet, urlFriendbotTestnet } from "./friendbot";

const DIRECCION = `G${"A".repeat(55)}`;

test("una cuenta que ya está en testnet no llama a Friendbot", async () => {
  const llamadas: string[] = [];
  const fetchImpl: typeof fetch = async (input) => {
    llamadas.push(String(input));
    return new Response(JSON.stringify({ balances: [{ asset_code: USDC.code, asset_issuer: USDC.issuer }] }), { status: 200 });
  };
  const resultado = await asegurarCuentaTestnet(DIRECCION, fetchImpl, async () => {});
  assert.equal(resultado.friendbot, false);
  assert.equal(resultado.usdc, true);
  assert.equal(llamadas.length, 1);
  assert.equal(llamadas[0]?.startsWith("https://horizon-testnet.stellar.org/accounts/"), true);
  assert.equal(llamadas.some((url) => url.includes("friendbot")), false);
  assert.equal(llamadas.some((url) => url.includes("horizon.stellar.org") && !url.includes("horizon-testnet")), false);
});

test("si la cuenta no existe, Friendbot de testnet la crea una sola vez", async () => {
  const llamadas: string[] = [];
  let horizon = 0;
  const fetchImpl: typeof fetch = async (input) => {
    const url = String(input);
    llamadas.push(url);
    if (url.startsWith("https://friendbot.stellar.org")) return new Response("ok", { status: 200 });
    horizon += 1;
    if (horizon === 1) return new Response("missing", { status: 404 });
    return new Response(JSON.stringify({ balances: [] }), { status: 200 });
  };
  const resultado = await asegurarCuentaTestnet(DIRECCION, fetchImpl, async () => {});
  assert.equal(resultado.friendbot, true);
  assert.equal(resultado.usdc, false);
  const friendbot = llamadas.filter((url) => url.startsWith("https://friendbot.stellar.org"));
  assert.deepEqual(friendbot, [urlFriendbotTestnet(DIRECCION)]);
  assert.equal(esLlamadaTestnet(friendbot[0] ?? "", "friendbot.stellar.org"), true);
  assert.equal(llamadas.some((url) => url.includes("mainnet") || url.includes("horizon.stellar.org/")), false);
});

test("Friendbot no se llama si Horizon no se puede leer", async () => {
  const llamadas: string[] = [];
  const fetchImpl: typeof fetch = async (input) => {
    llamadas.push(String(input));
    return new Response("no", { status: 500 });
  };
  await assert.rejects(() => asegurarCuentaTestnet(DIRECCION, fetchImpl, async () => {}), /testnet account/);
  assert.equal(llamadas.some((url) => url.includes("friendbot")), false);
});
