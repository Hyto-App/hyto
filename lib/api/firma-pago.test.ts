import assert from "node:assert/strict";
import test from "node:test";
import { Account, Address, Keypair, Networks, Operation, TransactionBuilder } from "@stellar/stellar-sdk";
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
  await almacen.asignarOrganizador("zeek", "organizador");
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
      return new Response(
        JSON.stringify({ txHash: "cd".repeat(32), ledger: 9, contractId: CONTRATO_XDR, escrow: { contractId: CONTRATO_XDR } }),
        { status: 200 },
      );
    }
    if (url.includes(`/escrow/multi-release/v2/${CONTRATO_XDR}`)) {
      return new Response(JSON.stringify({ contractId: CONTRATO_XDR, milestones: [{ released: true }] }), {
        status: 200,
      });
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
    assert.equal(cuerpo.engagementId, "hyto-stand");

    const ajena = xdrDeInvocacion({ contrato: CONTRATO_XDR, funcion: "fund_escrow", firmante: FIRMANTE_XDR });
    const noDespliega = await enviarFirmaHttp(
      sesion(FIRMANTE_XDR),
      pedido({ xdr: ajena, accion: "desplegar", tareaId: "stand", contrato: CONTRATO }),
      almacen,
    );
    assert.equal(noDespliega.status, 409);
    assert.equal((await almacen.leerTarea("stand"))?.contratoEscrow, null);

    const alta = xdrDeInvocacion({ contrato: CONTRATO_XDR, funcion: "deploy", firmante: FIRMANTE_XDR });
    const enviado = await enviarFirmaHttp(
      sesion(FIRMANTE_XDR),
      pedido({ xdr: alta, accion: "desplegar", tareaId: "stand", contrato: CONTRATO }),
      almacen,
    );
    assert.equal(enviado.status, 200);
    assert.equal((await almacen.leerTarea("stand"))?.contratoEscrow, CONTRATO_XDR);

    const repetido = await enviarFirmaHttp(
      sesion(FIRMANTE_XDR),
      pedido({ xdr: alta, accion: "desplegar", tareaId: "stand" }),
      almacen,
    );
    assert.equal(repetido.status, 409);

    const otro = Address.contract(new Uint8Array(32).fill(4)).toString();
    const cruzado = xdrDeInvocacion({ contrato: otro, funcion: "release_funds", firmante: FIRMANTE_XDR });
    const noPago = await enviarFirmaHttp(
      sesion(FIRMANTE_XDR),
      pedido({ xdr: cruzado, accion: "liberar", tareaId: "stand" }),
      almacen,
    );
    assert.equal(noPago.status, 403);
    assert.notEqual((await almacen.leerTarea("stand"))?.estado, "pagado");

    const pago = xdrDeInvocacion({ contrato: CONTRATO_XDR, funcion: "release_funds", firmante: FIRMANTE_XDR });
    const pagado = await enviarFirmaHttp(
      sesion(FIRMANTE_XDR),
      pedido({ xdr: pago, accion: "liberar", tareaId: "stand" }),
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

test("el indexador atrasado no guarda el contrato de memoria", async () => {
  reiniciarLimite();
  const almacen = crearMemoria();
  await asegurarSemilla(almacen);
  await almacen.asignarOrganizador("zeek", "organizador");
  await almacen.actualizarTarea("registro", { walletCobro: RECEPTOR });
  const anterior = process.env.TRUSTLESS_API_KEY;
  process.env.TRUSTLESS_API_KEY = "clave-de-prueba";
  process.env.HYTO_ESCROW_PLATFORM = PLATAFORMA;
  process.env.HYTO_ESCROW_RESOLVER = RESOLUTOR;
  process.env.HYTO_ESCROW_ADMIN = ADMIN;
  const original = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/escrow/multi-release/v2/deploy")) {
      return new Response(JSON.stringify({ unsignedXdr: "AAAA", contractId: CONTRATO_XDR }), { status: 200 });
    }
    if (url.endsWith("/stellar/send-transaction")) {
      return new Response(
        JSON.stringify({
          txHash: "ab".repeat(32),
          ledger: 3,
          code: "STELLAR_TX_SUBMITTED_INDEXER_LAGGING",
          message: "indexer lagging",
        }),
        { status: 200 },
      );
    }
    throw new Error(`fetch inesperado: ${url}`);
  };
  try {
    const preparado = await prepararFirmaHttp(sesion(ORGANIZADOR), pedido({ accion: "desplegar", tareaId: "registro" }), almacen);
    assert.equal(preparado.status, 200);
    const alta = xdrDeInvocacion({ contrato: CONTRATO_XDR, funcion: "deploy", firmante: FIRMANTE_XDR });
    const enviado = await enviarFirmaHttp(
      sesion(FIRMANTE_XDR),
      pedido({ xdr: alta, accion: "desplegar", tareaId: "registro", contrato: CONTRATO }),
      almacen,
    );
    assert.equal(enviado.status, 200);
    const json = (await enviado.json()) as { aviso: string };
    assert.match(json.aviso, /indexer/);
    assert.equal((await almacen.leerTarea("registro"))?.contratoEscrow, null);
  } finally {
    globalThis.fetch = original;
    restaurar("TRUSTLESS_API_KEY", anterior);
    reiniciarLimite();
  }
});

test("si la base falla después del envío, la respuesta es 200 con el hash", async () => {
  reiniciarLimite();
  const base = crearMemoria();
  await asegurarSemilla(base);
  await base.asignarOrganizador("zeek", "organizador");
  await base.actualizarTarea("bienvenida", { walletCobro: RECEPTOR });
  const almacen = {
    ...base,
    actualizarTarea: async () => {
      throw new Error("la base no escribe");
    },
  };
  process.env.TRUSTLESS_API_KEY = "clave-de-prueba";
  process.env.HYTO_ESCROW_PLATFORM = PLATAFORMA;
  process.env.HYTO_ESCROW_RESOLVER = RESOLUTOR;
  process.env.HYTO_ESCROW_ADMIN = ADMIN;
  const original = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/escrow/multi-release/v2/deploy")) {
      return new Response(JSON.stringify({ unsignedXdr: "AAAA", contractId: CONTRATO_XDR }), { status: 200 });
    }
    if (url.endsWith("/stellar/send-transaction")) {
      return new Response(JSON.stringify({ txHash: "ef".repeat(32), ledger: 4, contractId: CONTRATO_XDR, escrow: {} }), {
        status: 200,
      });
    }
    throw new Error(`fetch inesperado: ${url}`);
  };
  try {
    assert.equal(
      (await prepararFirmaHttp(sesion(ORGANIZADOR), pedido({ accion: "desplegar", tareaId: "bienvenida" }), almacen)).status,
      200,
    );
    const alta = xdrDeInvocacion({ contrato: CONTRATO_XDR, funcion: "deploy", firmante: FIRMANTE_XDR });
    const enviado = await enviarFirmaHttp(
      sesion(FIRMANTE_XDR),
      pedido({ xdr: alta, accion: "desplegar", tareaId: "bienvenida" }),
      almacen,
    );
    assert.equal(enviado.status, 200);
    const json = (await enviado.json()) as { hash: string; aviso: string };
    assert.equal(json.hash, "ef".repeat(32));
    assert.match(json.aviso, /could not be saved/);
    assert.equal((await base.leerTarea("bienvenida"))?.contratoEscrow, null);
  } finally {
    globalThis.fetch = original;
    reiniciarLimite();
  }
});

test("liberar sin el hito marcado como released no deja la tarea pagada", async () => {
  reiniciarLimite();
  const almacen = crearMemoria();
  await asegurarSemilla(almacen);
  await almacen.asignarOrganizador("zeek", "organizador");
  await almacen.actualizarTarea("comida", { walletCobro: RECEPTOR, contratoEscrow: CONTRATO_XDR });
  process.env.TRUSTLESS_API_KEY = "clave-de-prueba";
  const original = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/stellar/send-transaction")) {
      return new Response(
        JSON.stringify({ txHash: "11".repeat(32), ledger: 5, code: "STELLAR_TX_SUBMITTED", message: "ok" }),
        { status: 200 },
      );
    }
    return new Response(JSON.stringify({ contractId: CONTRATO_XDR, milestones: [{ released: false }] }), {
      status: 200,
    });
  };
  try {
    const pago = xdrDeInvocacion({ contrato: CONTRATO_XDR, funcion: "release_funds", firmante: FIRMANTE_XDR });
    const respuesta = await enviarFirmaHttp(
      sesion(FIRMANTE_XDR),
      pedido({ xdr: pago, accion: "liberar", tareaId: "comida" }),
      almacen,
    );
    assert.equal(respuesta.status, 200);
    assert.match(((await respuesta.json()) as { aviso: string }).aviso, /released/);
    assert.notEqual((await almacen.leerTarea("comida"))?.estado, "pagado");
  } finally {
    globalThis.fetch = original;
    reiniciarLimite();
  }
});

test("un hito v1 con flags.released también se marca pagado", async () => {
  reiniciarLimite();
  const almacen = crearMemoria();
  await asegurarSemilla(almacen);
  await almacen.asignarOrganizador("zeek", "organizador");
  await almacen.actualizarTarea("bienvenida", { walletCobro: RECEPTOR, contratoEscrow: CONTRATO_XDR });
  process.env.TRUSTLESS_API_KEY = "clave-de-prueba";
  const original = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/stellar/send-transaction")) {
      return new Response(JSON.stringify({ txHash: "22".repeat(32), ledger: 6, code: "STELLAR_TX_SUBMITTED" }), { status: 200 });
    }
    return new Response(JSON.stringify({ contractId: CONTRATO_XDR, milestones: [{ flags: { released: true } }] }), {
      status: 200,
    });
  };
  try {
    const pago = xdrDeInvocacion({ contrato: CONTRATO_XDR, funcion: "release_funds", firmante: FIRMANTE_XDR });
    const respuesta = await enviarFirmaHttp(
      sesion(FIRMANTE_XDR),
      pedido({ xdr: pago, accion: "liberar", tareaId: "bienvenida" }),
      almacen,
    );
    assert.equal(respuesta.status, 200);
    assert.equal((await almacen.leerTarea("bienvenida"))?.estado, "pagado");
  } finally {
    globalThis.fetch = original;
    reiniciarLimite();
  }
});

test("un reembolso sin monto o con la revisión fallida no se despliega", async () => {
  reiniciarLimite();
  const almacen = crearMemoria();
  await asegurarSemilla(almacen);
  await almacen.asignarOrganizador("zeek", "organizador");
  await almacen.actualizarTarea("comida", { walletCobro: RECEPTOR });
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
  globalThis.fetch = async () => {
    throw new Error("no hay que desplegar");
  };
  try {
    await almacen.actualizarEvidencia("ejemplo-comida", { monto: null, fecha: null });
    const sinMonto = await prepararFirmaHttp(sesion(ORGANIZADOR), pedido({ accion: "desplegar", tareaId: "comida" }), almacen);
    assert.equal(sinMonto.status, 409);
    assert.equal(((await sinMonto.json()) as { aviso: string }).aviso, "Review pending");

    await almacen.actualizarEvidencia("ejemplo-comida", { monto: "12.40", fecha: "2026-09-27" });
    const guardado = await almacen.veredictoDe("ejemplo-comida");
    assert.ok(guardado);
    await almacen.guardarVeredicto({ ...guardado, origen: "error", choice: "sin_clave", frase: "La IA no está configurada" });
    const fallida = await prepararFirmaHttp(sesion(ORGANIZADOR), pedido({ accion: "desplegar", tareaId: "comida" }), almacen);
    assert.equal(fallida.status, 409);
    assert.equal(((await fallida.json()) as { aviso: string }).aviso, "Review pending");
  } finally {
    globalThis.fetch = original;
    restaurar("TRUSTLESS_API_KEY", anterior.clave);
    restaurar("HYTO_ESCROW_PLATFORM", anterior.plataforma);
    restaurar("HYTO_ESCROW_RESOLVER", anterior.resolutor);
    restaurar("HYTO_ESCROW_ADMIN", anterior.admin);
    reiniciarLimite();
  }
});

test("un reembolso no se despliega ni se fondea hasta confirmar un monto dentro del tope", async () => {
  reiniciarLimite();
  const almacen = crearMemoria();
  await asegurarSemilla(almacen);
  await almacen.asignarOrganizador("zeek", "organizador");
  await almacen.actualizarTarea("comida", { walletCobro: RECEPTOR });
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
  const montos: number[] = [];
  const fondeos: number[] = [];
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    const cuerpo = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : null;
    if (url.endsWith("/escrow/multi-release/v2/deploy")) {
      const hitos = cuerpo?.milestones as { amount?: number }[] | undefined;
      montos.push(hitos?.[0]?.amount ?? Number.NaN);
      return new Response(JSON.stringify({ unsignedXdr: "AAAA", txHash: "abc", contractId: CONTRATO }), { status: 200 });
    }
    if (url.endsWith("/escrow/multi-release/v2/fund")) {
      fondeos.push(typeof cuerpo?.amount === "number" ? cuerpo.amount : Number.NaN);
      return new Response(JSON.stringify({ unsignedXdr: "BBBB", txHash: "def" }), { status: 200 });
    }
    throw new Error(`fetch inesperado: ${url}`);
  };
  try {
    await almacen.actualizarEvidencia("ejemplo-comida", { monto: "20", montoConfirmado: null });
    const bloqueado = await prepararFirmaHttp(sesion(ORGANIZADOR), pedido({ accion: "desplegar", tareaId: "comida" }), almacen);
    assert.equal(bloqueado.status, 409);
    assert.equal(
      ((await bloqueado.json()) as { aviso: string }).aviso,
      "Confirm an amount within the limit before deploying.",
    );
    assert.equal(montos.length, 0);
    assert.equal((await almacen.leerEvidencia("ejemplo-comida"))?.monto, "20");

    await almacen.actualizarEvidencia("ejemplo-comida", { montoConfirmado: "16" });
    const alto = await prepararFirmaHttp(sesion(ORGANIZADOR), pedido({ accion: "desplegar", tareaId: "comida" }), almacen);
    assert.equal(alto.status, 409);
    assert.equal(montos.length, 0);

    await almacen.actualizarEvidencia("ejemplo-comida", { montoConfirmado: "12.40" });
    const listo = await prepararFirmaHttp(sesion(ORGANIZADOR), pedido({ accion: "desplegar", tareaId: "comida" }), almacen);
    assert.equal(listo.status, 200);
    const json = (await listo.json()) as { monto: number };
    assert.equal(json.monto, 12.4);
    assert.equal(montos.at(-1), 12.4);
    assert.equal((await almacen.leerEvidencia("ejemplo-comida"))?.monto, "20");

    await almacen.actualizarTarea("comida", { contratoEscrow: CONTRATO });
    const fondeoAlto = await prepararFirmaHttp(
      sesion(ORGANIZADOR),
      pedido({ accion: "fondear", tareaId: "comida", contrato: CONTRATO, firmante: ORGANIZADOR, monto: 99 }),
      almacen,
    );
    assert.equal(fondeoAlto.status, 200);
    assert.equal(fondeos.at(-1), 12.4);

    await almacen.actualizarEvidencia("ejemplo-comida", { montoConfirmado: null });
    const fondeoBloqueado = await prepararFirmaHttp(
      sesion(ORGANIZADOR),
      pedido({ accion: "fondear", tareaId: "comida", contrato: CONTRATO, firmante: ORGANIZADOR, monto: 99 }),
      almacen,
    );
    assert.equal(fondeoBloqueado.status, 409);
    assert.equal(
      ((await fondeoBloqueado.json()) as { aviso: string }).aviso,
      "Confirm an amount within the limit before funding.",
    );
  } finally {
    globalThis.fetch = original;
    restaurar("TRUSTLESS_API_KEY", anterior.clave);
    restaurar("HYTO_ESCROW_PLATFORM", anterior.plataforma);
    restaurar("HYTO_ESCROW_RESOLVER", anterior.resolutor);
    restaurar("HYTO_ESCROW_ADMIN", anterior.admin);
    reiniciarLimite();
  }
});

function restaurar(nombre: string, valor: string | undefined): void {
  if (valor === undefined) delete process.env[nombre];
  else process.env[nombre] = valor;
}
