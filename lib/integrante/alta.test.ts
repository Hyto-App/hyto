import assert from "node:assert/strict";
import test from "node:test";
import { USDC } from "./identidades";
import type { BilleteraCobro } from "./tipos";
import { completarAltaTestnet } from "./alta";

function billetera(status: BilleteraCobro["status"]): BilleteraCobro & { llamadas: string[] } {
  const llamadas: string[] = [];
  const cuenta: BilleteraCobro & { llamadas: string[] } = {
    address: `G${"B".repeat(55)}`,
    status,
    llamadas,
    async execute() {
      llamadas.push("execute");
      cuenta.status = "ready";
      return "hash";
    },
    async addTrustline(asset) {
      llamadas.push(`trustline:${asset.code}:${asset.issuer}`);
      return "hash";
    },
  };
  return cuenta;
}

test("el alta pide Friendbot en el servidor y abre USDC solo si falta", async () => {
  const cuenta = billetera("undeployed");
  const llamadas: string[] = [];
  const fetchImpl: typeof fetch = async (input) => {
    const url = String(input);
    llamadas.push(url);
    if (url === "/api/sesion/alta") {
      return new Response(JSON.stringify({ cuenta: true, friendbot: true, usdc: false }), { status: 200 });
    }
    if (url.startsWith("https://horizon-testnet.stellar.org/")) return new Response("missing", { status: 404 });
    throw new Error(`fetch inesperado: ${url}`);
  };
  const alta = await completarAltaTestnet(cuenta, { fetch: fetchImpl });
  assert.equal(alta.ok, true);
  if (!alta.ok) return;
  assert.equal(alta.friendbot, true);
  assert.equal(alta.trustline, true);
  assert.deepEqual(cuenta.llamadas, ["execute", `trustline:${USDC.code}:${USDC.issuer}`]);
  assert.equal(llamadas.filter((url) => url.includes("friendbot")).length, 0);
  assert.equal(USDC.issuer, "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5");
});

test("si USDC ya está, Sign up no vuelve a abrir la trustline", async () => {
  const cuenta = billetera("ready");
  const fetchImpl: typeof fetch = async (input) => {
    assert.equal(String(input), "/api/sesion/alta");
    return new Response(JSON.stringify({ cuenta: true, friendbot: false, usdc: true }), { status: 200 });
  };
  const alta = await completarAltaTestnet(cuenta, { fetch: fetchImpl });
  assert.deepEqual(alta, { ok: true, friendbot: false, trustline: false });
  assert.deepEqual(cuenta.llamadas, []);
});

test("sin permiso de alta no se toca la wallet", async () => {
  const cuenta = billetera("undeployed");
  const fetchImpl: typeof fetch = async () =>
    new Response(JSON.stringify({ aviso: "Testnet setup runs only when you sign up." }), { status: 403 });
  const alta = await completarAltaTestnet(cuenta, { fetch: fetchImpl });
  assert.equal(alta.ok, false);
  assert.deepEqual(cuenta.llamadas, []);
});
