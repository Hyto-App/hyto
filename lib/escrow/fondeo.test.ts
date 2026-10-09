import assert from "node:assert/strict";
import test from "node:test";
import { Networks, TransactionBuilder, nativeToScVal } from "@stellar/stellar-sdk";
import { crearMemoria } from "@/lib/db/memoria";
import { asegurarSemilla } from "@/lib/db/semilla";
import type { SesionFila } from "@/lib/db/tipos";
import { prepararFirmaHttp } from "@/lib/api/firma";
import { reiniciarLimite } from "./limite";
import { USDC_SAC_TESTNET } from "./desplegar";
import { AVISO_YA_FONDEADO, CODIGO_YA_FONDEADO, aplicarSaldoRed, balanceNumerico, hayFondos } from "./fondeo";
import { CONTRATO_XDR } from "./prueba-xdr";
import { escrowFondeado, botonesRevision } from "@/lib/admin/remoto";
import type { TareaAdmin } from "@/lib/admin/tipos";
import { completarEscrow, saldoDeSimulacion, saldoTokenEnTestnet, unidadesDeRetval, usarLectorSaldoRed } from "./saldo-red";

const RETVAL_022 = nativeToScVal(2_200_000n, { type: "i128" }).toXDR("base64");

test("0,22 USDC en la red cuenta como presupuesto bloqueado aunque el indexador diga cero", () => {
  assert.equal(unidadesDeRetval(RETVAL_022), 0.22);
  assert.equal(saldoDeSimulacion({ result: { results: [{ retval: RETVAL_022 }] } }), 0.22);
  assert.equal(saldoDeSimulacion({ result: { results: [{ xdr: RETVAL_022 }] } }), 0.22);
  assert.equal(saldoDeSimulacion({ result: { error: "missing" } }), null);
  assert.equal(balanceNumerico(0), 0);
  assert.equal(balanceNumerico("0.22"), 0.22);

  const vacio = { contractId: CONTRATO_XDR, balance: 0 };
  const conRed = aplicarSaldoRed(vacio, 0.22);
  assert.equal(conRed.balance, 0.22);
  assert.equal(aplicarSaldoRed({ balance: 1 }, 0.22).balance, 1);
  assert.equal(aplicarSaldoRed(vacio, 0).balance, 0);
  assert.equal(aplicarSaldoRed(vacio, null).balance, 0);
  assert.equal(hayFondos(0, 0.22), true);
  assert.equal(hayFondos(0, 0), false);
  assert.equal(hayFondos(0, null), false);

  assert.equal(escrowFondeado({ escrow: conRed }), true);
  const botones = botonesRevision(tarea(), true, { contrato: CONTRATO_XDR, fondeado: true });
  assert.equal(botones.fondear, false);
  assert.equal(botones.pagar, true);
  assert.equal(botonesRevision(tarea(), true, { contrato: CONTRATO_XDR, fondeado: false }).fondear, true);
});

test("la lectura del saldo en testnet simula balance y no firma ni envía", async () => {
  const metodos: string[] = [];
  const fetchImpl: typeof fetch = async (_input, init) => {
    const cuerpo = JSON.parse(String(init?.body)) as { method?: string; params?: { transaction?: string } };
    metodos.push(cuerpo.method ?? "");
    if (cuerpo.method === "getLatestLedger") return Response.json({ result: { sequence: 12 } });
    const tx = TransactionBuilder.fromXDR(cuerpo.params?.transaction ?? "", Networks.TESTNET);
    assert.equal("signatures" in tx ? tx.signatures.length : 0, 0);
    return Response.json({ result: { results: [{ xdr: RETVAL_022 }] } });
  };
  assert.equal(await saldoTokenEnTestnet(USDC_SAC_TESTNET, CONTRATO_XDR, fetchImpl), 0.22);
  assert.deepEqual(metodos, ["getLatestLedger", "simulateTransaction"]);
});

test("completar el escrow usa el saldo de la red solo cuando Trustless no ve fondos", async () => {
  let lecturas = 0;
  usarLectorSaldoRed(async () => {
    lecturas += 1;
    return 0.22;
  });
  try {
    const ya = await completarEscrow({ contractId: CONTRATO_XDR, balance: 1 });
    assert.equal(ya.balance, 1);
    assert.equal(lecturas, 0);
    const reconciliado = await completarEscrow({ contractId: CONTRATO_XDR, balance: 0 });
    assert.equal(reconciliado.balance, 0.22);
    assert.equal(lecturas, 1);
    usarLectorSaldoRed(async () => null);
    const sinRed = await completarEscrow({ contractId: CONTRATO_XDR, balance: 0 });
    assert.equal(sinRed.balance, 0);
  } finally {
    usarLectorSaldoRed(null);
  }
});

test("preparar el fondeo se niega si la red ya tiene el token", async () => {
  reiniciarLimite();
  const almacen = crearMemoria();
  await asegurarSemilla(almacen);
  await almacen.asignarOrganizador("zeek", "organizador");
  await almacen.actualizarTarea("stand", { contratoEscrow: CONTRATO_XDR });
  const clave = process.env.TRUSTLESS_API_KEY;
  process.env.TRUSTLESS_API_KEY = "clave-de-prueba";
  const original = globalThis.fetch;
  const urls: string[] = [];
  globalThis.fetch = async (input) => {
    const url = String(input);
    urls.push(url);
    if (url.includes(`/escrow/multi-release/v2/${CONTRATO_XDR}`)) {
      return Response.json({ contractId: CONTRATO_XDR, balance: 0, trustline: { contractId: USDC_SAC_TESTNET, symbol: "USDC" } });
    }
    throw new Error(`no hay que preparar otro fondeo: ${url}`);
  };
  usarLectorSaldoRed(async () => 0.22);
  try {
    const respuesta = await prepararFirmaHttp(
      sesion(),
      new Request("http://local/api/firma", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          accion: "fondear",
          tareaId: "stand",
          contrato: CONTRATO_XDR,
          firmante: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
          monto: 20,
        }),
      }),
      almacen,
    );
    assert.equal(respuesta.status, 409);
    const cuerpo = (await respuesta.json()) as { aviso?: string; codigo?: string };
    assert.equal(cuerpo.codigo, CODIGO_YA_FONDEADO);
    assert.equal(cuerpo.aviso, AVISO_YA_FONDEADO);
    assert.equal(urls.some((url) => url.endsWith("/fund")), false);
  } finally {
    usarLectorSaldoRed(null);
    globalThis.fetch = original;
    if (clave === undefined) delete process.env.TRUSTLESS_API_KEY;
    else process.env.TRUSTLESS_API_KEY = clave;
    reiniciarLimite();
  }
});

function sesion(): SesionFila {
  return {
    token: "tok",
    email: "organizador@demo.hyto",
    usuarioId: "organizador",
    rol: "organizador",
    expiraEn: new Date(Date.now() + 60_000).toISOString(),
    wallet: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
  };
}

function tarea(): TareaAdmin {
  return {
    id: "stand",
    titulo: "Set up the booth",
    tipo: "trabajo",
    monto: "0.22",
    tope: null,
    condicion: "Banner",
    miembroId: "voluntario-1",
    miembro: "Volunteer 1",
    estado: "en revisión",
    veredicto: "cumplió",
    nota: null,
    frase: null,
    origen: "scout",
    codigo: null,
    montoRevisado: null,
    montoConfirmado: null,
    fecha: null,
    hashPago: null,
    credencialUrl: null,
  };
}
