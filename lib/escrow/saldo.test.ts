import assert from "node:assert/strict";
import test from "node:test";
import { USDC } from "@/lib/integrante/identidades";
import { alcanza, conDosDecimales, conReserva, faltaParaBloquear, faltaParaCrear, leerSaldoUsdc, rechazoSiFondos, redStellar, saldoCreacion, saldoUsdcDe, sumarMontos, urlHorizon, usarLectorSaldo } from "./saldo";

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
  assert.match(avisoCorto, /US\$11\.00/);
  assert.match(avisoCorto, /You are short US\$1\.00/);
  assert.equal(/US\$11(?!\.00)/.test(avisoCorto), false);
  assert.equal(avisoCorto.includes("USDC"), false);
  const tope = await rechazoSiFondos("G".padEnd(56, "A"), "39.60", async () => ({ saldo: "1.30" }));
  const avisoTope = await tope!.json().then((cuerpo: { aviso: string }) => cuerpo.aviso);
  assert.match(avisoTope, /US\$40\.60/);
  assert.match(avisoTope, /US\$1\.00 reserve/);
  assert.match(avisoTope, /You are short US\$39\.30/);
  assert.equal(/US\$40\.6(?!0)/.test(avisoTope), false);
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
  assert.deepEqual(faltaParaCrear("10", "30"), { necesario: "31.00", reserva: "1.00", falta: "21.00" });
  assert.equal(faltaParaCrear("31", "30"), null);
  assert.deepEqual(faltaParaBloquear("1.30", "39.60"), { necesario: "40.60", reserva: "1.00", falta: "39.30" });
  assert.equal(faltaParaBloquear("40.60", "39.60"), null);
  assert.equal(conDosDecimales("40.6"), "40.60");
  assert.equal(conDosDecimales("1"), "1.00");
  assert.equal(conDosDecimales("39.30"), "39.30");
  assert.equal(conDosDecimales("no"), null);
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
  assert.equal(lectura.puedeRecibir, false);
});

test("una cuenta en la red sin línea de cobro no puede recibir, aunque el saldo clásico diga 0", async () => {
  const sinLinea = await leerSaldoUsdc("GABC", async () => Response.json({ balances: [{ balance: "10", asset_type: "native" }] }));
  assert.equal(sinLinea.puedeRecibir, false);
  assert.equal(sinLinea.saldo, "0");

  const enCero = await leerSaldoUsdc(
    "GABC",
    async () =>
      Response.json({
        balances: [
          { balance: "10", asset_type: "native" },
          { balance: "0.0000000", asset_code: USDC.code, asset_issuer: USDC.issuer },
        ],
      }),
  );
  assert.equal(enCero.puedeRecibir, true);
  assert.equal(enCero.saldo, "0.0000000");
});
