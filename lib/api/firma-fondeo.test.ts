import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import type { Almacen } from "../db/almacen";
import { crearMemoria } from "../db/memoria";
import { asegurarSemilla } from "../db/semilla";
import type { SesionFila } from "../db/tipos";
import { reiniciarLimite } from "../escrow/limite";
import { RPC_TESTNET } from "../escrow/confirmacion";
import { CONTRATO_XDR, FIRMANTE_XDR, xdrDeInvocacion } from "../escrow/prueba-xdr";
import { CODIGO_YA_FONDEADO, enviarFirmaHttp, huellaDeXdr, prepararFirmaHttp } from "./firma";
import { emitirTokenPreparado } from "./preparado";
import { leerRevisionHttp } from "./revision";

const RECEPTOR = "GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB";
const USDC_ISSUER = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
const HASH_FONDEO = "ab".repeat(32);
const OTRO_CONTRATO = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";
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

function token(xdr: string): string {
  const firmado = emitirTokenPreparado({
    usuarioId: "organizador",
    sesionId: "tok",
    huella: huellaDeXdr(xdr),
    accion: "fondear",
    tareaId: "comida",
    monto: "15",
  });
  if (!firmado) throw new Error("missing payment secret");
  return firmado;
}

function pedido(cuerpo: unknown): Request {
  return new Request("http://local/api/firma", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(cuerpo),
  });
}

type Red = { envio: () => Response; rpc?: string };

// Answers like Horizon, Trustless and testnet RPC.
function simularRed(red: Red) {
  const visto = { envios: 0, preparados: 0, rpc: 0 };
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.startsWith("https://horizon-testnet.stellar.org")) {
      return Response.json({ balances: [{ balance: "1000", asset_code: "USDC", asset_issuer: USDC_ISSUER }] });
    }
    if (url.endsWith("/stellar/send-transaction")) {
      visto.envios += 1;
      return red.envio();
    }
    if (url.endsWith("/escrow/multi-release/v2/fund")) {
      visto.preparados += 1;
      return Response.json({ unsignedXdr: "BBBB", txHash: "def" });
    }
    if (url === RPC_TESTNET) {
      visto.rpc += 1;
      return Response.json({ jsonrpc: "2.0", id: 1, result: { status: red.rpc ?? "NOT_FOUND" } });
    }
    throw new Error(`fetch inesperado: ${url}`);
  };
  return visto;
}

function atrasado(): Response {
  return Response.json({ code: "STELLAR_TX_SUBMITTED_INDEXER_LAGGING", txHash: HASH_FONDEO });
}

function caida(): Response {
  throw new TypeError("fetch failed: socket hang up");
}

async function base(): Promise<Almacen> {
  const almacen = crearMemoria();
  await asegurarSemilla(almacen);
  await almacen.asignarOrganizador("zeek", "organizador");
  await almacen.actualizarTarea("comida", { walletCobro: RECEPTOR, contratoEscrow: CONTRATO_XDR });
  await almacen.actualizarEvidencia("ejemplo-comida", { montoConfirmado: "15" });
  return almacen;
}

const opciones = { sondeo: { esperar: async () => {} }, red: { esperar: async () => {} } };

async function enviarFondeo(almacen: Almacen): Promise<Response> {
  const fondeo = xdrDeInvocacion({ contrato: CONTRATO_XDR, funcion: "fund_escrow", firmante: FIRMANTE_XDR });
  return enviarFirmaHttp(
    sesion(),
    pedido({ xdr: fondeo, accion: "fondear", tareaId: "comida", contrato: CONTRATO_XDR, token: token(fondeo) }),
    almacen,
    opciones,
  );
}

function prepararFondeo(almacen: Almacen): Promise<Response> {
  return prepararFirmaHttp(
    sesion(),
    pedido({ accion: "fondear", tareaId: "comida", contrato: CONTRATO_XDR, firmante: FIRMANTE_XDR, monto: 15 }),
    almacen,
  );
}

async function hashFondeoLeido(almacen: Almacen): Promise<string | null> {
  const respuesta = await leerRevisionHttp(almacen, null, "comida");
  assert.equal(respuesta.status, 200);
  return ((await respuesta.json()) as { hashFondeo: string | null }).hashFondeo;
}

test("without a fund there is no marker and fund can be prepared", async () => {
  const almacen = await base();
  simularRed({ envio: atrasado });
  assert.equal(await hashFondeoLeido(almacen), null);
  assert.equal((await prepararFondeo(almacen)).status, 200);
});

test("a fund the indexer has not seen yet stores the marker, the screen detail exposes it and a second fund is refused", async () => {
  const almacen = await base();
  const visto = simularRed({ envio: atrasado });
  const respuesta = await enviarFondeo(almacen);
  assert.equal(respuesta.status, 200);
  assert.equal(((await respuesta.json()) as { hash: string }).hash, HASH_FONDEO);
  assert.deepEqual(await almacen.leerFondeo("comida"), {
    tareaId: "comida",
    contrato: CONTRATO_XDR,
    hash: HASH_FONDEO,
    creadoEn: (await almacen.leerFondeo("comida"))?.creadoEn,
  });
  assert.equal(await hashFondeoLeido(almacen), HASH_FONDEO);

  const preparado = await prepararFondeo(almacen);
  assert.equal(preparado.status, 409);
  const cuerpo = (await preparado.json()) as { aviso: string; codigo: string };
  assert.equal(cuerpo.codigo, CODIGO_YA_FONDEADO);
  assert.match(cuerpo.aviso, /already locked/);
  assert.match(cuerpo.aviso, /Do not lock it again/);
  assert.equal(visto.preparados, 0);

  // A signature prepared before the first fund landed (a second tab) is refused at submit too.
  const segundo = await enviarFondeo(almacen);
  assert.equal(segundo.status, 409);
  assert.equal(((await segundo.json()) as { codigo: string }).codigo, CODIGO_YA_FONDEADO);
  assert.equal(visto.envios, 1);
});

test("a fund whose submit failed but testnet confirmed also stores the marker", async () => {
  const almacen = await base();
  simularRed({ envio: caida, rpc: "SUCCESS" });
  const respuesta = await enviarFondeo(almacen);
  assert.equal(respuesta.status, 200);
  assert.match((await almacen.leerFondeo("comida"))?.hash ?? "", /^[0-9a-f]{64}$/);
  assert.equal((await prepararFondeo(almacen)).status, 409);
});

test("a fund that was not confirmed stores no marker, so the retry is still allowed", async () => {
  const almacen = await base();
  simularRed({ envio: caida, rpc: "NOT_FOUND" });
  const perdido = await enviarFondeo(almacen);
  assert.equal(perdido.status, 502);
  assert.equal(await almacen.leerFondeo("comida"), null);

  simularRed({ envio: caida, rpc: "FAILED" });
  const fallido = await enviarFondeo(almacen);
  assert.notEqual(fallido.status, 200);
  assert.equal(await almacen.leerFondeo("comida"), null);
  assert.equal(await hashFondeoLeido(almacen), null);

  simularRed({ envio: atrasado });
  assert.equal((await prepararFondeo(almacen)).status, 200);
});

test("a marker of another contract never blocks or shows on the task", async () => {
  const almacen = await base();
  await almacen.guardarFondeo({ tareaId: "comida", contrato: OTRO_CONTRATO, hash: HASH_FONDEO, creadoEn: "2026-10-06T00:00:00.000Z" });
  simularRed({ envio: atrasado });
  assert.equal(await hashFondeoLeido(almacen), null);
  assert.equal((await prepararFondeo(almacen)).status, 200);
});

test("a store that cannot keep the marker (migration 0008 not applied) leaves the submit and the screen as before", async () => {
  const memoria = await base();
  const sinTabla: Almacen = { ...memoria, leerFondeo: async () => null, guardarFondeo: async () => false };
  simularRed({ envio: atrasado });
  const errores: string[] = [];
  const original = console.error;
  console.error = (...args: unknown[]) => void errores.push(args.map(String).join(" "));
  try {
    const respuesta = await enviarFondeo(sinTabla);
    assert.equal(respuesta.status, 200);
    assert.equal(((await respuesta.json()) as { aviso?: string }).aviso, undefined);
  } finally {
    console.error = original;
  }
  assert.match(errores.join("\n"), /0008_fondeos_escrow/);
  assert.equal(await hashFondeoLeido(sinTabla), null);
  assert.equal((await prepararFondeo(sinTabla)).status, 200);
});
