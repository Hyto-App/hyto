import assert from "node:assert/strict";
import test from "node:test";
import { USDC } from "./identidades";
import type { BilleteraCobro } from "./tipos";
import { asegurarCobroUsdc, consultarUsdc, cuentaTieneUsdc } from "./usdc";

function billetera(status: BilleteraCobro["status"]): BilleteraCobro & { llamadas: string[] } {
  const llamadas: string[] = [];
  return {
    address: "GDEMOACCOUNTADDRESS234567890123456789012345678901234",
    status,
    llamadas,
    async execute() {
      llamadas.push("execute");
      return "hash";
    },
    async addTrustline(asset) {
      llamadas.push(`trustline:${asset.code}:${asset.issuer}`);
      return "hash";
    },
  };
}

test("una cuenta nueva se crea y abre USDC", async () => {
  const cuenta = billetera("undeployed");
  const lista = await asegurarCobroUsdc(cuenta, async () => false);
  assert.deepEqual(cuenta.llamadas, ["execute", `trustline:${USDC.code}:${USDC.issuer}`]);
  assert.equal(lista.usdcListo, true);
  assert.equal(lista.direccion, cuenta.address);
});

test("si USDC ya está abierto no se vuelve a pedir", async () => {
  const cuenta = billetera("ready");
  const lista = await asegurarCobroUsdc(cuenta, async () => true);
  assert.deepEqual(cuenta.llamadas, []);
  assert.equal(lista.usdcListo, true);
});

test("una cuenta creada sin USDC solo abre el cobro", async () => {
  const cuenta = billetera("ready");
  await asegurarCobroUsdc(cuenta, async () => false);
  assert.deepEqual(cuenta.llamadas, [`trustline:${USDC.code}:${USDC.issuer}`]);
});

test("sin permiso de firma no se crea ni se abre USDC", async () => {
  const cuenta = billetera("needs-device-approval");
  const lista = await asegurarCobroUsdc(cuenta, async () => false);
  assert.deepEqual(cuenta.llamadas, []);
  assert.equal(lista.usdcListo, false);
  assert.equal(lista.direccion.startsWith("G"), true);
});

test("si el pago de despliegue falla pero la cuenta quedó creada, igual se abre USDC", async () => {
  const cuenta = billetera("undeployed");
  cuenta.execute = async () => {
    cuenta.llamadas.push("execute");
    cuenta.status = "ready";
    throw new Error("op_underfunded");
  };
  const lista = await asegurarCobroUsdc(cuenta, async () => false);
  assert.deepEqual(cuenta.llamadas, ["execute", `trustline:${USDC.code}:${USDC.issuer}`]);
  assert.equal(lista.usdcListo, true);
});

test("si la cuenta no llega a crearse, el error sigue", async () => {
  const cuenta = billetera("undeployed");
  cuenta.execute = async () => {
    cuenta.llamadas.push("execute");
    throw new Error("sin relayer");
  };
  await assert.rejects(() => asegurarCobroUsdc(cuenta, async () => false), /sin relayer/);
  assert.deepEqual(cuenta.llamadas, ["execute"]);
});

test("horizon sin la cuenta no cuenta como USDC y un error no se toma como saldo vacío", async () => {
  const ausente: typeof fetch = async (input) => {
    assert.equal(String(input), "https://horizon-testnet.stellar.org/accounts/GDEMO");
    return new Response("no", { status: 404 });
  };
  assert.equal(await consultarUsdc("GDEMO", ausente), false);

  const caido: typeof fetch = async () => new Response("no", { status: 500 });
  await assert.rejects(() => consultarUsdc("GDEMO", caido), /No se pudo leer la cuenta/);

  const red: typeof fetch = async () => {
    throw new Error("red");
  };
  await assert.rejects(() => consultarUsdc("GDEMO", red), /No se pudo leer la cuenta/);
});

test("el saldo de USDC del emisor de testnet cuenta como listo", () => {
  assert.equal(
    cuentaTieneUsdc({
      balances: [
        { asset_code: "USDC", asset_issuer: "GOTRO" },
        { asset_code: "USDC", asset_issuer: USDC.issuer },
      ],
    }),
    true,
  );
  assert.equal(cuentaTieneUsdc({ balances: [{ asset_code: "XLM" }] }), false);
  assert.equal(cuentaTieneUsdc(null), false);
});
