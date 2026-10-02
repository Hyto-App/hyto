import assert from "node:assert/strict";
import test from "node:test";
import { USDC } from "../integrante/identidades";
import { AVISO_HORIZON_RECEPTOR, AVISO_RECEPTOR_NO_LISTO, CODIGO_HORIZON_RECEPTOR, CODIGO_RECEPTOR_NO_LISTO } from "./receptorAvisos";
import { estadoReceptorUsdc, respuestaReceptor } from "./receptor";

const RECEPTOR = "GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB";
const URL = `https://horizon-testnet.stellar.org/accounts/${RECEPTOR}`;

function cuenta(balances: Record<string, string>[]): Response {
  return new Response(JSON.stringify({ balances }), { status: 200 });
}

test("the payout account must exist on testnet and hold the USDC trustline", async () => {
  const vistas: string[] = [];
  const listo = await estadoReceptorUsdc(RECEPTOR, async (input, init) => {
    vistas.push(String(input));
    assert.ok(init?.signal);
    return cuenta([{ asset_code: "USDC", asset_issuer: USDC.issuer, balance: "0" }]);
  });
  assert.deepEqual(listo, { listo: true });
  assert.deepEqual(vistas, [URL]);

  const ausente = await estadoReceptorUsdc(RECEPTOR, async () => new Response("missing", { status: 404 }));
  assert.equal(ausente.listo, false);
  if (ausente.listo) return;
  assert.equal(ausente.codigo, CODIGO_RECEPTOR_NO_LISTO);
  assert.equal(ausente.aviso, AVISO_RECEPTOR_NO_LISTO);

  const sinLinea = await estadoReceptorUsdc(
    RECEPTOR,
    async () => cuenta([{ asset_code: "USDC", asset_issuer: "GOTROEMISOR", balance: "5" }, { asset_type: "native", balance: "2" }]),
  );
  assert.equal(sinLinea.listo, false);
  if (!sinLinea.listo) assert.equal(sinLinea.codigo, CODIGO_RECEPTOR_NO_LISTO);
});

test("a Horizon outage is retryable and does not say the payout account is missing", async () => {
  const caido = await estadoReceptorUsdc(RECEPTOR, async () => new Response("down", { status: 502 }));
  const tiempo = await estadoReceptorUsdc(RECEPTOR, async () => {
    throw new DOMException("The operation was aborted due to timeout", "TimeoutError");
  });
  const roto = await estadoReceptorUsdc(RECEPTOR, async () => new Response("not-json", { status: 200 }));

  for (const estado of [caido, tiempo, roto]) {
    assert.equal(estado.listo, false);
    if (estado.listo) continue;
    assert.equal(estado.codigo, CODIGO_HORIZON_RECEPTOR);
    assert.equal(estado.aviso, AVISO_HORIZON_RECEPTOR);
    assert.equal(estado.aviso.includes("isn't ready"), false);
    const respuesta = respuestaReceptor(estado);
    assert.equal(respuesta.status, 503);
    assert.deepEqual(await respuesta.json(), { aviso: AVISO_HORIZON_RECEPTOR, codigo: CODIGO_HORIZON_RECEPTOR });
  }

  const falta = respuestaReceptor({ listo: false, codigo: CODIGO_RECEPTOR_NO_LISTO, aviso: AVISO_RECEPTOR_NO_LISTO });
  assert.equal(falta.status, 409);
});
