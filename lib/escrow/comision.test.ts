import assert from "node:assert/strict";
import test from "node:test";
import { CONTRATO_XDR, FIRMANTE_XDR, xdrDeInvocacion } from "./prueba-xdr";
import { AVISO_XLM_COMISION, CODIGO_XLM_COMISION, HORIZON_TESTNET, comisionDeXdr, rechazoSiComision, xlmDisponible } from "./comision";

const CUENTA = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

test("la comisión sale del XDR de testnet y un fee-bump no cuenta", () => {
  const xdr = xdrDeInvocacion({ contrato: CONTRATO_XDR, funcion: "release_funds", firmante: FIRMANTE_XDR });
  assert.equal(comisionDeXdr(xdr), 100n);
  assert.equal(comisionDeXdr("AAAA"), null);
});

test("una cuenta Cavos con 0 XLM no puede pagar la comisión", () => {
  assert.equal(
    xlmDisponible({
      balances: [{ asset_type: "native", balance: "0.0000000" }],
      subentry_count: 1,
      num_sponsoring: 0,
      num_sponsored: 1,
    }),
    0n,
  );
  assert.equal(xlmDisponible({ balances: [{ asset_type: "native", balance: "0.0000000" }] }), 0n);
  assert.ok(
    (xlmDisponible({
      balances: [{ asset_type: "native", balance: "10000.0000000" }],
      subentry_count: 0,
      num_sponsoring: 0,
      num_sponsored: 0,
    }) ?? 0n) > 100n,
  );
  assert.equal(xlmDisponible({ balances: [{ asset_type: "credit_alphanum4", balance: "5.0000000" }] }), null);
});

test("el preflight lee solo Horizon de testnet y frena una cuenta sin saldo", async () => {
  const urls: string[] = [];
  const respuesta = await rechazoSiComision(CUENTA, undefined, async (input) => {
    urls.push(String(input));
    return new Response(
      JSON.stringify({
        balances: [{ asset_type: "native", balance: "0.0000000" }],
        subentry_count: 0,
        num_sponsoring: 0,
        num_sponsored: 0,
      }),
      { status: 200 },
    );
  });
  assert.equal(respuesta?.status, 409);
  const cuerpo = (await respuesta?.json()) as { aviso: string; codigo: string };
  assert.equal(cuerpo.codigo, CODIGO_XLM_COMISION);
  assert.equal(cuerpo.aviso, AVISO_XLM_COMISION);
  assert.equal(urls.length, 1);
  assert.equal(urls[0]?.startsWith(`${HORIZON_TESTNET}/accounts/`), true);
  assert.equal(urls.some((url) => url.includes("horizon.stellar.org") && !url.includes("horizon-testnet")), false);
});

test("con saldo de sobra el preflight deja firmar", async () => {
  const xdr = xdrDeInvocacion({
    contrato: CONTRATO_XDR,
    funcion: "fund",
    firmante: FIRMANTE_XDR,
  });
  const respuesta = await rechazoSiComision(CUENTA, xdr, async () => {
    return new Response(
      JSON.stringify({
        balances: [{ asset_type: "native", balance: "10.0000000" }],
        subentry_count: 0,
        num_sponsoring: 0,
        num_sponsored: 0,
      }),
      { status: 200 },
    );
  });
  assert.equal(respuesta, null);
});
