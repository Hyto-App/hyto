import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
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
import {
  AVISO_USDC_FIRMANTE,
  AVISO_USDC_PENDIENTE,
  AVISO_USDC_SECUENCIA,
  AVISO_USDC_SIN_XLM,
  AVISO_USDC_VENCIDO,
  CODIGO_USDC_SIN_XLM,
} from "../integrante/avisosUsdc";
import { FRIENDBOT_TESTNET } from "../integrante/friendbot";
import { USDC } from "../integrante/identidades";
import { armarXdrUsdc, HORIZON_TESTNET, revisarXdrUsdc, xdrEsTrustlineUsdc } from "../integrante/trustline";
import {
  AVISO_USDC_DEMO,
  AVISO_USDC_ENVIO,
  AVISO_USDC_SIN_CUENTA,
  AVISO_USDC_SIN_WALLET,
  AVISO_USDC_SOLO_TESTNET,
  AVISO_USDC_XDR,
  leerUsdcHttp,
  publicarUsdcHttp,
} from "./usdc";

const OTRO = "G" + "B".repeat(55);

const avisos: string[] = [];
const warnOriginal = console.warn;

beforeEach(() => {
  avisos.length = 0;
  console.warn = (...partes: unknown[]) => {
    avisos.push(partes.map((parte) => (typeof parte === "string" ? parte : JSON.stringify(parte))).join(" "));
  };
});

afterEach(() => {
  console.warn = warnOriginal;
});

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
  assert.equal(urls.some((url) => url.includes("friendbot")), false);
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

test("sin cuenta en testnet Friendbot la abre y el changeTrust usa el emisor de USDC", async () => {
  const clave = Keypair.random();
  const wallet = clave.publicKey();
  const urls: string[] = [];
  let lecturas = 0;
  const fetchImpl: typeof fetch = async (input) => {
    const url = String(input);
    urls.push(url);
    if (url.startsWith(FRIENDBOT_TESTNET)) return json({ successful: true });
    lecturas += 1;
    return lecturas === 1 ? new Response("missing", { status: 404 }) : cuenta("20");
  };
  const respuesta = await publicarUsdcHttp(sesion(wallet), pedido({ accion: "preparar" }), fetchImpl, {
    env: { ...process.env, HYTO_STELLAR_NETWORK: "" },
    esperar: async () => undefined,
  });
  assert.equal(respuesta.status, 200);
  const cuerpo = (await respuesta.json()) as { xdr?: string };
  const tx = TransactionBuilder.fromXDR(cuerpo.xdr ?? "", Networks.TESTNET);
  assert.ok(tx instanceof Transaction);
  assert.equal(tx.source, wallet);
  const op = tx.operations[0];
  assert.ok(op && op.type === "changeTrust" && op.line instanceof Asset);
  if (op && op.type === "changeTrust" && op.line instanceof Asset) {
    assert.equal(op.line.code, USDC.code);
    assert.equal(op.line.issuer, USDC.issuer);
  }
  assert.deepEqual(
    urls.filter((url) => url.startsWith(FRIENDBOT_TESTNET)),
    [`${FRIENDBOT_TESTNET}?addr=${encodeURIComponent(wallet)}`],
  );
  assert.ok(urls.every((url) => url.startsWith(`${HORIZON_TESTNET}/`) || url.startsWith(`${FRIENDBOT_TESTNET}?`)));

  const caido: typeof fetch = async (input) => {
    const url = String(input);
    if (url.startsWith(FRIENDBOT_TESTNET)) return json({ detail: "no" }, 503);
    return new Response("missing", { status: 404 });
  };
  const fallo = await publicarUsdcHttp(sesion(wallet), pedido({ accion: "preparar" }), caido, {
    env: { ...process.env, HYTO_STELLAR_NETWORK: "" },
    esperar: async () => undefined,
  });
  assert.equal(fallo.status, 502);
  assert.equal((await fallo.json()).aviso, AVISO_USDC_SIN_CUENTA);

  const vacia = await publicarUsdcHttp(sesion(""), pedido({ accion: "preparar" }), fetchImpl);
  assert.equal(vacia.status, 400);
  assert.equal((await vacia.json()).aviso, AVISO_USDC_SIN_WALLET);
});

test("si otra pestaña ya fondeó, Friendbot 'already funded' no corta la preparación", async () => {
  const clave = Keypair.random();
  const wallet = clave.publicKey();
  let lecturas = 0;
  const fetchImpl: typeof fetch = async (input) => {
    const url = String(input);
    if (url.startsWith(FRIENDBOT_TESTNET)) return json({ detail: "createAccountAlreadyExist: op_already_exists" }, 400);
    lecturas += 1;
    return lecturas === 1 ? new Response("missing", { status: 404 }) : cuenta("3");
  };
  const respuesta = await publicarUsdcHttp(sesion(wallet), pedido({ accion: "preparar" }), fetchImpl, {
    env: { ...process.env, HYTO_STELLAR_NETWORK: "" },
    esperar: async () => undefined,
  });
  assert.equal(respuesta.status, 200);
  assert.equal(typeof ((await respuesta.json()) as { xdr?: string }).xdr, "string");
});

for (const red of ["public", "mainnet", "MAINNET"]) {
  test(`con HYTO_STELLAR_NETWORK=${red} preparar no llama a Friendbot ni a Horizon público`, async () => {
    const clave = Keypair.random();
    const wallet = clave.publicKey();
    const urls: string[] = [];
    const fetchImpl: typeof fetch = async (input) => {
      urls.push(String(input));
      return new Response("missing", { status: 404 });
    };
    const respuesta = await publicarUsdcHttp(sesion(wallet), pedido({ accion: "preparar" }), fetchImpl, {
      env: { ...process.env, HYTO_STELLAR_NETWORK: red },
      esperar: async () => undefined,
    });
    assert.equal(respuesta.status, 400);
    assert.equal((await respuesta.json()).aviso, AVISO_USDC_SOLO_TESTNET);
    assert.equal(urls.some((url) => url.includes("friendbot")), false);
    assert.equal(urls.some((url) => new URL(url).hostname === "horizon.stellar.org"), false);

    urls.length = 0;
    const lectura = await leerUsdcHttp(sesion(wallet), fetchImpl);
    assert.equal((await lectura.json()).listo, false);
    assert.equal(urls.some((url) => url.includes("friendbot")), false);
  });
}

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

const NATIVO_CERO = { asset_type: "native", balance: "0.0000000", buying_liabilities: "0.0000000", selling_liabilities: "0.0000000" };
const USDC_ABIERTO = { asset_type: "credit_alphanum4", asset_code: "USDC", asset_issuer: USDC.issuer, balance: "0.0000000" };

/** The shape Horizon returns for a Cavos account the relayer created and sponsors: no XLM of its own. */
function patrocinada(extra: Record<string, unknown> = {}): Response {
  return json({ sequence: "4294967296", subentry_count: 0, num_sponsoring: 0, num_sponsored: 2, balances: [NATIVO_CERO], ...extra });
}

test("una cuenta antigua patrocinada con 0 XLM recibe usdc_sin_xlm en vez de un changeTrust que Horizon rechazaría", async () => {
  const clave = Keypair.random();
  const wallet = clave.publicKey();
  const urls: string[] = [];
  const fetchImpl: typeof fetch = async (input) => {
    urls.push(String(input));
    return patrocinada();
  };
  const legado: SesionFila = { ...sesion(wallet, "abdiel@hyto.app"), token: "secreto-de-sesion" };
  const respuesta = await publicarUsdcHttp(legado, pedido({ accion: "preparar" }), fetchImpl);
  assert.equal(respuesta.status, 409);
  assert.deepEqual(await respuesta.json(), { aviso: AVISO_USDC_SIN_XLM, codigo: CODIGO_USDC_SIN_XLM, wallet });
  assert.equal(urls.some((url) => url.startsWith(FRIENDBOT_TESTNET)), false);
  assert.equal(avisos.length, 1);
  const linea = avisos[0] ?? "";
  assert.match(linea, /^\[api\/usdc\] /);
  assert.match(linea, /"paso":"preparar"/);
  assert.match(linea, /"motivo":"sin_xlm"/);
  assert.ok(linea.includes(`${wallet.slice(0, 4)}…${wallet.slice(-4)}`));
  assert.equal(linea.includes(wallet), false);
  assert.doesNotMatch(linea, /abdiel@hyto\.app|secreto-de-sesion/);
});

test("una cuenta antigua con XLM propio y entradas de datos recibe el changeTrust y la cuenta que lo firma", async () => {
  const clave = Keypair.random();
  const wallet = clave.publicKey();
  const fetchImpl: typeof fetch = async () =>
    json({
      sequence: "77",
      subentry_count: 3,
      num_sponsoring: 0,
      num_sponsored: 0,
      balances: [{ asset_type: "native", balance: "10.0000000", selling_liabilities: "0.0000000" }],
    });
  const respuesta = await publicarUsdcHttp(sesion(wallet), pedido({ accion: "preparar" }), fetchImpl);
  assert.equal(respuesta.status, 200);
  const cuerpo = (await respuesta.json()) as { xdr?: string; wallet?: string };
  assert.equal(cuerpo.wallet, wallet);
  assert.equal(revisarXdrUsdc(firmar(cuerpo.xdr ?? "", clave), wallet), null);
  assert.deepEqual(avisos, []);
});

test("una cuenta antigua que ya tiene USDC queda lista aunque no tenga XLM, sin firmar nada", async () => {
  const clave = Keypair.random();
  const fetchImpl: typeof fetch = async () =>
    patrocinada({ subentry_count: 1, num_sponsored: 3, balances: [NATIVO_CERO, USDC_ABIERTO] });
  const preparada = await publicarUsdcHttp(sesion(clave.publicKey()), pedido({ accion: "preparar" }), fetchImpl);
  assert.deepEqual(await preparada.json(), { listo: true });
  const lectura = await leerUsdcHttp(sesion(clave.publicKey()), fetchImpl);
  assert.deepEqual(await lectura.json(), { listo: true });
  assert.deepEqual(avisos, []);
});

test("cada rechazo de Horizon al enviar da un aviso que se puede seguir y queda registrado sin el XDR", async () => {
  const clave = Keypair.random();
  const wallet = clave.publicKey();
  const firmado = firmar(armarXdrUsdc(wallet, "9"), clave);
  const codigos = (transaction: string, operations?: string[]) =>
    json({ extras: { result_codes: operations ? { transaction, operations } : { transaction } } }, 400);
  const sinXlm = { aviso: AVISO_USDC_SIN_XLM, codigo: CODIGO_USDC_SIN_XLM, wallet };
  const casos: [string, () => Response, number, Record<string, unknown>, RegExp][] = [
    ["tx_insufficient_balance", () => codigos("tx_insufficient_balance"), 409, sinXlm, /tx_insufficient_balance/],
    ["op_low_reserve", () => codigos("tx_failed", ["op_low_reserve"]), 409, sinXlm, /op_low_reserve/],
    ["tx_bad_seq", () => codigos("tx_bad_seq"), 409, { aviso: AVISO_USDC_SECUENCIA }, /tx_bad_seq/],
    ["tx_too_late", () => codigos("tx_too_late"), 409, { aviso: AVISO_USDC_VENCIDO }, /tx_too_late/],
    ["tx_bad_auth", () => codigos("tx_bad_auth"), 400, { aviso: AVISO_USDC_FIRMANTE }, /tx_bad_auth/],
    ["504 de Horizon", () => json({ title: "Timeout" }, 504), 502, { aviso: AVISO_USDC_PENDIENTE }, /"estado":504/],
    [
      "red caída",
      () => {
        throw new TypeError("fetch failed");
      },
      502,
      { aviso: AVISO_USDC_PENDIENTE },
      /"motivo":"TypeError"/,
    ],
    ["otro código", () => codigos("tx_failed", ["op_malformed"]), 502, { aviso: AVISO_USDC_ENVIO }, /op_malformed/],
  ];
  for (const [nombre, horizon, estado, cuerpo, registro] of casos) {
    avisos.length = 0;
    const fetchImpl: typeof fetch = async (input) => {
      if (String(input) === `${HORIZON_TESTNET}/transactions`) return horizon();
      return json({ sequence: "9", balances: [NATIVO_CERO] });
    };
    const respuesta = await publicarUsdcHttp(sesion(wallet), pedido({ accion: "enviar", xdr: firmado }), fetchImpl);
    assert.equal(respuesta.status, estado, nombre);
    assert.deepEqual(await respuesta.json(), cuerpo, nombre);
    assert.equal(avisos.length, 1, nombre);
    assert.match(avisos[0] ?? "", /"paso":"enviar"/, nombre);
    assert.match(avisos[0] ?? "", registro, nombre);
    assert.equal((avisos[0] ?? "").includes(firmado), false, nombre);
  }
});

test("si el envío falla pero la trustline ya está en el ledger, responde listo sin hash", async () => {
  const clave = Keypair.random();
  const wallet = clave.publicKey();
  const firmado = firmar(armarXdrUsdc(wallet, "9"), clave);
  const fetchImpl: typeof fetch = async (input) => {
    if (String(input) === `${HORIZON_TESTNET}/transactions`) return json({ title: "Timeout" }, 504);
    return json({ sequence: "10", balances: [NATIVO_CERO, USDC_ABIERTO] });
  };
  const respuesta = await publicarUsdcHttp(sesion(wallet), pedido({ accion: "enviar", xdr: firmado }), fetchImpl);
  assert.equal(respuesta.status, 200);
  assert.deepEqual(await respuesta.json(), { listo: true, hash: null });
});

test("un XDR que no vale dice por qué en el registro", async () => {
  const clave = Keypair.random();
  const wallet = clave.publicKey();
  const ajena = Keypair.random();
  const construir = (operacion: ReturnType<typeof Operation.changeTrust> | ReturnType<typeof Operation.payment>) =>
    new TransactionBuilder(new Account(wallet, "9"), { fee: BASE_FEE, networkPassphrase: Networks.TESTNET })
      .addOperation(operacion)
      .setTimeout(30)
      .build()
      .toXDR();
  const sinFirma = armarXdrUsdc(wallet, "9");
  assert.equal(revisarXdrUsdc(firmar(sinFirma, clave), wallet), null);
  assert.equal(revisarXdrUsdc("no-es-xdr", wallet), "formato");
  assert.equal(revisarXdrUsdc(firmar(armarXdrUsdc(ajena.publicKey(), "9"), ajena), wallet), "cuenta");
  assert.equal(
    revisarXdrUsdc(firmar(construir(Operation.payment({ destination: ajena.publicKey(), asset: Asset.native(), amount: "1" })), clave), wallet),
    "operacion",
  );
  assert.equal(revisarXdrUsdc(firmar(construir(Operation.changeTrust({ asset: new Asset("USDC", ajena.publicKey()) })), clave), wallet), "activo");
  assert.equal(
    revisarXdrUsdc(firmar(construir(Operation.changeTrust({ asset: new Asset(USDC.code, USDC.issuer), limit: "0" })), clave), wallet),
    "limite",
  );
  assert.equal(revisarXdrUsdc(sinFirma, wallet), "firma");
  assert.equal(revisarXdrUsdc(firmar(sinFirma, ajena), wallet), "firma");

  const rechazo = await publicarUsdcHttp(sesion(wallet), pedido({ accion: "enviar", xdr: firmar(sinFirma, ajena) }), async () => {
    throw new Error("no debería llegar a Horizon");
  });
  assert.equal(rechazo.status, 400);
  assert.equal((await rechazo.json()).aviso, AVISO_USDC_XDR);
  assert.equal(avisos.length, 1);
  assert.match(avisos[0] ?? "", /"motivo":"xdr_firma"/);
});
