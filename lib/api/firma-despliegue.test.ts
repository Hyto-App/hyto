import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { Address, Keypair, xdr } from "@stellar/stellar-sdk";
import type { SesionFila } from "../db/tipos";
import { crearMemoria } from "../db/memoria";
import { asegurarSemilla } from "../db/semilla";
import { reiniciarLimite } from "../escrow/limite";
import { CONTRATO_XDR, FIRMANTE_XDR, xdrDeAlta, xdrDeInvocacion } from "../escrow/prueba-xdr";
import { FABRICA_MULTI_RELEASE_TESTNET, anclaDeXdr } from "../escrow/xdr";
import { enviarFirmaHttp, huellaDeXdr } from "./firma";
import { emitirTokenPreparado } from "./preparado";

const SECRETO = "hyto-token-secret-for-tests-32ch";
const RECEPTOR = FIRMANTE_XDR;
const OTRO_RECEPTOR = Keypair.fromRawEd25519Seed(new Uint8Array(32).fill(4)).publicKey();
const USDC_ISSUER = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
const SIN_ESPERA = { sondeo: { esperar: async () => {}, pausas: [] as number[] } };
let secretoPrevio: string | undefined;
let clavePrevia: string | undefined;

before(() => {
  secretoPrevio = process.env.HYTO_TOKEN_SECRET;
  clavePrevia = process.env.TRUSTLESS_API_KEY;
  process.env.HYTO_TOKEN_SECRET = SECRETO;
  process.env.TRUSTLESS_API_KEY = "clave-de-prueba";
});

after(() => {
  if (secretoPrevio === undefined) delete process.env.HYTO_TOKEN_SECRET;
  else process.env.HYTO_TOKEN_SECRET = secretoPrevio;
  if (clavePrevia === undefined) delete process.env.TRUSTLESS_API_KEY;
  else process.env.TRUSTLESS_API_KEY = clavePrevia;
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
  return new Request("http://local/api/firma/enviar", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(cuerpo),
  });
}

function monto(n: bigint): xdr.ScVal {
  return xdr.ScVal.scvI128(new xdr.Int128Parts({ hi: 0n, lo: n }));
}

function argsDe(cifra: bigint, receptor = RECEPTOR): xdr.ScVal[] {
  return [monto(cifra), new Address(receptor).toScVal(), xdr.ScVal.scvString("hyto-stand")];
}

function tokenDe(crudo: string, meta: { accion: string; tareaId: string; monto: string; contrato?: string }): string {
  const ancla = anclaDeXdr(crudo);
  const token = emitirTokenPreparado({
    usuarioId: "organizador",
    sesionId: "tok",
    huella: huellaDeXdr(crudo),
    accion: meta.accion,
    tareaId: meta.tareaId,
    monto: meta.monto,
    ...(meta.contrato ? { contrato: meta.contrato } : {}),
    ...(ancla ? { ancla } : {}),
  });
  if (!token) throw new Error("missing payment secret");
  return token;
}

function resimular(opciones: { contrato: string; funcion: string; args?: xdr.ScVal[] }): string {
  return xdrDeInvocacion({
    ...opciones,
    firmante: FIRMANTE_XDR,
    fee: "5000",
    firmaAuth: new Uint8Array([1, 2, 3, 4]),
    footprint: true,
    recurso: 400,
  });
}

async function almacenDe(contrato: string | null) {
  const almacen = crearMemoria();
  await asegurarSemilla(almacen);
  await almacen.asignarOrganizador("zeek", "organizador");
  if (contrato) await almacen.actualizarTarea("stand", { contratoEscrow: contrato, walletCobro: RECEPTOR });
  return almacen;
}

function red() {
  const envios: string[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.includes("horizon")) {
      return Response.json({
        balances: [{ balance: "1000", asset_code: "USDC", asset_issuer: USDC_ISSUER }],
      });
    }
    if (url.endsWith("/stellar/send-transaction")) {
      const cuerpo = JSON.parse(String(init?.body)) as { signedXdr?: string };
      envios.push(cuerpo.signedXdr ?? "");
      return Response.json({
        txHash: "ab".repeat(32),
        ledger: 11,
        code: "STELLAR_TX_SUBMITTED",
        contractId: CONTRATO_XDR,
      });
    }
    if (url.includes("/escrow/multi-release/v2/")) {
      return Response.json({ contractId: CONTRATO_XDR, milestones: [{ released: true }] });
    }
    throw new Error(`fetch inesperado: ${url}`);
  };
  return {
    envios,
    restaurar() {
      globalThis.fetch = original;
    },
  };
}

test("un alta de la factory con los argumentos preparados se envía, aunque Cavos cambie fee, footprint y auth", async () => {
  reiniciarLimite();
  const almacen = await almacenDe(null);
  const args = argsDe(20n);
  const preparada = xdrDeAlta(FIRMANTE_XDR, { args });
  const firmada = resimular({ contrato: FABRICA_MULTI_RELEASE_TESTNET, funcion: "tw_new_multi_release_escrow", args });
  assert.notEqual(huellaDeXdr(preparada), huellaDeXdr(firmada));
  assert.equal(anclaDeXdr(preparada), anclaDeXdr(firmada));
  const redVista = red();
  try {
    const igual = await enviarFirmaHttp(
      sesion(),
      pedido({
        xdr: preparada,
        accion: "desplegar",
        tareaId: "stand",
        token: tokenDe(preparada, { accion: "desplegar", tareaId: "stand", monto: "20", contrato: CONTRATO_XDR }),
      }),
      almacen,
      SIN_ESPERA,
    );
    assert.equal(igual.status, 200);
    assert.equal((await almacen.leerTarea("stand"))?.contratoEscrow, CONTRATO_XDR);
    await almacen.actualizarTarea("stand", { contratoEscrow: null });

    const respuesta = await enviarFirmaHttp(
      sesion(),
      pedido({
        xdr: firmada,
        accion: "desplegar",
        tareaId: "stand",
        token: tokenDe(preparada, { accion: "desplegar", tareaId: "stand", monto: "20", contrato: CONTRATO_XDR }),
      }),
      almacen,
      SIN_ESPERA,
    );
    assert.equal(respuesta.status, 200);
    assert.equal(redVista.envios.at(-1), firmada);
    assert.equal((await almacen.leerTarea("stand"))?.contratoEscrow, CONTRATO_XDR);
    assert.notEqual((await almacen.leerTarea("stand"))?.contratoEscrow, FABRICA_MULTI_RELEASE_TESTNET);
  } finally {
    redVista.restaurar();
    reiniciarLimite();
  }
});

test("un alta que no es esa llamada se rechaza antes de enviarla", async () => {
  reiniciarLimite();
  const almacen = await almacenDe(null);
  const args = argsDe(20n);
  const preparada = xdrDeAlta(FIRMANTE_XDR, { args });
  const token = tokenDe(preparada, { accion: "desplegar", tareaId: "stand", monto: "20", contrato: CONTRATO_XDR });
  const otro = Address.contract(new Uint8Array(32).fill(4)).toString();
  const casos = [
    xdrDeInvocacion({ contrato: otro, funcion: "tw_new_multi_release_escrow", firmante: FIRMANTE_XDR, args }),
    xdrDeInvocacion({ contrato: FABRICA_MULTI_RELEASE_TESTNET, funcion: "deploy", firmante: FIRMANTE_XDR, args }),
    xdrDeInvocacion({ contrato: FABRICA_MULTI_RELEASE_TESTNET, funcion: "fund_escrow", firmante: FIRMANTE_XDR, args }),
    xdrDeAlta(FIRMANTE_XDR, { args: argsDe(21n) }),
    xdrDeAlta(FIRMANTE_XDR, { args: argsDe(20n, OTRO_RECEPTOR) }),
  ];
  const redVista = red();
  try {
    for (const crudo of casos) {
      const respuesta = await enviarFirmaHttp(
        sesion(),
        pedido({ xdr: crudo, accion: "desplegar", tareaId: "stand", token }),
        almacen,
        SIN_ESPERA,
      );
      assert.equal(respuesta.status, 409);
      const aviso = ((await respuesta.json()) as { aviso: string }).aviso;
      assert.match(aviso, /does not deploy the escrow|does not match the prepared payment/);
    }
    assert.equal(redVista.envios.length, 0);
    assert.equal((await almacen.leerTarea("stand"))?.contratoEscrow, null);
  } finally {
    redVista.restaurar();
    reiniciarLimite();
  }
});

test("fondear, marcar, aprobar y liberar aceptan la re-simulación y rechazan otros argumentos", async () => {
  reiniciarLimite();
  const pasos = [
    { accion: "fondear", funcion: "fund_escrow", monto: "20" },
    { accion: "marcar", funcion: "change_milestone_status", monto: "" },
    { accion: "aprobar", funcion: "approve_milestones", monto: "" },
    { accion: "liberar", funcion: "release_funds", monto: "" },
  ] as const;
  const redVista = red();
  try {
    for (const paso of pasos) {
      const almacen = await almacenDe(CONTRATO_XDR);
      const args = argsDe(20n);
      const preparada = xdrDeInvocacion({
        contrato: CONTRATO_XDR,
        funcion: paso.funcion,
        firmante: FIRMANTE_XDR,
        args,
      });
      const firmada = resimular({ contrato: CONTRATO_XDR, funcion: paso.funcion, args });
      assert.notEqual(huellaDeXdr(preparada), huellaDeXdr(firmada));
      assert.equal(anclaDeXdr(preparada), anclaDeXdr(firmada));
      const token = tokenDe(preparada, { accion: paso.accion, tareaId: "stand", monto: paso.monto });
      const antes = redVista.envios.length;
      const enviado = await enviarFirmaHttp(
        sesion(),
        pedido({ xdr: firmada, accion: paso.accion, tareaId: "stand", token }),
        almacen,
        SIN_ESPERA,
      );
      assert.equal(enviado.status, 200, paso.accion);
      assert.equal(redVista.envios.at(-1), firmada);
      assert.equal(redVista.envios.length, antes + 1);
      if (paso.accion === "liberar") assert.equal((await almacen.leerTarea("stand"))?.estado, "pagado");
      else assert.notEqual((await almacen.leerTarea("stand"))?.estado, "pagado");

      const distinta = xdrDeInvocacion({
        contrato: CONTRATO_XDR,
        funcion: paso.funcion,
        firmante: FIRMANTE_XDR,
        args: argsDe(99n),
      });
      const rechazo = await enviarFirmaHttp(
        sesion(),
        pedido({ xdr: distinta, accion: paso.accion, tareaId: "stand", token }),
        almacen,
        SIN_ESPERA,
      );
      assert.equal(rechazo.status, 409, paso.accion);
      assert.match(((await rechazo.json()) as { aviso: string }).aviso, /does not match the prepared payment/);
      assert.equal(redVista.envios.length, antes + 1);
    }
  } finally {
    redVista.restaurar();
    reiniciarLimite();
  }
});
