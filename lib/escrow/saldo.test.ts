import assert from "node:assert/strict";
import test from "node:test";
import { USDC } from "@/lib/integrante/identidades";
import { alcanza, conReserva, faltaParaCrear, leerSaldoUsdc, rechazoSiFondos, redStellar, saldoCreacion, saldoUsdcDe, sumarMontos, urlHorizon, usarLectorSaldo } from "./saldo";

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
  const avisoCorto = await corto!.json().then((cuerpo: { aviso: string }) => cuerpo.aviso);
  assert.match(avisoCorto, /US\$11/);
  assert.equal(avisoCorto.includes("USDC"), false);
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

test("crear un evento no pide el alta si el saldo no cubre el total más la reserva", async () => {
  assert.equal(faltaParaCrear(null, "30"), null);
  assert.equal(faltaParaCrear("0", "0"), null);
  assert.deepEqual(faltaParaCrear("10", "30"), { necesario: "31", reserva: "1" });
  assert.equal(faltaParaCrear("31", "30"), null);
  assert.equal(faltaParaCrear("31.5", "30"), null);
  const cuenta = "G".padEnd(56, "A");
  assert.equal(await saldoCreacion("no-es-cuenta", async () => ({ saldo: "1" })), null);
  assert.equal(await saldoCreacion(cuenta, async () => ({ saldo: "4" })), "4");
  assert.equal(await saldoCreacion(cuenta, async () => ({ saldo: null })), null);
  assert.equal(
    await saldoCreacion(cuenta, async () => {
      throw new Error("red");
    }),
    null,
  );
});

test("Horizon 404 es una cuenta que no está en la red", async () => {
  const lectura = await leerSaldoUsdc("GABC", async () => new Response("missing", { status: 404 }));
  assert.equal(lectura.saldo, null);
});
