import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { Address, Keypair, xdr } from "@stellar/stellar-sdk";
import type { SesionFila } from "../db/tipos";
import { crearMemoria } from "../db/memoria";
import { asegurarSemilla } from "../db/semilla";
import { reiniciarLimite } from "../escrow/limite";
import { USDC } from "../integrante/identidades";
import { CONTRATO_XDR, FIRMANTE_XDR, xdrDeInvocacion } from "../escrow/prueba-xdr";
import {
  AVISO_FEE_AUSENTE,
  AVISO_FEE_DISTINTA,
  AVISO_FEE_HORIZON,
  AVISO_FEE_ILEGIBLE,
  AVISO_FEE_SIN_TRUSTLINE,
  CODIGO_FEE_DISTINTA,
  CODIGO_FEE_SIN_TRUSTLINE,
} from "../escrow/fee";
import { enviarFirmaHttp, huellaDeXdr, prepararFirmaHttp } from "./firma";
import { emitirTokenPreparado } from "./preparado";

const SECRETO = "hyto-token-secret-for-tests-32ch";
const FEE = Keypair.fromRawEd25519Seed(new Uint8Array(32).fill(11)).publicKey();
const OTRA = Keypair.fromRawEd25519Seed(new Uint8Array(32).fill(12)).publicKey();
const RECEPTOR = Keypair.fromRawEd25519Seed(new Uint8Array(32).fill(8)).publicKey();
const USDC_LINEA = { asset_code: "USDC", asset_issuer: USDC.issuer, balance: "1" };

let secretoPrevio: string | undefined;
let feePrevio: string | undefined;
let clavePrevia: string | undefined;

before(() => {
  secretoPrevio = process.env.HYTO_TOKEN_SECRET;
  feePrevio = process.env.HYTO_TRUSTLESS_FEE;
  clavePrevia = process.env.TRUSTLESS_API_KEY;
  process.env.HYTO_TOKEN_SECRET = SECRETO;
  process.env.TRUSTLESS_API_KEY = "clave-de-prueba";
});

after(() => {
  restaurar("HYTO_TOKEN_SECRET", secretoPrevio);
  restaurar("HYTO_TRUSTLESS_FEE", feePrevio);
  restaurar("TRUSTLESS_API_KEY", clavePrevia);
});

function restaurar(nombre: "HYTO_TOKEN_SECRET" | "HYTO_TRUSTLESS_FEE" | "TRUSTLESS_API_KEY", valor: string | undefined) {
  if (valor === undefined) delete process.env[nombre];
  else process.env[nombre] = valor;
}

function sesion(): SesionFila {
  return {
    token: "tok",
    email: "organizador@demo.hyto",
    usuarioId: "organizador",
    rol: "organizador",
    expiraEn: new Date(Date.now() + 60_000).toISOString(),
    wallet: FIRMANTE_XDR,
  };
}

function pedido(cuerpo: unknown): Request {
  return new Request("http://local/api/firma", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(cuerpo),
  });
}

function liberacion(fee: string): string {
  return xdrDeInvocacion({
    contrato: CONTRATO_XDR,
    funcion: "release_funds",
    firmante: FIRMANTE_XDR,
    args: [new Address(FIRMANTE_XDR).toScVal(), new Address(fee).toScVal(), xdr.ScVal.scvVec([xdr.ScVal.scvU32(0)])],
  });
}

async function almacenDe() {
  const almacen = crearMemoria();
  await asegurarSemilla(almacen);
  await almacen.asignarOrganizador("zeek", "organizador");
  await almacen.actualizarTarea("stand", { contratoEscrow: CONTRATO_XDR, walletCobro: RECEPTOR });
  return almacen;
}

function red(xdr: string, balances: unknown[] = [USDC_LINEA]) {
  const llamadas: { url: string; body: Record<string, unknown> | null }[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    const cuerpo = typeof init?.body === "string" ? (JSON.parse(init.body) as Record<string, unknown>) : null;
    llamadas.push({ url, body: cuerpo });
    if (url.includes("horizon-testnet.stellar.org")) return Response.json({ balances });
    if (url.endsWith("/escrow/multi-release/v2/release-funds")) {
      return Response.json({ unsignedXdr: xdr, txHash: "abc" });
    }
    if (url.endsWith("/escrow/multi-release/v2/approve-milestones")) {
      return Response.json({ unsignedXdr: "AAAA", txHash: "apro" });
    }
    if (url.endsWith("/stellar/send-transaction")) {
      return Response.json({ txHash: "ab".repeat(32), ledger: 4, code: "STELLAR_TX_SUBMITTED" });
    }
    if (url.includes(`/escrow/multi-release/v2/${CONTRATO_XDR}`)) {
      return Response.json({ contractId: CONTRATO_XDR, milestones: [{ released: true }] });
    }
    throw new Error(`fetch inesperado: ${url}`);
  };
  return {
    llamadas,
    restaurar() {
      globalThis.fetch = original;
    },
  };
}

test("liberar fija la cuenta del servidor y rechaza otra dirección de fee", async () => {
  reiniciarLimite();
  delete process.env.HYTO_TRUSTLESS_FEE;
  const almacen = await almacenDe();
  const cuerpo = { accion: "liberar", contrato: CONTRATO_XDR, firmante: FIRMANTE_XDR, indice: 0 };
  const sinRed = red(liberacion(FEE));
  try {
    const falta = await prepararFirmaHttp(sesion(), pedido(cuerpo), almacen);
    assert.equal(falta.status, 503);
    assert.equal(((await falta.json()) as { aviso: string }).aviso, AVISO_FEE_AUSENTE);
    assert.equal(sinRed.llamadas.length, 0);

    process.env.HYTO_TRUSTLESS_FEE = FEE;
    const ajena = await prepararFirmaHttp(sesion(), pedido({ ...cuerpo, trustlessWorkAddress: OTRA }), almacen);
    assert.equal(ajena.status, 400);
    const avisoAjena = (await ajena.json()) as { aviso: string; codigo: string };
    assert.equal(avisoAjena.aviso, AVISO_FEE_DISTINTA);
    assert.equal(avisoAjena.codigo, CODIGO_FEE_DISTINTA);
    assert.equal(sinRed.llamadas.length, 0);
  } finally {
    sinRed.restaurar();
    reiniciarLimite();
  }

  reiniciarLimite();
  process.env.HYTO_TRUSTLESS_FEE = FEE;
  const esperada = liberacion(FEE);
  const vista = red(esperada);
  try {
    const lista = await prepararFirmaHttp(sesion(), pedido({ ...cuerpo, trustlessWorkAddress: FEE }), almacen);
    assert.equal(lista.status, 200);
    const json = (await lista.json()) as { xdr: string };
    assert.equal(json.xdr, esperada);
    const pedidoRed = vista.llamadas.find((llamada) => llamada.url.endsWith("/release-funds"));
    assert.ok(pedidoRed);
    assert.equal(pedidoRed.body?.trustlessWorkAddress, undefined);
    assert.equal(pedidoRed.body?.feeAddress, undefined);
    assert.deepEqual(pedidoRed.body, {
      contractId: CONTRATO_XDR,
      releaseSigner: FIRMANTE_XDR,
      milestoneIndexes: [0],
    });
  } finally {
    vista.restaurar();
    reiniciarLimite();
  }

  reiniciarLimite();
  const mala = red(liberacion(OTRA));
  try {
    const respuesta = await prepararFirmaHttp(sesion(), pedido(cuerpo), almacen);
    assert.equal(respuesta.status, 400);
    assert.equal(((await respuesta.json()) as { codigo: string }).codigo, CODIGO_FEE_DISTINTA);
    assert.equal(
      mala.llamadas.some((llamada) => llamada.url.endsWith("/stellar/send-transaction")),
      false,
    );
  } finally {
    mala.restaurar();
    reiniciarLimite();
  }
});

test("sin trustline de USDC liberar explica el error 13 y no llama a Trustless", async () => {
  reiniciarLimite();
  process.env.HYTO_TRUSTLESS_FEE = FEE;
  const almacen = await almacenDe();
  const vista = red(liberacion(FEE), [{ asset_type: "native", balance: "10" }]);
  try {
    const respuesta = await prepararFirmaHttp(
      sesion(),
      pedido({ accion: "liberar", contrato: CONTRATO_XDR, firmante: FIRMANTE_XDR, indice: 0 }),
      almacen,
    );
    assert.equal(respuesta.status, 409);
    const json = (await respuesta.json()) as { aviso: string; codigo: string };
    assert.equal(json.aviso, AVISO_FEE_SIN_TRUSTLINE);
    assert.equal(json.codigo, CODIGO_FEE_SIN_TRUSTLINE);
    assert.match(json.aviso, /error 13/);
    assert.equal(
      vista.llamadas.some((llamada) => llamada.url.includes("trustlesswork.com")),
      false,
    );
  } finally {
    vista.restaurar();
    reiniciarLimite();
  }
});

test("si Horizon no responde, liberar no sigue en silencio", async () => {
  reiniciarLimite();
  process.env.HYTO_TRUSTLESS_FEE = FEE;
  const almacen = await almacenDe();
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response("no", { status: 503 });
  try {
    const respuesta = await prepararFirmaHttp(
      sesion(),
      pedido({ accion: "liberar", contrato: CONTRATO_XDR, firmante: FIRMANTE_XDR, indice: 0 }),
      almacen,
    );
    assert.equal(respuesta.status, 503);
    assert.equal(((await respuesta.json()) as { aviso: string }).aviso, AVISO_FEE_HORIZON);
  } finally {
    globalThis.fetch = original;
    reiniciarLimite();
  }
});

test("un XDR de liberación ilegible no se devuelve para firmar", async () => {
  reiniciarLimite();
  process.env.HYTO_TRUSTLESS_FEE = FEE;
  const almacen = await almacenDe();
  const vista = red("AAAA");
  try {
    const respuesta = await prepararFirmaHttp(
      sesion(),
      pedido({ accion: "liberar", contrato: CONTRATO_XDR, firmante: FIRMANTE_XDR, indice: 0 }),
      almacen,
    );
    assert.equal(respuesta.status, 502);
    const json = (await respuesta.json()) as { aviso: string; xdr?: string };
    assert.equal(json.aviso, AVISO_FEE_ILEGIBLE);
    assert.equal(json.xdr, undefined);
  } finally {
    vista.restaurar();
    reiniciarLimite();
  }
});

test("aprobar no exige la cuenta de fee", async () => {
  reiniciarLimite();
  delete process.env.HYTO_TRUSTLESS_FEE;
  const almacen = await almacenDe();
  const vista = red("AAAA");
  try {
    const respuesta = await prepararFirmaHttp(
      sesion(),
      pedido({ accion: "aprobar", contrato: CONTRATO_XDR, firmante: FIRMANTE_XDR, indice: 0 }),
      almacen,
    );
    assert.equal(respuesta.status, 200);
    assert.equal(((await respuesta.json()) as { xdr: string }).xdr, "AAAA");
  } finally {
    vista.restaurar();
    reiniciarLimite();
  }
});

test("enviar rechaza una liberación firmada con otra cuenta de fee y acepta la del servidor", async () => {
  reiniciarLimite();
  process.env.HYTO_TRUSTLESS_FEE = FEE;
  const almacen = await almacenDe();
  const ajena = liberacion(OTRA);
  const vista = red(ajena);
  try {
    const rechazo = await enviarFirmaHttp(
      sesion(),
      pedido({ xdr: ajena, accion: "liberar", tareaId: "stand" }),
      almacen,
    );
    assert.equal(rechazo.status, 400);
    assert.equal(((await rechazo.json()) as { codigo: string }).codigo, CODIGO_FEE_DISTINTA);
    assert.equal(
      vista.llamadas.some((llamada) => llamada.url.endsWith("/stellar/send-transaction")),
      false,
    );

    const valida = liberacion(FEE);
    const token = emitirTokenPreparado({
      usuarioId: "organizador",
      sesionId: "tok",
      huella: huellaDeXdr(valida),
      accion: "liberar",
      tareaId: "stand",
      monto: "",
    });
    assert.ok(token);
    const enviado = await enviarFirmaHttp(
      sesion(),
      pedido({ xdr: valida, accion: "liberar", tareaId: "stand", token }),
      almacen,
    );
    assert.equal(enviado.status, 200);
    assert.equal(
      vista.llamadas.some((llamada) => llamada.url.endsWith("/stellar/send-transaction")),
      true,
    );
    assert.equal((await almacen.leerTarea("stand"))?.estado, "pagado");
  } finally {
    vista.restaurar();
    reiniciarLimite();
  }
});
