import assert from "node:assert/strict";
import test from "node:test";
import { USDC } from "@/lib/integrante/identidades";
import { alcanza, conReserva, leerSaldoUsdc, rechazoSiFondos, redStellar, saldoUsdcDe, sumarMontos, urlHorizon, usarLectorSaldo } from "./saldo";

test("la red sigue en testnet salvo HYTO_STELLAR_NETWORK", () => {
  assert.equal(redStellar({ ...process.env, HYTO_STELLAR_NETWORK: "" }), "testnet");
  assert.equal(redStellar({ ...process.env, HYTO_STELLAR_NETWORK: "public" }), "public");
  assert.match(urlHorizon("GABC", { ...process.env, HYTO_STELLAR_NETWORK: "" }), /horizon-testnet\.stellar\.org\/accounts\/GABC/);
});

test("el saldo USDC suma la reserva y compara en unidades", () => {
  assert.equal(sumarMontos(["20", "15"]), "35");
  assert.equal(conReserva("35"), "36");
  assert.equal(alcanza("36", "36"), true);
  assert.equal(alcanza("35.9", "36"), false);
  assert.equal(
    saldoUsdcDe({ balances: [{ balance: "2.5", asset_code: "USDC", asset_issuer: USDC.issuer }, { balance: "9", asset_code: "XLM" }] }),
    "2.5",
  );
});

test("rechazoSiFondos pide wallet, red y saldo", async () => {
  assert.equal((await rechazoSiFondos("no-es-cuenta", "1", async () => ({ saldo: "10" })))?.status, 400);
  assert.equal((await rechazoSiFondos("G".padEnd(56, "A"), "1", async () => ({ saldo: null })))?.status, 400);
  const corto = await rechazoSiFondos("G".padEnd(56, "A"), "10", async () => ({ saldo: "10" }));
  assert.equal(corto?.status, 400);
  assert.match(await corto!.json().then((cuerpo: { aviso: string }) => cuerpo.aviso), /11 USDC/);
  assert.equal(await rechazoSiFondos("G".padEnd(56, "A"), "10", async () => ({ saldo: "11" })), null);
  usarLectorSaldo(async () => {
    throw new Error("red");
  });
  try {
    assert.equal((await rechazoSiFondos("G".padEnd(56, "A"), "1"))?.status, 503);
  } finally {
    usarLectorSaldo(null);
  }
});

test("Horizon 404 es una cuenta que no está en la red", async () => {
  const lectura = await leerSaldoUsdc("GABC", async () => new Response("missing", { status: 404 }));
  assert.equal(lectura.saldo, null);
});
