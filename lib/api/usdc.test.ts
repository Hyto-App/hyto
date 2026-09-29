import assert from "node:assert/strict";
import test from "node:test";
import {
  Account,
  Asset,
  BASE_FEE,
  Keypair,
  Networks,
  Operation,
  Transaction,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import type { SesionFila } from "../db/tipos";
import { USDC } from "../integrante/identidades";
import { armarXdrUsdc, HORIZON_TESTNET, xdrEsTrustlineUsdc } from "../integrante/trustline";
import {
  AVISO_USDC_DEMO,
  AVISO_USDC_ENVIO,
  AVISO_USDC_SIN_CUENTA,
  AVISO_USDC_SIN_WALLET,
  AVISO_USDC_XDR,
  leerUsdcHttp,
  publicarUsdcHttp,
} from "./usdc";

const OTRO = "G" + "B".repeat(55);

function sesion(wallet: string, email = "ana@hyto.app", rol: SesionFila["rol"] = "voluntario"): SesionFila {
  return {
    token: "tok",
    email,
    usuarioId: "ana",
    rol,
    expiraEn: new Date(Date.now() + 60_000).toISOString(),
    wallet,
  };
}

function pedido(cuerpo: unknown): Request {
  return new Request("http://local/api/usdc", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(cuerpo),
  });
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function firmar(xdr: string, clave: Keypair, red = Networks.TESTNET): string {
  const tx = TransactionBuilder.fromXDR(xdr, red);
  tx.sign(clave);
  return tx.toXDR();
}

function cuenta(sequence = "7", balances: unknown[] = []): Response {
  return json({ sequence, balances });
}

test("el XDR de testnet abre USDC y una firma de otra red no vale", () => {
  const clave = Keypair.random();
  const wallet = clave.publicKey();
  const xdr = firmar(armarXdrUsdc(wallet, "4"), clave);
  assert.equal(xdrEsTrustlineUsdc(xdr, wallet), true);
  const publico = new TransactionBuilder(new Account(wallet, "4"), { fee: BASE_FEE, networkPassphrase: Networks.PUBLIC })
    .addOperation(Operation.changeTrust({ asset: new Asset(USDC.code, USDC.issuer) }))
    .setTimeout(30)
    .build();
  publico.sign(clave);
  assert.equal(xdrEsTrustlineUsdc(publico.toXDR(), wallet), false);
  assert.equal(xdrEsTrustlineUsdc(xdr, OTRO), false);
});

test("una sesión demo no prepara ni consulta USDC", async () => {
  const clave = Keypair.random();
  const demo = sesion(clave.publicKey(), "demo-voluntario@hyto.demo");
  let llamadas = 0;
  const fetchImpl: typeof fetch = async () => {
    llamadas += 1;
    return cuenta();
  };
  const lectura = await leerUsdcHttp(demo, fetchImpl);
  const alta = await publicarUsdcHttp(demo, pedido({ accion: "preparar", wallet: OTRO }), fetchImpl);
  assert.equal(lectura.status, 403);
  assert.equal(alta.status, 403);
  assert.equal((await alta.json()).aviso, AVISO_USDC_DEMO);
  assert.equal(llamadas, 0);
});

test("preparar arma el changeTrust de la wallet de la sesión e ignora otra cuenta", async () => {
  const clave = Keypair.random();
  const wallet = clave.publicKey();
  const urls: string[] = [];
  const fetchImpl: typeof fetch = async (input) => {
    urls.push(String(input));
    return cuenta("11");
  };
  const respuesta = await publicarUsdcHttp(
    sesion(wallet, "org@hyto.app", "organizador"),
    pedido({ accion: "preparar", wallet: OTRO }),
    fetchImpl,
  );
  assert.equal(respuesta.status, 200);
  const cuerpo = (await respuesta.json()) as { xdr?: string };
  assert.equal(typeof cuerpo.xdr, "string");
  const tx = TransactionBuilder.fromXDR(cuerpo.xdr ?? "", Networks.TESTNET);
  assert.ok(tx instanceof Transaction);
  assert.equal(tx.source, wallet);
  assert.equal(tx.operations.length, 1);
  assert.equal(tx.operations[0]?.type, "changeTrust");
  assert.ok(urls.every((url) => url.startsWith(`${HORIZON_TESTNET}/accounts/${wallet}`)));
  assert.ok(urls.every((url) => !url.includes(OTRO)));
});

test("si USDC ya está abierto no hay XDR para firmar", async () => {
  const clave = Keypair.random();
  const fetchImpl: typeof fetch = async () =>
    cuenta("1", [{ asset_code: "USDC", asset_issuer: USDC.issuer }]);
  const lectura = await leerUsdcHttp(sesion(clave.publicKey()), fetchImpl);
  const alta = await publicarUsdcHttp(sesion(clave.publicKey()), pedido({ accion: "preparar" }), fetchImpl);
  assert.equal((await lectura.json()).listo, true);
  assert.deepEqual(await alta.json(), { listo: true });
});

test("sin cuenta en testnet no se arma la trustline", async () => {
  const clave = Keypair.random();
  const fetchImpl: typeof fetch = async () => new Response("missing", { status: 404 });
  const respuesta = await publicarUsdcHttp(sesion(clave.publicKey()), pedido({ accion: "preparar" }), fetchImpl);
  assert.equal(respuesta.status, 400);
  assert.equal((await respuesta.json()).aviso, AVISO_USDC_SIN_CUENTA);
  const vacia = await publicarUsdcHttp(sesion(""), pedido({ accion: "preparar" }), fetchImpl);
  assert.equal(vacia.status, 400);
  assert.equal((await vacia.json()).aviso, AVISO_USDC_SIN_WALLET);
});

test("el envío solo acepta el changeTrust firmado por la wallet de la sesión", async () => {
  const clave = Keypair.random();
  const wallet = clave.publicKey();
  const ajena = Keypair.random();
  const firmado = firmar(armarXdrUsdc(wallet, "9"), clave);
  const pago = new TransactionBuilder(new Account(wallet, "9"), { fee: BASE_FEE, networkPassphrase: Networks.TESTNET })
    .addOperation(Operation.payment({ destination: ajena.publicKey(), asset: Asset.native(), amount: "1" }))
    .setTimeout(30)
    .build();
  pago.sign(clave);
  const otroActivo = new TransactionBuilder(new Account(wallet, "9"), { fee: BASE_FEE, networkPassphrase: Networks.TESTNET })
    .addOperation(Operation.changeTrust({ asset: new Asset("USDC", ajena.publicKey()) }))
    .setTimeout(30)
    .build();
  otroActivo.sign(clave);
  const cierre = new TransactionBuilder(new Account(wallet, "9"), { fee: BASE_FEE, networkPassphrase: Networks.TESTNET })
    .addOperation(Operation.changeTrust({ asset: new Asset(USDC.code, USDC.issuer), limit: "0" }))
    .setTimeout(30)
    .build();
  cierre.sign(clave);
  const deOtro = firmar(armarXdrUsdc(ajena.publicKey(), "9"), ajena);
  const interno = TransactionBuilder.fromXDR(firmado, Networks.TESTNET);
  assert.ok(interno instanceof Transaction);
  const bump = TransactionBuilder.buildFeeBumpTransaction(clave, "200", interno, Networks.TESTNET);
  bump.sign(clave);

  const urls: string[] = [];
  const fetchImpl: typeof fetch = async (input) => {
    const url = String(input);
    urls.push(url);
    assert.equal(url, `${HORIZON_TESTNET}/transactions`);
    return json({ hash: "ab".repeat(32), successful: true });
  };

  for (const xdr of [pago.toXDR(), otroActivo.toXDR(), cierre.toXDR(), deOtro, bump.toXDR(), "no-es-xdr"]) {
    const mal = await publicarUsdcHttp(sesion(wallet), pedido({ accion: "enviar", xdr, wallet: OTRO }), fetchImpl);
    assert.equal(mal.status, 400);
    assert.equal((await mal.json()).aviso, AVISO_USDC_XDR);
  }
  assert.equal(urls.length, 0);

  const bien = await publicarUsdcHttp(sesion(wallet), pedido({ accion: "enviar", xdr: firmado }), fetchImpl);
  assert.equal(bien.status, 200);
  assert.equal((await bien.json()).hash, "ab".repeat(32));
  assert.deepEqual(urls, [`${HORIZON_TESTNET}/transactions`]);

  const fallo = await publicarUsdcHttp(sesion(wallet), pedido({ accion: "enviar", xdr: firmado }), async () => json({ title: "no" }, 400));
  assert.equal(fallo.status, 502);
  assert.equal((await fallo.json()).aviso, AVISO_USDC_ENVIO);
});
