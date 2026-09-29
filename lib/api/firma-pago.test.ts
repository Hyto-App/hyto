import assert from "node:assert/strict";
import test from "node:test";
import { Account, Keypair, Networks, Operation, TransactionBuilder } from "@stellar/stellar-sdk";
import type { SesionFila } from "../db/tipos";
import { crearMemoria } from "../db/memoria";
import { asegurarSemilla } from "../db/semilla";
import { reiniciarLimite } from "../escrow/limite";
import { USDC_SAC_TESTNET } from "../escrow/desplegar";
import { CONTRATO_XDR, FIRMANTE_XDR, xdrDeInvocacion } from "../escrow/prueba-xdr";
import { enviarFirmaHttp, prepararFirmaHttp } from "./firma";

const CONTRATO = "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
const ORGANIZADOR = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
const RECEPTOR = "GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB";
const ADMIN = "GCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC";
const PLATAFORMA = "GDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD";
const RESOLUTOR = "GEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE";

function sesion(wallet: string): SesionFila {
  return {
    token: "tok",
    email: "organizador@demo.hyto",
    usuarioId: "organizador",
    rol: "organizador",
    expiraEn: new Date(Date.now() + 60_000).toISOString(),
    wallet,
  };
}

function pedido(cuerpo: unknown): Request {
  return new Request("http://local/api/firma", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(cuerpo),
  });
}

test("desplegar prepara el escrow y el envío guarda el contrato y el hash", async () => {
  reiniciarLimite();
  const almacen = crearMemoria();
  await asegurarSemilla(almacen);
  await almacen.actualizarTarea("stand", { walletCobro: RECEPTOR });
  const anterior = {
    clave: process.env.TRUSTLESS_API_KEY,
    plataforma: process.env.HYTO_ESCROW_PLATFORM,
    resolutor: process.env.HYTO_ESCROW_RESOLVER,
    admin: process.env.HYTO_ESCROW_ADMIN,
  };
  process.env.TRUSTLESS_API_KEY = "clave-de-prueba";
  process.env.HYTO_ESCROW_PLATFORM = PLATAFORMA;
  process.env.HYTO_ESCROW_RESOLVER = RESOLUTOR;
  process.env.HYTO_ESCROW_ADMIN = ADMIN;
  const original = globalThis.fetch;
  const visto: { cuerpo: Record<string, unknown> | null } = { cuerpo: null };
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.endsWith("/escrow/multi-release/v2/deploy")) {
      visto.cuerpo = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return new Response(JSON.stringify({ unsignedXdr: "AAAA", txHash: "abc", contractId: CONTRATO }), { status: 200 });
    }
    if (url.endsWith("/stellar/send-transaction")) {
      return new Response(JSON.stringify({ txHash: "cd".repeat(32), ledger: 9, contractId: CONTRATO }), { status: 200 });
    }
    throw new Error(`fetch inesperado: ${url}`);
  };
  try {
    const sinRoles = await prepararFirmaHttp(
      sesion(ORGANIZADOR),
      pedido({ accion: "desplegar", tareaId: "stand" }),
      almacen,
    );
    delete process.env.HYTO_ESCROW_PLATFORM;
    const falta = await prepararFirmaHttp(sesion(ORGANIZADOR), pedido({ accion: "desplegar", tareaId: "stand" }), almacen);
    assert.equal(falta.status, 503);
    assert.match(((await falta.json()) as { aviso: string }).aviso, /HYTO_ESCROW_PLATFORM/);
    process.env.HYTO_ESCROW_PLATFORM = PLATAFORMA;
    assert.equal(sinRoles.status, 200);

    const json = (await sinRoles.json()) as { xdr: string; monto: number; contrato: string };
    assert.equal(json.xdr, "AAAA");
    assert.equal(json.monto, 20);
    assert.equal(json.contrato, CONTRATO);
    const cuerpo = visto.cuerpo;
    assert.ok(cuerpo);
    const roles = cuerpo.roles as {
      approvers: string[];
      serviceProviders: string[];
      releaseSigners: string[];
      platform: string;
      admin: string;
    };
    assert.deepEqual(roles.approvers, [ORGANIZADOR]);
    assert.deepEqual(roles.serviceProviders, [ORGANIZADOR]);
    assert.deepEqual(roles.releaseSigners, [ORGANIZADOR]);
    assert.equal(roles.platform, PLATAFORMA);
    assert.equal(roles.admin, ADMIN);
    assert.equal((cuerpo.trustline as { contractId: string }).contractId, USDC_SAC_TESTNET);
    assert.equal((cuerpo.milestones as { receiver: string }[])[0]?.receiver, RECEPTOR);
    assert.equal(cuerpo.platformFee, 0);

    const alta = xdrDeInvocacion({ contrato: CONTRATO_XDR, funcion: "deploy", firmante: FIRMANTE_XDR });
    const enviado = await enviarFirmaHttp(
      sesion(FIRMANTE_XDR),
      pedido({ xdr: alta, accion: "desplegar", tareaId: "stand", contrato: CONTRATO }),
      almacen,
    );
    assert.equal(enviado.status, 200);
    assert.equal((await almacen.leerTarea("stand"))?.contratoEscrow, CONTRATO);

    const pago = xdrDeInvocacion({
      contrato: CONTRATO_XDR,
      funcion: "approve_and_release_milestones",
      firmante: FIRMANTE_XDR,
    });
    const pagado = await enviarFirmaHttp(
      sesion(FIRMANTE_XDR),
      pedido({ xdr: pago, accion: "pagar", tareaId: "stand" }),
      almacen,
    );
    assert.equal(pagado.status, 200);
    const fila = await almacen.leerTarea("stand");
    assert.equal(fila?.estado, "pagado");
    assert.match(fila?.hashPago ?? "", /^[a-f0-9]{64}$/);
  } finally {
    globalThis.fetch = original;
    restaurar("TRUSTLESS_API_KEY", anterior.clave);
    restaurar("HYTO_ESCROW_PLATFORM", anterior.plataforma);
    restaurar("HYTO_ESCROW_RESOLVER", anterior.resolutor);
    restaurar("HYTO_ESCROW_ADMIN", anterior.admin);
    reiniciarLimite();
  }
});

test("un fee-bump no se envía y el aviso habla de XLM", async () => {
  reiniciarLimite();
  const fuente = Keypair.random();
  const inner = new TransactionBuilder(new Account(fuente.publicKey(), "1"), {
    fee: "100",
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(Operation.bumpSequence({ bumpTo: "2" }))
    .setTimeout(30)
    .build();
  const bump = TransactionBuilder.buildFeeBumpTransaction(Keypair.random(), "200", inner, Networks.TESTNET);
  let llamadas = 0;
  const original = globalThis.fetch;
  globalThis.fetch = async () => {
    llamadas += 1;
    throw new Error("no hay que llamar a Trustless");
  };
  try {
    const respuesta = await enviarFirmaHttp(
      sesion(ORGANIZADOR),
      pedido({ xdr: bump.toXDR() }),
      crearMemoria(),
    );
    assert.equal(respuesta.status, 400);
    const aviso = ((await respuesta.json()) as { aviso: string }).aviso;
    assert.match(aviso, /fee-bump/);
    assert.match(aviso, /XLM/);
    assert.equal(llamadas, 0);
  } finally {
    globalThis.fetch = original;
    reiniciarLimite();
  }
});

function restaurar(nombre: string, valor: string | undefined): void {
  if (valor === undefined) delete process.env[nombre];
  else process.env[nombre] = valor;
}
