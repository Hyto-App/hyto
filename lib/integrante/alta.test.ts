import assert from "node:assert/strict";
import test from "node:test";
import { AVISO_ALTA_PERSONA, AVISO_ALTA_SIN_CONFIRMAR } from "@/lib/auth/avisoAlta";
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

test("el alta pide Friendbot en el servidor y no llama al relay si la cuenta acaba de nacer", async () => {
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
  assert.deepEqual(alta, { ok: false, aviso: AVISO_ALTA_PERSONA });
  assert.deepEqual(cuenta.llamadas, []);
  assert.equal(llamadas.filter((url) => url.includes("cavos") || url.includes("relay") || url.includes("friendbot")).length, 0);
});

test("sin la clave en este navegador el alta no toca el relay y no pide volver a entrar", async () => {
  const cuenta = billetera("needs-device-approval");
  const fetchImpl: typeof fetch = async (input) => {
    assert.equal(String(input), "/api/sesion/alta");
    return new Response(JSON.stringify({ cuenta: true, friendbot: true, usdc: false }), { status: 200 });
  };
  const alta = await completarAltaTestnet(cuenta, { fetch: fetchImpl });
  assert.deepEqual(alta, { ok: false, aviso: AVISO_ALTA_SIN_CONFIRMAR });
  assert.deepEqual(cuenta.llamadas, []);
  assert.doesNotMatch(AVISO_ALTA_SIN_CONFIRMAR, /Sign in again/i);
});

test("una cuenta ya desplegada sin USDC sí abre el cobro", async () => {
  const cuenta = billetera("ready");
  const fetchImpl: typeof fetch = async (input) => {
    const url = String(input);
    if (url === "/api/sesion/alta") {
      return new Response(JSON.stringify({ cuenta: true, friendbot: false, usdc: false }), { status: 200 });
    }
    if (url.startsWith("https://horizon-testnet.stellar.org/")) return new Response("missing", { status: 404 });
    throw new Error(`fetch inesperado: ${url}`);
  };
  const alta = await completarAltaTestnet(cuenta, { fetch: fetchImpl });
  assert.deepEqual(alta, { ok: true, friendbot: false, trustline: true });
  assert.deepEqual(cuenta.llamadas, [`trustline:${USDC.code}:${USDC.issuer}`]);
});

test("si USDC ya está, Sign up no vuelve a abrir la trustline ni en una cuenta sin desplegar", async () => {
  const cuenta = billetera("undeployed");
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
