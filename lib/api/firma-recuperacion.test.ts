import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import type { SesionFila } from "../db/tipos";
import { crearMemoria } from "../db/memoria";
import { asegurarSemilla } from "../db/semilla";
import { reiniciarLimite } from "../escrow/limite";
import { RPC_TESTNET, hashTestnetDeXdr } from "../escrow/confirmacion";
import { CONTRATO_XDR, FIRMANTE_XDR, xdrDeAlta, xdrDeInvocacion } from "../escrow/prueba-xdr";
import { CODIGO_CONFIRMADO_EN_RED, CODIGO_SIN_CONFIRMAR, enviarFirmaHttp, huellaDeXdr, prepararFirmaHttp } from "./firma";
import { emitirTokenPreparado } from "./preparado";
import { leerRevisionHttp } from "./revision";

const RECEPTOR = "GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB";
const USDC_ISSUER = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
const ENTORNO = ["HYTO_TOKEN_SECRET", "TRUSTLESS_API_KEY", "HYTO_ESCROW_PLATFORM", "HYTO_ESCROW_RESOLVER", "HYTO_ESCROW_ADMIN"];
const previo = new Map<string, string | undefined>();
const fetchOriginal = globalThis.fetch;

before(() => {
  for (const nombre of ENTORNO) previo.set(nombre, process.env[nombre]);
  process.env.HYTO_TOKEN_SECRET = "hyto-token-secret-for-tests-32ch";
  process.env.TRUSTLESS_API_KEY = "clave-de-prueba";
  process.env.HYTO_ESCROW_ADMIN = "GCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC";
  process.env.HYTO_ESCROW_PLATFORM = "GDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD";
  process.env.HYTO_ESCROW_RESOLVER = "GEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE";
});

after(() => {
  globalThis.fetch = fetchOriginal;
  for (const [nombre, valor] of previo) {
    if (valor === undefined) delete process.env[nombre];
    else process.env[nombre] = valor;
  }
});

beforeEach(() => {
  reiniciarLimite();
  globalThis.fetch = fetchOriginal;
});

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

function token(xdr: string, meta: { accion: string; tareaId: string; monto: string; contrato?: string }): string {
  const firmado = emitirTokenPreparado({
    usuarioId: "organizador",
    sesionId: "tok",
    huella: huellaDeXdr(xdr),
    accion: meta.accion,
    tareaId: meta.tareaId,
    monto: meta.monto,
    ...(meta.contrato ? { contrato: meta.contrato } : {}),
  });
  if (!firmado) throw new Error("missing payment secret");
  return firmado;
}

function pedido(cuerpo: unknown): Request {
  return new Request("http://local/api/firma/enviar", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(cuerpo),
  });
}

type Red = {
  envio: () => Response;
  rpc: string[];
  escrow?: () => Response;
};

// Answers like Horizon, Trustless and testnet RPC. `rpc` is the sequence of getTransaction statuses.
function simularRed(red: Red) {
  const visto = { rpc: [] as unknown[], urls: [] as string[], escrow: 0, envios: 0 };
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    visto.urls.push(url);
    if (url.startsWith("https://horizon-testnet.stellar.org")) {
      return Response.json({ balances: [{ balance: "1000", asset_code: "USDC", asset_issuer: USDC_ISSUER }] });
    }
    if (url.endsWith("/stellar/send-transaction")) {
      visto.envios += 1;
      return red.envio();
    }
    if (url === RPC_TESTNET) {
      visto.rpc.push(JSON.parse(String(init?.body)));
      const estado = red.rpc[Math.min(visto.rpc.length - 1, red.rpc.length - 1)] ?? "NOT_FOUND";
      return Response.json({ jsonrpc: "2.0", id: 1, result: { status: estado } });
    }
    if (url.includes("/escrow/multi-release/v2/")) {
      visto.escrow += 1;
      return red.escrow?.() ?? Response.json({ status: 404, code: "ESCROW_NOT_FOUND" }, { status: 404 });
    }
    throw new Error(`fetch inesperado: ${url}`);
  };
  return visto;
}

function caida(): Response {
  throw new TypeError("fetch failed: socket hang up");
}

async function base() {
  const almacen = crearMemoria();
  await asegurarSemilla(almacen);
  await almacen.asignarOrganizador("zeek", "organizador");
  return almacen;
}

const pausasVistas: number[] = [];
const opciones = { sondeo: { esperar: async (ms: number) => void pausasVistas.push(ms) } };

test("the testnet hash of the signed XDR is the prepare fingerprint", () => {
  const alta = xdrDeAlta(FIRMANTE_XDR);
  assert.equal(hashTestnetDeXdr(alta), huellaDeXdr(alta));
  assert.equal(hashTestnetDeXdr("not xdr"), null);
  assert.equal(RPC_TESTNET, "https://soroban-testnet.stellar.org");
});

test("deploy submit throws but the transaction landed: the predicted contract is saved and Lock budget is not offered again", async () => {
  const almacen = await base();
  await almacen.actualizarTarea("registro", { walletCobro: RECEPTOR });
  const visto = simularRed({
    envio: caida,
    rpc: ["NOT_FOUND", "SUCCESS"],
    escrow: () => Response.json({ contractId: CONTRATO_XDR, balance: 0, milestones: [{ released: false }] }),
  });
  const alta = xdrDeAlta(FIRMANTE_XDR);
  const respuesta = await enviarFirmaHttp(
    sesion(),
    pedido({
      xdr: alta,
      accion: "desplegar",
      tareaId: "registro",
      token: token(alta, { accion: "desplegar", tareaId: "registro", monto: "20", contrato: CONTRATO_XDR }),
    }),
    almacen,
    opciones,
  );
  assert.equal(respuesta.status, 200);
  const cuerpo = (await respuesta.json()) as { hash: string; codigo: string; contrato: string; aviso?: string };
  assert.equal(cuerpo.hash, huellaDeXdr(alta));
  assert.equal(cuerpo.codigo, CODIGO_CONFIRMADO_EN_RED);
  assert.equal(cuerpo.contrato, CONTRATO_XDR);
  assert.equal(cuerpo.aviso, undefined);
  assert.equal(visto.envios, 1);
  assert.deepEqual(visto.rpc[0], { jsonrpc: "2.0", id: 1, method: "getTransaction", params: { hash: huellaDeXdr(alta) } });
  assert.equal((await almacen.leerTarea("registro"))?.contratoEscrow, CONTRATO_XDR);

  const otraVez = await prepararFirmaHttp(sesion(), new Request("http://local/api/firma", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ accion: "desplegar", tareaId: "registro" }),
  }), almacen);
  assert.equal(otraVez.status, 409);
  assert.match(((await otraVez.json()) as { aviso: string }).aviso, /already has an escrow/);
  const hosts = new Set(visto.urls.map((url) => new URL(url).host));
  hosts.delete("beta.api.trustlesswork.com");
  assert.deepEqual([...hosts].sort(), ["horizon-testnet.stellar.org", "soroban-testnet.stellar.org"]);
});

test("deploy submit throws and the escrow read lags: the contract is still saved with the do-not-lock-again notice", async () => {
  const almacen = await base();
  await almacen.actualizarTarea("registro", { walletCobro: RECEPTOR });
  simularRed({ envio: () => Response.json({ detail: "Gateway Timeout" }, { status: 504 }), rpc: ["SUCCESS"] });
  const alta = xdrDeAlta(FIRMANTE_XDR);
  const respuesta = await enviarFirmaHttp(
    sesion(),
    pedido({
      xdr: alta,
      accion: "desplegar",
      tareaId: "registro",
      token: token(alta, { accion: "desplegar", tareaId: "registro", monto: "20", contrato: CONTRATO_XDR }),
    }),
    almacen,
    opciones,
  );
  assert.equal(respuesta.status, 200);
  assert.match(((await respuesta.json()) as { aviso: string }).aviso, /Do not lock it again/);
  assert.equal((await almacen.leerTarea("registro"))?.contratoEscrow, CONTRATO_XDR);
});

test("deploy submit throws and testnet never sees the transaction: nothing is saved and the answer says wait", async () => {
  const almacen = await base();
  await almacen.actualizarTarea("registro", { walletCobro: RECEPTOR });
  pausasVistas.length = 0;
  const visto = simularRed({ envio: caida, rpc: ["NOT_FOUND"] });
  const alta = xdrDeAlta(FIRMANTE_XDR);
  const respuesta = await enviarFirmaHttp(
    sesion(),
    pedido({
      xdr: alta,
      accion: "desplegar",
      tareaId: "registro",
      token: token(alta, { accion: "desplegar", tareaId: "registro", monto: "20", contrato: CONTRATO_XDR }),
    }),
    almacen,
    opciones,
  );
  assert.equal(respuesta.status, 502);
  const cuerpo = (await respuesta.json()) as { codigo: string; hash: string; aviso: string };
  assert.equal(cuerpo.codigo, CODIGO_SIN_CONFIRMAR);
  assert.equal(cuerpo.hash, huellaDeXdr(alta));
  assert.match(cuerpo.aviso, /reload this page before you try again/);
  assert.equal(visto.rpc.length, 4);
  assert.deepEqual(pausasVistas, [1500, 2500, 3000]);
  assert.equal((await almacen.leerTarea("registro"))?.contratoEscrow, null);
});

test("deploy submit throws and testnet says FAILED: the original error comes back and nothing is saved", async () => {
  const almacen = await base();
  await almacen.actualizarTarea("registro", { walletCobro: RECEPTOR });
  const visto = simularRed({ envio: caida, rpc: ["FAILED"] });
  const alta = xdrDeAlta(FIRMANTE_XDR);
  const respuesta = await enviarFirmaHttp(
    sesion(),
    pedido({
      xdr: alta,
      accion: "desplegar",
      tareaId: "registro",
      token: token(alta, { accion: "desplegar", tareaId: "registro", monto: "20", contrato: CONTRATO_XDR }),
    }),
    almacen,
    opciones,
  );
  assert.equal(respuesta.status, 502);
  assert.equal(((await respuesta.json()) as { aviso: string }).aviso, "Could not reach Trustless Work.");
  assert.equal(visto.rpc.length, 1);
  assert.equal((await almacen.leerTarea("registro"))?.contratoEscrow, null);
});

test("a definite rejection checks testnet once and does not wait", async () => {
  const almacen = await base();
  await almacen.actualizarTarea("registro", { walletCobro: RECEPTOR });
  pausasVistas.length = 0;
  const visto = simularRed({
    envio: () => Response.json({ code: "STELLAR_TX_BAD_SEQ", detail: "Bad sequence." }, { status: 400 }),
    rpc: ["NOT_FOUND"],
  });
  const alta = xdrDeAlta(FIRMANTE_XDR);
  const respuesta = await enviarFirmaHttp(
    sesion(),
    pedido({
      xdr: alta,
      accion: "desplegar",
      tareaId: "registro",
      token: token(alta, { accion: "desplegar", tareaId: "registro", monto: "20", contrato: CONTRATO_XDR }),
    }),
    almacen,
    opciones,
  );
  assert.equal(respuesta.status, 400);
  assert.equal(((await respuesta.json()) as { codigo: string }).codigo, "STELLAR_TX_BAD_SEQ");
  assert.equal(visto.rpc.length, 1);
  assert.deepEqual(pausasVistas, []);
});

test("a resubmit of a deploy that already landed is recovered instead of failing on the sequence", async () => {
  const almacen = await base();
  await almacen.actualizarTarea("registro", { walletCobro: RECEPTOR });
  simularRed({
    envio: () => Response.json({ code: "STELLAR_TX_BAD_SEQ", detail: "Bad sequence." }, { status: 400 }),
    rpc: ["SUCCESS"],
    escrow: () => Response.json({ contractId: CONTRATO_XDR, balance: 0 }),
  });
  const alta = xdrDeAlta(FIRMANTE_XDR);
  const respuesta = await enviarFirmaHttp(
    sesion(),
    pedido({
      xdr: alta,
      accion: "desplegar",
      tareaId: "registro",
      token: token(alta, { accion: "desplegar", tareaId: "registro", monto: "20", contrato: CONTRATO_XDR }),
    }),
    almacen,
    opciones,
  );
  assert.equal(respuesta.status, 200);
  assert.equal((await almacen.leerTarea("registro"))?.contratoEscrow, CONTRATO_XDR);
});

test("a missing server key never asks testnet, because nothing was sent", async () => {
  const almacen = await base();
  await almacen.actualizarTarea("comida", { walletCobro: RECEPTOR, contratoEscrow: CONTRATO_XDR });
  const visto = simularRed({ envio: caida, rpc: ["SUCCESS"] });
  const clave = process.env.TRUSTLESS_API_KEY;
  delete process.env.TRUSTLESS_API_KEY;
  try {
    const pago = xdrDeInvocacion({ contrato: CONTRATO_XDR, funcion: "release_funds", firmante: FIRMANTE_XDR });
    const respuesta = await enviarFirmaHttp(
      sesion(),
      pedido({ xdr: pago, accion: "liberar", tareaId: "comida", token: token(pago, { accion: "liberar", tareaId: "comida", monto: "" }) }),
      almacen,
      opciones,
    );
    assert.equal(respuesta.status, 503);
    assert.equal(visto.rpc.length, 0);
    assert.equal((await almacen.leerTarea("comida"))?.hashPago, null);
  } finally {
    process.env.TRUSTLESS_API_KEY = clave;
  }
});

test("release submit throws but the release landed: hash_pago is saved and the task is paid", async () => {
  const almacen = await base();
  await almacen.actualizarTarea("comida", { walletCobro: RECEPTOR, contratoEscrow: CONTRATO_XDR });
  simularRed({
    envio: caida,
    rpc: ["SUCCESS"],
    escrow: () => Response.json({ contractId: CONTRATO_XDR, milestones: [{ released: true }] }),
  });
  const pago = xdrDeInvocacion({ contrato: CONTRATO_XDR, funcion: "release_funds", firmante: FIRMANTE_XDR });
  const respuesta = await enviarFirmaHttp(
    sesion(),
    pedido({ xdr: pago, accion: "liberar", tareaId: "comida", token: token(pago, { accion: "liberar", tareaId: "comida", monto: "" }) }),
    almacen,
    opciones,
  );
  assert.equal(respuesta.status, 200);
  const cuerpo = (await respuesta.json()) as { hash: string; aviso?: string };
  assert.equal(cuerpo.hash, huellaDeXdr(pago));
  assert.equal(cuerpo.aviso, undefined);
  const fila = await almacen.leerTarea("comida");
  assert.equal(fila?.hashPago, huellaDeXdr(pago));
  assert.equal(fila?.estado, "pagado");
  const revision = (await (await leerRevisionHttp(almacen, null, "comida")).json()) as { enlacePago: string };
  assert.equal(revision.enlacePago, `https://stellar.expert/explorer/testnet/tx/${huellaDeXdr(pago)}`);
});

test("release submit throws, landed, and the read lags: the hash is kept and a later review read marks it paid", async () => {
  const almacen = await base();
  await almacen.actualizarTarea("stand", { walletCobro: RECEPTOR, contratoEscrow: CONTRATO_XDR });
  const estado = { liberado: false };
  const visto = simularRed({
    envio: () => Response.json({ detail: "upstream timeout" }, { status: 504 }),
    rpc: ["NOT_FOUND", "SUCCESS"],
    escrow: () => Response.json({ contractId: CONTRATO_XDR, milestones: [{ released: estado.liberado }] }),
  });
  const pago = xdrDeInvocacion({ contrato: CONTRATO_XDR, funcion: "release_funds", firmante: FIRMANTE_XDR });
  const respuesta = await enviarFirmaHttp(
    sesion(),
    pedido({ xdr: pago, accion: "liberar", tareaId: "stand", token: token(pago, { accion: "liberar", tareaId: "stand", monto: "" }) }),
    almacen,
    opciones,
  );
  assert.equal(respuesta.status, 200);
  assert.match(((await respuesta.json()) as { aviso: string }).aviso, /Do not pay again/);
  const pendiente = await almacen.leerTarea("stand");
  assert.equal(pendiente?.hashPago, huellaDeXdr(pago));
  assert.notEqual(pendiente?.estado, "pagado");

  estado.liberado = true;
  await leerRevisionHttp(almacen, null, "stand");
  assert.equal((await almacen.leerTarea("stand"))?.estado, "pagado");
  assert.equal(visto.envios, 1);
});

test("a release that landed with no saved hash is marked paid on the next review read", async () => {
  const almacen = await base();
  await almacen.actualizarTarea("comida", { walletCobro: RECEPTOR, contratoEscrow: CONTRATO_XDR });
  const visto = simularRed({
    envio: caida,
    rpc: [],
    escrow: () => Response.json({ contractId: CONTRATO_XDR, balance: 0, milestones: [{ released: true }] }),
  });
  const respuesta = await leerRevisionHttp(almacen, null, "comida");
  assert.equal(respuesta.status, 200);
  const fila = await almacen.leerTarea("comida");
  assert.equal(fila?.estado, "pagado");
  assert.equal(fila?.hashPago, null);
  assert.equal(visto.escrow, 1);
});

test("an unreleased escrow with no hash stays unpaid after a review read", async () => {
  const almacen = await base();
  await almacen.actualizarTarea("comida", { walletCobro: RECEPTOR, contratoEscrow: CONTRATO_XDR });
  simularRed({
    envio: caida,
    rpc: [],
    escrow: () => Response.json({ contractId: CONTRATO_XDR, balance: 15, milestones: [{ released: false }] }),
  });
  await leerRevisionHttp(almacen, null, "comida");
  assert.notEqual((await almacen.leerTarea("comida"))?.estado, "pagado");
});
