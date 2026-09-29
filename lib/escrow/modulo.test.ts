import assert from "node:assert/strict";
import test from "node:test";
import { USDC } from "../integrante/identidades";
import { BASE_V1, BASE_V2, claveDeV1, enlacePago, leerEntrada, pedidoAccion, pedidoDespliegue } from "./cuerpos";
import { excedido, reiniciarLimite, respuestaSiExcedido } from "./limite";
import { ErrorFirma, enviar, leerEscrow, preparar, prepararDespliegue, reintentarConFriendbot, respuestaDeErrorFirma, textoDeError } from "./modulo";
import type { CuentasDespliegue } from "./tipos";

const CONTRATO = "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
const ORGANIZADOR = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
const RECEPTOR = "GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB";
const ADMIN = "GCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC";
const PLATAFORMA = "GDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD";
const RESOLUTOR = "GEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE";
const XDR = "AAAA";

function fetchDe(respuesta: unknown, estado = 200): {
  fetch: typeof fetch;
  llamadas: { url: string; method: string; body: unknown; clave: string }[];
} {
  const llamadas: { url: string; method: string; body: unknown; clave: string }[] = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    const crudo = init?.body;
    llamadas.push({
      url: String(input),
      method: init?.method ?? "GET",
      body: typeof crudo === "string" ? (JSON.parse(crudo) as unknown) : null,
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

test("aprobar en v2 no libera el hito", async () => {
  const red = fetchDe({ unsignedXdr: XDR, txHash: "abc" });
  await preparar(
    { accion: "aprobar", contrato: CONTRATO, firmante: ORGANIZADOR, indice: 0 },
    { fetch: red.fetch, clave: "clave-de-prueba" },
  );
  assert.equal(red.llamadas[0]?.method, "POST");
  assert.equal(red.llamadas[0]?.url, `${BASE_V2}/escrow/multi-release/v2/approve-milestones`);
  assert.deepEqual(red.llamadas[0]?.body, {
    contractId: CONTRATO,
    approver: ORGANIZADOR,
    milestoneIndexes: [0],
  });
  assert.equal(red.llamadas[0]?.clave, "clave-de-prueba");
});

test("liberar en v2 pide release-funds", async () => {
  const red = fetchDe({ unsignedXdr: XDR, txHash: "abc" });
  await preparar(
    { accion: "liberar", contrato: CONTRATO, firmante: ORGANIZADOR, indice: 0 },
    { fetch: red.fetch, clave: "clave-de-prueba" },
  );
  assert.equal(red.llamadas[0]?.method, "POST");
  assert.equal(red.llamadas[0]?.url, `${BASE_V2}/escrow/multi-release/v2/release-funds`);
  assert.deepEqual(red.llamadas[0]?.body, {
    contractId: CONTRATO,
    releaseSigner: ORGANIZADOR,
    milestoneIndexes: [0],
  });
  assert.equal(red.llamadas[0]?.clave, "clave-de-prueba");
});

test("disputar en v2 manda el motivo", async () => {
  const red = fetchDe({ unsignedXdr: XDR, txHash: "abc" });
  await preparar(
    { accion: "disputar", contrato: CONTRATO, firmante: ORGANIZADOR, indice: 0, motivo: "La foto no coincide." },
    { fetch: red.fetch, clave: "clave-de-prueba" },
  );
  assert.equal(red.llamadas[0]?.url, `${BASE_V2}/escrow/multi-release/v2/dispute-milestones`);
  assert.deepEqual(red.llamadas[0]?.body, {
    contractId: CONTRATO,
    signer: ORGANIZADOR,
    milestoneIndexes: [0],
    reason: "La foto no coincide.",
  });
});

function fetchResolucion(escrow: Record<string, unknown>): {
  fetch: typeof fetch;
  llamadas: { url: string; method: string; body: unknown; clave: string }[];
} {
  const llamadas: { url: string; method: string; body: unknown; clave: string }[] = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    const crudo = init?.body;
    const method = init?.method ?? "GET";
    llamadas.push({
      url: String(input),
      method,
      body: typeof crudo === "string" ? (JSON.parse(crudo) as unknown) : null,
      clave: new Headers(init?.headers).get("x-api-key") ?? "",
    });
    const cuerpo = method === "GET" ? escrow : { unsignedXdr: XDR, txHash: "abc" };
    return new Response(JSON.stringify(cuerpo), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  return { fetch: fetchImpl, llamadas };
}

function escrowDisputado(monto: string | number = "1", resolutores: string[] = [RESOLUTOR]): Record<string, unknown> {
  return {
    contractId: CONTRATO,
    roles: { disputeResolvers: resolutores },
    milestones: [{ amount: monto, status: "inDispute", flags: { disputed: true, resolved: false } }],
  };
}

test("resolver en v2 reparte el hito en disputa", async () => {
  const red = fetchResolucion(escrowDisputado("1"));
  await preparar(
    {
      accion: "resolver",
      contrato: CONTRATO,
      firmante: RESOLUTOR,
      indice: 0,
      distribuciones: [
        { direccion: RECEPTOR, monto: 0.6 },
        { direccion: ORGANIZADOR, monto: 0.4 },
      ],
    },
    { fetch: red.fetch, clave: "clave-de-prueba" },
  );
  assert.equal(red.llamadas[0]?.method, "GET");
  assert.equal(red.llamadas[0]?.url, `${BASE_V2}/escrow/multi-release/v2/${CONTRATO}`);
  assert.equal(red.llamadas[1]?.url, `${BASE_V2}/escrow/multi-release/v2/resolve-dispute`);
  assert.deepEqual(red.llamadas[1]?.body, {
    contractId: CONTRATO,
    disputeResolver: RESOLUTOR,
    milestoneIndexes: [0],
    distributions: [
      { address: RECEPTOR, amount: 0.6 },
      { address: ORGANIZADOR, amount: 0.4 },
    ],
  });
});

test("resolver solo lo firma el resolutor del escrow", async () => {
  const red = fetchResolucion(escrowDisputado("1"));
  await assert.rejects(
    () =>
      preparar(
        {
          accion: "resolver",
          contrato: CONTRATO,
          firmante: ORGANIZADOR,
          indice: 0,
          distribuciones: [{ direccion: RECEPTOR, monto: 1 }],
        },
        { fetch: red.fetch, clave: "clave-de-prueba" },
      ),
    (error: unknown) => {
      assert.ok(error instanceof ErrorFirma);
      assert.equal(error.estado, 403);
      assert.equal(error.codigo, "ESCROW_ONLY_DISPUTE_RESOLVER_CAN_EXECUTE");
      assert.match(error.message, /resolutor/);
      return true;
    },
  );
  assert.equal(red.llamadas.some((llamada) => llamada.method === "POST"), false);
});

test("si el GET no trae roles, vale el resolutor guardado en el proyecto", async () => {
  const red = fetchResolucion({
    contractId: CONTRATO,
    milestones: [{ amount: "1.0000000", flags: { disputed: true } }],
  });
  await preparar(
    {
      accion: "resolver",
      contrato: CONTRATO,
      firmante: RESOLUTOR,
      indice: 0,
      distribuciones: [{ direccion: RECEPTOR, monto: 1 }],
    },
    { fetch: red.fetch, clave: "clave-de-prueba", guardado: { roles: { disputeResolver: RESOLUTOR } } },
  );
  assert.equal(red.llamadas[1]?.method, "POST");
});

test("el reparto tiene que sumar el monto del hito, en unidades de 10^-7", async () => {
  const corto = fetchResolucion(escrowDisputado("1"));
  await assert.rejects(
    () =>
      preparar(
        {
          accion: "resolver",
          contrato: CONTRATO,
          firmante: RESOLUTOR,
          indice: 0,
          distribuciones: [
            { direccion: RECEPTOR, monto: 0.6 },
            { direccion: ORGANIZADOR, monto: 0.3 },
          ],
        },
        { fetch: corto.fetch, clave: "clave-de-prueba" },
      ),
    (error: unknown) => error instanceof ErrorFirma && error.codigo === "ESCROW_DISTRIBUTIONS_MUST_EQUAL_BALANCE",
  );
  assert.equal(corto.llamadas.some((llamada) => llamada.method === "POST"), false);

  const centavos = fetchResolucion(escrowDisputado("0.3"));
  await preparar(
    {
      accion: "resolver",
      contrato: CONTRATO,
      firmante: RESOLUTOR,
      indice: 0,
      distribuciones: [
        { direccion: RECEPTOR, monto: 0.1 },
        { direccion: ORGANIZADOR, monto: 0.2 },
      ],
    },
    { fetch: centavos.fetch, clave: "clave-de-prueba" },
  );
  assert.equal(centavos.llamadas.at(-1)?.method, "POST");
});

test("un 401 de Trustless no se informa como sesión ausente", async () => {
  const respuesta = respuestaDeErrorFirma(
    new ErrorFirma("Invalid API key.", 401, "AUTH_INVALID_CREDENTIAL"),
    "No se pudo leer el escrow.",
  );
  assert.equal(respuesta.status, 502);
  const json = (await respuesta.json()) as { aviso: string; codigo: string };
  assert.equal(json.codigo, "TRUSTLESS_AUTH");
  assert.match(json.aviso, /AUTH_INVALID_CREDENTIAL/);
  assert.equal(json.aviso.includes("Entra para continuar"), false);
});

test("leer el escrow es un GET del contrato en v2", async () => {
  const red = fetchDe({
    type: "multi-release",
    contractId: CONTRATO,
    balance: 1,
    milestones: [{ status: "completed", released: false }],
  });
  const escrow = await leerEscrow(CONTRATO, { fetch: red.fetch, clave: "clave-de-prueba" });
  assert.equal(red.llamadas[0]?.method, "GET");
  assert.equal(red.llamadas[0]?.url, `${BASE_V2}/escrow/multi-release/v2/${CONTRATO}`);
  assert.equal(red.llamadas[0]?.body, null);
  assert.equal(red.llamadas[0]?.clave, "clave-de-prueba");
  assert.equal(escrow.contractId, CONTRATO);
  assert.equal(escrow.balance, 1);
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

test("el estado de más de 50 caracteres se rechaza", () => {
  const pedido = pedidoAccion(
    { accion: "marcar", contrato: CONTRATO, firmante: RECEPTOR, indice: 0, estado: "e".repeat(51) },
    "v2",
  );
  assert.equal(pedido, "El estado del hito no puede pasar de 50 caracteres.");
});

test("el estado de 50 caracteres sigue siendo válido", () => {
  const pedido = pedidoAccion(
    { accion: "marcar", contrato: CONTRATO, firmante: RECEPTOR, indice: 0, estado: "e".repeat(50) },
    "v2",
  );
  assert.equal(typeof pedido === "string", false);
  if (typeof pedido === "string") return;
  const updates = pedido.cuerpo.updates as { newStatus: string }[];
  assert.equal(updates[0]?.newStatus.length, 50);
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

test("el límite de firma corta después de treinta pedidos", () => {
  reiniciarLimite();
  for (let i = 0; i < 30; i += 1) assert.equal(excedido("prueba"), false);
  assert.equal(excedido("prueba"), true);
  reiniciarLimite();
});

test("leer el escrow no gasta el cupo de la firma", async () => {
  reiniciarLimite();
  const firma = new Request("http://local/api/firma", { headers: { "x-forwarded-for": "10.1.1.1" } });
  const lectura = new Request("http://local/api/escrow/c", { headers: { "x-forwarded-for": "10.1.1.1" } });
  for (let i = 0; i < 30; i += 1) assert.equal(respuestaSiExcedido(firma), null);
  const bloqueada = respuestaSiExcedido(firma);
  assert.equal(bloqueada?.status, 429);
  assert.match(await bloqueada!.json().then((json: { aviso: string }) => json.aviso), /firma/);
  assert.equal(respuestaSiExcedido(lectura, "lectura"), null);
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

test("sin motivo no se disputa", () => {
  const entrada = leerEntrada({ accion: "disputar", contrato: CONTRATO, firmante: ORGANIZADOR, indice: 0 });
  assert.equal("aviso" in entrada, true);
  const largo = pedidoAccion(
    { accion: "disputar", contrato: CONTRATO, firmante: ORGANIZADOR, indice: 0, motivo: "m".repeat(501) },
    "v2",
  );
  assert.equal(largo, "El motivo no puede pasar de 500 caracteres.");
  const justo = pedidoAccion(
    { accion: "disputar", contrato: CONTRATO, firmante: ORGANIZADOR, indice: 0, motivo: "m".repeat(500) },
    "v2",
  );
  assert.equal(typeof justo === "string", false);
});

test("resolver exige un reparto con cuentas y montos", () => {
  const vacio = leerEntrada({ accion: "resolver", contrato: CONTRATO, firmante: RESOLUTOR, indice: 0 });
  assert.equal("aviso" in vacio, true);
  const cero = pedidoAccion(
    {
      accion: "resolver",
      contrato: CONTRATO,
      firmante: RESOLUTOR,
      indice: 0,
      distribuciones: [{ direccion: RECEPTOR, monto: 0 }],
    },
    "v2",
  );
  assert.equal(cero, "Cada monto del reparto tiene que ser mayor que cero.");
  const demasiados = pedidoAccion(
    {
      accion: "resolver",
      contrato: CONTRATO,
      firmante: RESOLUTOR,
      indice: 0,
      distribuciones: Array.from({ length: 51 }, () => ({ direccion: RECEPTOR, monto: 1 })),
    },
    "v2",
  );
  assert.equal(demasiados, "El reparto no puede pasar de 50 destinos.");
});

test("disputar en v1 no arma un pedido", () => {
  const pedido = pedidoAccion(
    { accion: "disputar", contrato: CONTRATO, firmante: ORGANIZADOR, indice: 0, motivo: "falta" },
    "v1",
  );
  assert.equal(typeof pedido, "string");
});

test("una clave inválida conserva el code de Trustless", async () => {
  const formato = fetchDe(
    { code: "AUTH_INVALID_FORMAT", detail: "Invalid API key format.", title: "Unauthorized", status: 401, type: "about:blank" },
    401,
  );
  await assert.rejects(
    () => preparar({ accion: "liberar", contrato: CONTRATO, firmante: ORGANIZADOR, indice: 0 }, { fetch: formato.fetch, clave: "sin-punto" }),
    (error: unknown) => {
      assert.ok(error instanceof ErrorFirma);
      assert.equal(error.codigo, "AUTH_INVALID_FORMAT");
      assert.equal(textoDeError(error), "La clave de Trustless Work tiene que ser id.secreto (AUTH_INVALID_FORMAT).");
      return true;
    },
  );
  const credencial = fetchDe(
    { code: "AUTH_INVALID_CREDENTIAL", detail: "Invalid API key.", title: "Unauthorized", status: 401, type: "about:blank" },
    401,
  );
  await assert.rejects(
    () => leerEscrow(CONTRATO, { fetch: credencial.fetch, clave: "id.ajena" }),
    (error: unknown) => {
      assert.ok(error instanceof ErrorFirma);
      assert.equal(error.codigo, "AUTH_INVALID_CREDENTIAL");
      assert.match(textoDeError(error), /AUTH_INVALID_CREDENTIAL/);
      return true;
    },
  );
});

test("v1 usa otra clave y no la de v2", () => {
  const falta = claveDeV1({ TRUSTLESS_API_KEY: "id.v2" });
  assert.equal("aviso" in falta, true);
  const igual = claveDeV1({ TRUSTLESS_API_KEY: "id.misma", TRUSTLESS_API_KEY_V1: "id.misma" });
  assert.equal("clave" in igual, false);
  const distinta = claveDeV1({ TRUSTLESS_API_KEY: "id.v2", TRUSTLESS_API_KEY_V1: "id.v1" });
  assert.deepEqual(distinta, { clave: "id.v1" });
});

test("la clave pública no reemplaza a la del servidor", async () => {
  let llamadas = 0;
  const fetchImpl: typeof fetch = async () => {
    llamadas += 1;
    return new Response("{}", { status: 200 });
  };
  const anterior = process.env.TRUSTLESS_API_KEY;
  const publica = process.env.NEXT_PUBLIC_TRUSTLESS_API_KEY;
  delete process.env.TRUSTLESS_API_KEY;
  process.env.NEXT_PUBLIC_TRUSTLESS_API_KEY = "id.secreto";
  try {
    await assert.rejects(
      () => leerEscrow(CONTRATO, { fetch: fetchImpl }),
      (error: unknown) => error instanceof ErrorFirma && error.estado === 503,
    );
    assert.equal(llamadas, 0);
  } finally {
    if (anterior === undefined) delete process.env.TRUSTLESS_API_KEY;
    else process.env.TRUSTLESS_API_KEY = anterior;
    if (publica === undefined) delete process.env.NEXT_PUBLIC_TRUSTLESS_API_KEY;
    else process.env.NEXT_PUBLIC_TRUSTLESS_API_KEY = publica;
  }
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
