import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import type { Almacen } from "../db/almacen";
import type { SesionFila } from "../db/tipos";
import { crearMemoria } from "../db/memoria";
import { asegurarSemilla } from "../db/semilla";
import { RPC_TESTNET } from "../escrow/confirmacion";
import { reiniciarLimite } from "../escrow/limite";
import { CONTRATO_XDR, FIRMANTE_XDR, xdrDeInvocacion } from "../escrow/prueba-xdr";
import {
  CODIGO_CONFIRMADO_EN_RED,
  CODIGO_SIN_CONFIRMAR,
  CODIGO_YA_FONDEADO,
  enviarFirmaHttp,
  fondeoDeTarea,
  huellaDeXdr,
  prepararFirmaHttp,
} from "./firma";
import { emitirTokenPreparado } from "./preparado";
import { leerRevisionHttp } from "./revision";

const SECRETO_TOKEN = "hyto-token-secret-for-tests-32ch";
const OTRO_CONTRATO = "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
const RECEPTOR = "GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB";
const SIN_ESPERA = { sondeo: { esperar: async () => {} } };
const previo = { secreto: undefined as string | undefined, clave: undefined as string | undefined };

before(() => {
  previo.secreto = process.env.HYTO_TOKEN_SECRET;
  previo.clave = process.env.TRUSTLESS_API_KEY;
  process.env.HYTO_TOKEN_SECRET = SECRETO_TOKEN;
  process.env.TRUSTLESS_API_KEY = "clave-de-prueba";
});

after(() => {
  if (previo.secreto === undefined) delete process.env.HYTO_TOKEN_SECRET;
  else process.env.HYTO_TOKEN_SECRET = previo.secreto;
  if (previo.clave === undefined) delete process.env.TRUSTLESS_API_KEY;
  else process.env.TRUSTLESS_API_KEY = previo.clave;
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

function pedido(cuerpo: unknown): Request {
  return new Request("http://local/api/firma", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(cuerpo),
  });
}

function envioFondeo(xdr: string, tareaId = "stand"): Request {
  const token = emitirTokenPreparado({
    usuarioId: "organizador",
    sesionId: "tok",
    huella: huellaDeXdr(xdr),
    accion: "fondear",
    tareaId,
    monto: "",
  });
  if (!token) throw new Error("missing payment secret");
  return pedido({ xdr, accion: "fondear", tareaId, token });
}

async function almacenConEscrow(): Promise<Almacen> {
  reiniciarLimite();
  const almacen = crearMemoria();
  await asegurarSemilla(almacen);
  await almacen.asignarOrganizador("zeek", "organizador");
  await almacen.actualizarTarea("stand", { walletCobro: RECEPTOR, contratoEscrow: CONTRATO_XDR });
  return almacen;
}

type Llamada = { url: string; cuerpo: string };

function conFetch(manejar: (url: string, init?: RequestInit) => Response | Promise<Response>): {
  llamadas: Llamada[];
  restaurar: () => void;
} {
  const original = globalThis.fetch;
  const llamadas: Llamada[] = [];
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    llamadas.push({ url, cuerpo: typeof init?.body === "string" ? init.body : "" });
    return manejar(url, init);
  };
  return {
    llamadas,
    restaurar: () => {
      globalThis.fetch = original;
      reiniciarLimite();
    },
  };
}

function saldoCero(): Response {
  return new Response(JSON.stringify({ contractId: CONTRATO_XDR, balance: 0 }), { status: 200 });
}

test("un fondeo confirmado guarda la marca y no se ofrece ni se acepta otro aunque el saldo indexado siga en 0", async () => {
  const almacen = await almacenConEscrow();
  const red = conFetch((url) => {
    if (url.endsWith("/stellar/send-transaction")) {
      return new Response(
        JSON.stringify({ txHash: "44".repeat(32), ledger: 9, code: "STELLAR_TX_SUBMITTED_INDEXER_LAGGING" }),
        { status: 200 },
      );
    }
    return saldoCero();
  });
  try {
    const xdr = xdrDeInvocacion({ contrato: CONTRATO_XDR, funcion: "fund_escrow", firmante: FIRMANTE_XDR });
    const respuesta = await enviarFirmaHttp(sesion(), envioFondeo(xdr), almacen, SIN_ESPERA);
    assert.equal(respuesta.status, 200);
    const cuerpo = (await respuesta.json()) as { hash: string; contrato: string | null };
    assert.equal(cuerpo.hash, "44".repeat(32));
    assert.equal(cuerpo.contrato, CONTRATO_XDR);
    const marca = await almacen.leerFondeo("stand");
    assert.equal(marca?.hash, "44".repeat(32));
    assert.equal(marca?.contrato, CONTRATO_XDR);

    const revision = await leerRevisionHttp(almacen, null, "stand");
    assert.equal(revision.status, 200);
    assert.equal(((await revision.json()) as { hashFondeo: string | null }).hashFondeo, "44".repeat(32));

    red.llamadas.length = 0;
    const preparar = await prepararFirmaHttp(
      sesion(),
      pedido({ accion: "fondear", contrato: CONTRATO_XDR, firmante: FIRMANTE_XDR, monto: 20, tareaId: "stand" }),
      almacen,
    );
    assert.equal(preparar.status, 409);
    const rechazo = (await preparar.json()) as { aviso: string; codigo: string };
    assert.equal(rechazo.codigo, CODIGO_YA_FONDEADO);
    assert.match(rechazo.aviso, /Do not lock it again/);
    assert.equal(red.llamadas.length, 0);

    const otro = xdrDeInvocacion({ contrato: CONTRATO_XDR, funcion: "fund_escrow", firmante: FIRMANTE_XDR });
    const segundo = await enviarFirmaHttp(sesion(), envioFondeo(otro), almacen, SIN_ESPERA);
    assert.equal(segundo.status, 409);
    assert.equal(((await segundo.json()) as { codigo: string }).codigo, CODIGO_YA_FONDEADO);
    assert.equal(red.llamadas.some((llamada) => llamada.url.endsWith("/stellar/send-transaction")), false);
  } finally {
    red.restaurar();
  }
});

test("un fondeo cuyo envío falla pero quedó en testnet se recupera por RPC y guarda la marca", async () => {
  const almacen = await almacenConEscrow();
  const red = conFetch((url) => {
    if (url.endsWith("/stellar/send-transaction")) return new Response(JSON.stringify({ message: "Bad gateway" }), { status: 502 });
    if (url === RPC_TESTNET) return new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result: { status: "SUCCESS" } }), { status: 200 });
    return saldoCero();
  });
  try {
    const xdr = xdrDeInvocacion({ contrato: CONTRATO_XDR, funcion: "fund_escrow", firmante: FIRMANTE_XDR });
    const respuesta = await enviarFirmaHttp(sesion(), envioFondeo(xdr), almacen, SIN_ESPERA);
    assert.equal(respuesta.status, 200);
    const cuerpo = (await respuesta.json()) as { hash: string; codigo: string };
    assert.equal(cuerpo.codigo, CODIGO_CONFIRMADO_EN_RED);
    assert.equal(cuerpo.hash, huellaDeXdr(xdr));
    assert.equal((await almacen.leerFondeo("stand"))?.hash, huellaDeXdr(xdr));
    const rpc = red.llamadas.filter((llamada) => llamada.url === RPC_TESTNET);
    assert.equal(rpc.length, 1);
    assert.match(rpc[0]?.cuerpo ?? "", /"getTransaction"/);
    for (const llamada of red.llamadas) {
      assert.doesNotMatch(llamada.url, /horizon\.stellar\.org|mainnet|soroban-rpc\.stellar\.org|friendbot/);
    }
  } finally {
    red.restaurar();
  }
});

test("un fondeo que la red no confirma no guarda marca y avisa que no se repita todavía", async () => {
  const almacen = await almacenConEscrow();
  const pausas: number[] = [];
  const red = conFetch((url) => {
    if (url.endsWith("/stellar/send-transaction")) throw new TypeError("fetch failed");
    if (url === RPC_TESTNET) return new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result: { status: "NOT_FOUND" } }), { status: 200 });
    return saldoCero();
  });
  try {
    const xdr = xdrDeInvocacion({ contrato: CONTRATO_XDR, funcion: "fund_escrow", firmante: FIRMANTE_XDR });
    const respuesta = await enviarFirmaHttp(sesion(), envioFondeo(xdr), almacen, {
      sondeo: { esperar: async (ms) => void pausas.push(ms) },
    });
    assert.equal(respuesta.status, 502);
    assert.equal(((await respuesta.json()) as { codigo: string }).codigo, CODIGO_SIN_CONFIRMAR);
    assert.deepEqual(pausas, [1500, 2500, 3000]);
    assert.equal(await almacen.leerFondeo("stand"), null);
  } finally {
    red.restaurar();
  }
});

test("un fondeo que falló en la red deja el error original y no guarda marca", async () => {
  const almacen = await almacenConEscrow();
  const red = conFetch((url) => {
    if (url.endsWith("/stellar/send-transaction")) return new Response(JSON.stringify({ message: "Bad gateway" }), { status: 502 });
    if (url === RPC_TESTNET) return new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result: { status: "FAILED" } }), { status: 200 });
    return saldoCero();
  });
  try {
    const xdr = xdrDeInvocacion({ contrato: CONTRATO_XDR, funcion: "fund_escrow", firmante: FIRMANTE_XDR });
    const respuesta = await enviarFirmaHttp(sesion(), envioFondeo(xdr), almacen, SIN_ESPERA);
    assert.notEqual(respuesta.status, 200);
    assert.equal(await almacen.leerFondeo("stand"), null);
  } finally {
    red.restaurar();
  }
});

test("la marca solo vale para el escrow actual de la tarea", async () => {
  const almacen = await almacenConEscrow();
  await almacen.guardarFondeo({ tareaId: "stand", contrato: OTRO_CONTRATO, hash: "55".repeat(32), creadoEn: "2026-10-03T00:00:00.000Z" });
  const tarea = await almacen.leerTarea("stand");
  assert.ok(tarea);
  assert.equal(await fondeoDeTarea(almacen, tarea), null);
  assert.equal(await fondeoDeTarea(almacen, { ...tarea, contratoEscrow: OTRO_CONTRATO }), "55".repeat(32));
  assert.equal(await fondeoDeTarea(almacen, { ...tarea, contratoEscrow: null }), null);
});

test("sin la tabla de 0006 el envío del fondeo sigue respondiendo 200", async () => {
  const base = await almacenConEscrow();
  const almacen: Almacen = {
    ...base,
    async leerFondeo() {
      return null;
    },
    async guardarFondeo() {
      return false;
    },
  };
  const red = conFetch((url) => {
    if (url.endsWith("/stellar/send-transaction")) {
      return new Response(JSON.stringify({ txHash: "66".repeat(32), ledger: 3, code: "STELLAR_TX_SUBMITTED" }), { status: 200 });
    }
    return saldoCero();
  });
  const errores = console.error;
  console.error = () => {};
  try {
    const xdr = xdrDeInvocacion({ contrato: CONTRATO_XDR, funcion: "fund_escrow", firmante: FIRMANTE_XDR });
    const respuesta = await enviarFirmaHttp(sesion(), envioFondeo(xdr), almacen, SIN_ESPERA);
    assert.equal(respuesta.status, 200);
    assert.equal(((await respuesta.json()) as { aviso?: string }).aviso, undefined);
  } finally {
    console.error = errores;
    red.restaurar();
  }
});
