import assert from "node:assert/strict";
import test from "node:test";
import { USDC } from "@/lib/integrante/identidades";
import { HORIZON_TESTNET } from "@/lib/integrante/trustline";
import { alcanza, leerSaldoUsdcHorizon, sumarMontos } from "./saldo";

test("el saldo de USDC se lee en Horizon y se compara con la reserva", async () => {
  assert.equal(alcanza("9", "9"), true);
  assert.equal(alcanza("8.9", sumarMontos(["8", "1"]) ?? ""), false);
  assert.equal(sumarMontos(["8", "15", "1"]), "24");
  let url = "";
  const saldo = await leerSaldoUsdcHorizon("GDEMO", async (input) => {
    url = String(input);
    return new Response(
      JSON.stringify({
        balances: [{ asset_code: USDC.code, asset_issuer: USDC.issuer, balance: "12.5000000" }],
      }),
      { status: 200 },
    );
  });
  assert.equal(saldo, "12.5000000");
  assert.equal(url, `${HORIZON_TESTNET}/accounts/GDEMO`);
  assert.equal(alcanza(saldo, "12.5"), true);
});
