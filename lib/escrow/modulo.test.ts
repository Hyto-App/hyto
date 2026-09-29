import assert from "node:assert/strict";
import test from "node:test";
import { USDC } from "../integrante/identidades";
import { BASE_V1, BASE_V2, enlacePago, leerEntrada, pedidoAccion, pedidoDespliegue } from "./cuerpos";
import { clienteDe, excedido, leerJsonAcotado, reiniciarLimite } from "./limite";
import { ErrorFirma, enviar, preparar, prepararDespliegue, reintentarConFriendbot } from "./modulo";
import type { CuentasDespliegue } from "./tipos";

const CONTRATO = "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
const ORGANIZADOR = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
const RECEPTOR = "GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB";
const ADMIN = "GCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC";
const PLATAFORMA = "GDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD";
const RESOLUTOR = "GEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE";
const XDR = "AAAA";

function fetchDe(respuesta: unknown, estado = 200): { fetch: typeof fetch; llamadas: { url: string; body: unknown; clave: string }[] } {
  const llamadas: { url: string; body: unknown; clave: string }[] = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    llamadas.push({
      url: String(input),
      body: JSON.parse(String(init?.body ?? "null")) as unknown,
      clave: new Headers(init?.headers).get("x-api-key") ?? "",
    });
    return new Response(JSON.stringify(respuesta), {
      status: estado,
      headers: { "Content-Type": "application/json" },
    });
  };
  return { fetch: fetchImpl, llamadas };
}

function cuentas(red: CuentasDespliegue["red"]): CuentasDespliegue {
  return {
    red,
    firmante: ADMIN,
    organizador: ORGANIZADOR,
    receptor: RECEPTOR,
    proveedor: RECEPTOR,
    admin: ADMIN,
    plataforma: PLATAFORMA,
    resolutor: RESOLUTOR,
    monto: 1,
    titulo: "Hito de prueba",
    descripcion: "Un hito para el ensayo de Hyto.",
    hito: "Foto de prueba",
    engagementId: "hyto-hito-prueba",
    trustline: { contractId: "CUSDCCONTRACT", symbol: USDC.code, address: USDC.issuer },
    comision: 0,
  };
}

test("fondear en v2 pide el XDR y no lo firma", async () => {
  const red = fetchDe({ unsignedXdr: XDR, txHash: "abc" });
  const listo = await preparar(
    { accion: "fondear", contrato: CONTRATO, firmante: ORGANIZADOR, monto: 1 },
    { fetch: red.fetch, clave: "clave-de-prueba", red: "v2" },
  );
  assert.equal(listo.xdr, XDR);
  assert.equal(listo.hashPreparado, "abc");
  assert.equal(red.llamadas[0]?.url, `${BASE_V2}/escrow/multi-release/v2/fund`);
  assert.deepEqual(red.llamadas[0]?.body, { contractId: CONTRATO, signer: ORGANIZADOR, amount: 1 });
  assert.equal(red.llamadas[0]?.clave, "clave-de-prueba");
});

test("aprobar en v2 es una sola firma de approve-and-release", async () => {
  const red = fetchDe({ unsignedXdr: XDR, txHash: "abc" });
  await preparar(
    { accion: "aprobar", contrato: CONTRATO, firmante: ORGANIZADOR, indice: 0 },
    { fetch: red.fetch, clave: "clave-de-prueba" },
  );
  assert.equal(red.llamadas[0]?.url, `${BASE_V2}/escrow/multi-release/v2/approve-and-release-milestones`);
  assert.deepEqual(red.llamadas[0]?.body, {
    contractId: CONTRATO,
    signer: ORGANIZADOR,
    milestoneIndexes: [0],
  });
});

test("marcar adjunta la referencia de la evidencia", async () => {
  const pedido = pedidoAccion(
    { accion: "marcar", contrato: CONTRATO, firmante: RECEPTOR, indice: 0, estado: "completed", evidencia: "foto-1" },
    "v2",
  );
  assert.equal(typeof pedido === "string", false);
  if (typeof pedido === "string") return;
  assert.equal(pedido.ruta, "/escrow/multi-release/v2/change-milestone-status");
  assert.deepEqual(pedido.cuerpo.updates, [{ index: 0, newStatus: "completed", newEvidence: "foto-1" }]);
});

test("enviar manda el XDR firmado y devuelve el hash", async () => {
  const red = fetchDe({ txHash: "deadbeef", ledger: 12, code: "STELLAR_TX_SUBMITTED" });
  const pago = await enviar("FIRMADO", { fetch: red.fetch, clave: "clave-de-prueba" });
  assert.equal(pago.hash, "deadbeef");
  assert.equal(pago.ledger, 12);
  assert.deepEqual(red.llamadas[0]?.body, { signedXdr: "FIRMADO" });
  assert.equal(red.llamadas[0]?.url, `${BASE_V2}/stellar/send-transaction`);
  assert.equal(enlacePago(pago.hash ?? ""), "https://stellar.expert/explorer/testnet/tx/deadbeef");
});

test("si el envío rechaza el fee-bump, se puede reintentar con Friendbot", async () => {
  const red = fetchDe(
    { code: "STELLAR_TX_FEE_BUMP_REJECTED", detail: "no", title: "no", status: 400, type: "about:blank" },
    400,
  );
  await assert.rejects(
    () => enviar("FIRMADO", { fetch: red.fetch, clave: "clave-de-prueba" }),
    (error: unknown) => {
      assert.equal(reintentarConFriendbot(error), true);
      assert.ok(error instanceof ErrorFirma);
      assert.match(error.message, /fee-bump/);
      return true;
    },
  );
});

test("send-transaction sin hash es un envío exitoso y no inventa el hash", async () => {
  const red = fetchDe({ status: "SUCCESS", message: "Transaction sent", contractId: CONTRATO });
  const pago = await enviar("FIRMADO", { fetch: red.fetch, clave: "clave-de-prueba", red: "v1" });
  assert.equal(pago.hash, null);
  assert.equal(pago.estado, "SUCCESS");
  assert.equal(pago.mensaje, "Transaction sent");
  assert.equal(pago.contrato, CONTRATO);
  assert.equal(red.llamadas[0]?.url, `${BASE_V1}/helper/send-transaction`);
  assert.deepEqual(red.llamadas[0]?.body, { signedXdr: "FIRMADO" });
});

test("send-transaction con status distinto de SUCCESS no es un pago", async () => {
  const red = fetchDe({ status: "FAILED", message: "no llegó" });
  await assert.rejects(
    () => enviar("FIRMADO", { fetch: red.fetch, clave: "clave-de-prueba", red: "v1" }),
    (error: unknown) => error instanceof ErrorFirma && /no llegó/.test(error.message),
  );
});

test("indice null no se convierte en el primer hito", () => {
  const entrada = leerEntrada({
    accion: "aprobar",
    contrato: CONTRATO,
    firmante: ORGANIZADOR,
    indice: null,
  });
  assert.equal("aviso" in entrada, true);
  if (!("aviso" in entrada)) return;
  assert.match(entrada.aviso, /hito/);
});

test("sin indice no se usa el primer hito", () => {
  const entrada = leerEntrada({ accion: "marcar", contrato: CONTRATO, firmante: RECEPTOR, estado: "completed" });
  assert.equal("aviso" in entrada, true);
});

test("el indice 0 sigue siendo el primer hito", () => {
  const entrada = leerEntrada({ accion: "aprobar", contrato: CONTRATO, firmante: ORGANIZADOR, indice: 0 });
  assert.equal("aviso" in entrada, false);
  if ("aviso" in entrada || entrada.accion === "fondear") return;
  assert.equal(entrada.indice, 0);
});

test("la evidencia de más de 500 caracteres se rechaza", () => {
  const pedido = pedidoAccion(
    {
      accion: "marcar",
      contrato: CONTRATO,
      firmante: RECEPTOR,
      indice: 0,
      estado: "completed",
      evidencia: "a".repeat(501),
    },
    "v2",
  );
  assert.equal(pedido, "La evidencia no puede pasar de 500 caracteres.");
});

test("un 401 de Trustless no copia el detalle", async () => {
  const red = fetchDe({ detail: "Invalid API key", code: "AUTH_INVALID_CREDENTIAL" }, 401);
  await assert.rejects(
    () => enviar("FIRMADO", { fetch: red.fetch, clave: "clave-de-prueba" }),
    (error: unknown) => {
      assert.ok(error instanceof ErrorFirma);
      assert.equal(error.message, "No se pudo autorizar el pago.");
      assert.equal(error.codigo, "AUTH_INVALID_CREDENTIAL");
      return true;
    },
  );
});

test("el límite usa la IP de Vercel y no la primera del encabezado", () => {
  const conReal = new Request("http://local/api/firma", {
    headers: { "x-forwarded-for": "1.1.1.1, 2.2.2.2", "x-real-ip": "203.0.113.10" },
  });
  assert.equal(clienteDe(conReal), "203.0.113.10");
  const sinReal = new Request("http://local/api/firma", { headers: { "x-forwarded-for": "1.1.1.1, 2.2.2.2" } });
  assert.equal(clienteDe(sinReal), "2.2.2.2");
});

test("un cuerpo por encima del tope responde 413", async () => {
  const largo = new Request("http://local/api/firma", { method: "POST", body: "x".repeat(200_001) });
  const porLargo = await leerJsonAcotado(largo);
  assert.ok(porLargo instanceof Response);
  if (!(porLargo instanceof Response)) return;
  assert.equal(porLargo.status, 413);

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(200_001));
      controller.close();
    },
  });
  const fragmentado = new Request("http://local/api/firma", {
    method: "POST",
    body: stream,
    duplex: "half",
  } as RequestInit & { duplex: "half" });
  const porStream = await leerJsonAcotado(fragmentado);
  assert.ok(porStream instanceof Response);
  if (!(porStream instanceof Response)) return;
  assert.equal(porStream.status, 413);
});

test("el límite de firma corta después de treinta pedidos", () => {
  reiniciarLimite();
  for (let i = 0; i < 30; i += 1) assert.equal(excedido("prueba"), false);
  assert.equal(excedido("prueba"), true);
  reiniciarLimite();
});

test("sin clave no llama a la red", async () => {
  let llamadas = 0;
  const fetchImpl: typeof fetch = async () => {
    llamadas += 1;
    return new Response("{}", { status: 200 });
  };
  const anterior = process.env.TRUSTLESS_API_KEY;
  delete process.env.TRUSTLESS_API_KEY;
  try {
    await assert.rejects(
      () => preparar({ accion: "fondear", contrato: CONTRATO, firmante: ORGANIZADOR, monto: 1 }, { fetch: fetchImpl }),
      (error: unknown) => error instanceof ErrorFirma && error.estado === 503,
    );
    assert.equal(llamadas, 0);
  } finally {
    if (anterior === undefined) delete process.env.TRUSTLESS_API_KEY;
    else process.env.TRUSTLESS_API_KEY = anterior;
  }
});

test("el despliegue v2 separa al admin y pone al organizador en las dos listas", () => {
  const pedido = pedidoDespliegue(cuentas("v2"));
  assert.equal(typeof pedido === "string", false);
  if (typeof pedido === "string") return;
  assert.equal(pedido.ruta, "/escrow/multi-release/v2/deploy");
  const roles = pedido.cuerpo.roles as { approvers: string[]; releaseSigners: string[]; admin: string };
  assert.deepEqual(roles.approvers, [ORGANIZADOR]);
  assert.deepEqual(roles.releaseSigners, [ORGANIZADOR]);
  assert.equal(roles.admin, ADMIN);
  assert.equal((pedido.cuerpo.trustline as { contractId: string }).contractId, "CUSDCCONTRACT");
});

test("v1 usa la otra base y parte aprobar de liberar", () => {
  const aprobar = pedidoAccion({ accion: "aprobar", contrato: CONTRATO, firmante: ORGANIZADOR, indice: 0 }, "v1");
  const liberar = pedidoAccion({ accion: "liberar", contrato: CONTRATO, firmante: ORGANIZADOR, indice: 0 }, "v1");
  assert.equal(typeof aprobar === "string", false);
  assert.equal(typeof liberar === "string", false);
  if (typeof aprobar === "string" || typeof liberar === "string") return;
  assert.equal(aprobar.ruta, "/escrow/multi-release/approve-milestone");
  assert.equal(liberar.ruta, "/escrow/multi-release/release-milestone-funds");
  assert.equal(BASE_V1, "https://dev.api.trustlesswork.com");
});

test("el admin no puede ser el receptor", async () => {
  const mal = cuentas("v2");
  mal.admin = RECEPTOR;
  mal.firmante = RECEPTOR;
  await assert.rejects(
    () => prepararDespliegue(mal, { clave: "clave-de-prueba", fetch: async () => new Response("{}") }),
    (error: unknown) => error instanceof ErrorFirma && /admin/.test(error.message),
  );
});

test("v1 marca el estado con un solo proveedor", () => {
  const deV1 = cuentas("v1");
  deV1.proveedor = ORGANIZADOR;
  deV1.admin = null;
  deV1.firmante = ORGANIZADOR;
  const pedido = pedidoDespliegue(deV1);
  assert.equal(typeof pedido === "string", false);
  if (typeof pedido === "string") return;
  assert.equal(pedido.ruta, "/deployer/multi-release");
  const roles = pedido.cuerpo.roles as { serviceProvider: string; approver: string };
  assert.equal(roles.serviceProvider, ORGANIZADOR);
  assert.equal(roles.approver, ORGANIZADOR);
  assert.equal("admin" in roles, false);
});
