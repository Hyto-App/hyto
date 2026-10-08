import assert from "node:assert/strict";
import test from "node:test";
import { crearMemoria } from "../db/memoria";
import type { Almacen } from "../db/almacen";
import type { SesionFila, TareaFila } from "../db/tipos";
import { reiniciarLimite } from "../escrow/limite";
import { AVISO_MARCA_PENDIENTE, AVISO_PAGO_PARCIAL, AVISO_SOLO_TRABAJADOR } from "../escrow/reserva";
import { asignarTareaHttp, sincronizarCobroParaReserva } from "./asignar";
import { prepararFirmaHttp } from "./firma";

const CREADO = "2026-10-08T00:00:00.000Z";
const ORGANIZADOR = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
const RECEPTOR = "GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB";
const ADMIN = "GCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC";
const PLATAFORMA = "GDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD";
const RESOLUTOR = "GEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE";
const CONTRATO = "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
const SECRETO = "hyto-token-secret-for-tests-32ch";

const trabajo: TareaFila = {
  id: "t1",
  proyectoId: "evt",
  titulo: "Booth",
  tipo: "trabajo",
  monto: "20",
  tope: null,
  condicion: "Banner visible",
  miembroId: "",
  walletCobro: "",
  estado: "pendiente",
  hashPago: null,
  credencialUrl: null,
  contratoEscrow: null,
  prioridad: "normal",
  dificultad: null,
};

function sesion(usuarioId: string, wallet: string): SesionFila {
  return {
    token: `tok-${usuarioId}`,
    email: `${usuarioId}@hyto.app`,
    usuarioId,
    rol: usuarioId === "org" ? "organizador" : "voluntario",
    expiraEn: "2099-01-01T00:00:00.000Z",
    wallet,
  };
}

function pedido(body: unknown): Request {
  return new Request("http://local/api/firma", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function evento(tareas: TareaFila[] = [trabajo]): Promise<Almacen> {
  const almacen = crearMemoria();
  await almacen.insertarUsuario({ id: "org", email: "org@hyto.app", nombre: "Org", rol: "organizador" });
  await almacen.insertarUsuario({ id: "vol", email: "vol@hyto.app", nombre: "Vol", rol: "voluntario" });
  await almacen.crearProyecto({ id: "evt", nombre: "Event", creadoEn: CREADO, organizadorId: "org" }, tareas);
  await almacen.guardarMiembro({ proyectoId: "evt", usuarioId: "vol", rol: "volunteer", estado: "active", creadoEn: CREADO });
  return almacen;
}

async function conBandera<T>(valor: string | undefined, fn: () => Promise<T>): Promise<T> {
  const previo = process.env.HYTO_ESCROW_V2;
  if (valor === undefined) delete process.env.HYTO_ESCROW_V2;
  else process.env.HYTO_ESCROW_V2 = valor;
  try {
    return await fn();
  } finally {
    if (previo === undefined) delete process.env.HYTO_ESCROW_V2;
    else process.env.HYTO_ESCROW_V2 = previo;
  }
}

function rolesDePrueba(): () => void {
  const anterior = {
    clave: process.env.TRUSTLESS_API_KEY,
    plataforma: process.env.HYTO_ESCROW_PLATFORM,
    resolutor: process.env.HYTO_ESCROW_RESOLVER,
    admin: process.env.HYTO_ESCROW_ADMIN,
    secreto: process.env.HYTO_TOKEN_SECRET,
  };
  process.env.TRUSTLESS_API_KEY = "clave-de-prueba";
  process.env.HYTO_ESCROW_PLATFORM = PLATAFORMA;
  process.env.HYTO_ESCROW_RESOLVER = RESOLUTOR;
  process.env.HYTO_ESCROW_ADMIN = ADMIN;
  process.env.HYTO_TOKEN_SECRET = SECRETO;
  return () => {
    restaurar("TRUSTLESS_API_KEY", anterior.clave);
    restaurar("HYTO_ESCROW_PLATFORM", anterior.plataforma);
    restaurar("HYTO_ESCROW_RESOLVER", anterior.resolutor);
    restaurar("HYTO_ESCROW_ADMIN", anterior.admin);
    restaurar("HYTO_TOKEN_SECRET", anterior.secreto);
  };
}

function restaurar(nombre: string, valor: string | undefined) {
  if (valor === undefined) delete process.env[nombre];
  else process.env[nombre] = valor;
}

function horizonte(input: RequestInfo | URL): boolean {
  return String(input).includes("horizon");
}

test("al asignar, la bandera apagada no reserva y la encendida reserva antes de la foto", async () => {
  const almacen = await evento();
  await almacen.crearSesion(sesion("vol", RECEPTOR));
  const cuerpo = { usuarioId: "vol" };
  const solicitud = () =>
    new Request("http://local/api/tareas/t1/asignar", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(cuerpo),
    });

  const apagada = await conBandera(undefined, () => asignarTareaHttp(solicitud(), almacen, "t1", "org"));
  assert.equal(apagada.status, 200);
  assert.deepEqual(await apagada.json(), { tareaId: "t1", miembroId: "vol" });
  assert.equal((await almacen.leerTarea("t1"))?.walletCobro, "");
  await almacen.actualizarTarea("t1", { miembroId: "" });

  const lista = await conBandera("on", () => asignarTareaHttp(solicitud(), almacen, "t1", "org"));
  assert.equal(lista.status, 200);
  const json = (await lista.json()) as { reservar: boolean; motivo: string; monto: number; walletCobro: string; escrowV2: boolean };
  assert.equal(json.escrowV2, true);
  assert.equal(json.reservar, true);
  assert.equal(json.motivo, "ready");
  assert.equal(json.monto, 20);
  assert.equal(json.walletCobro, RECEPTOR);
  assert.equal((await almacen.leerTarea("t1"))?.walletCobro, RECEPTOR);
  assert.equal((await almacen.listarEvidencias("t1")).length, 0);

  const sinWallet = await evento();
  const espera = await conBandera("on", () => asignarTareaHttp(solicitud(), sinWallet, "t1", "org"));
  const vacia = (await espera.json()) as { reservar: boolean; motivo: string };
  assert.equal(vacia.reservar, false);
  assert.equal(vacia.motivo, "no-wallet");

  await almacen.actualizarTarea("t1", { contratoEscrow: CONTRATO });
  const ya = await conBandera("on", () => asignarTareaHttp(solicitud(), almacen, "t1", "org"));
  assert.equal(ya.status, 409);
  assert.equal((await almacen.leerTarea("t1"))?.contratoEscrow, CONTRATO);
  assert.equal((await almacen.listarEvidencias("t1")).length, 0);
});

test("una tarea ya asignada copia la wallet cuando la bandera está encendida", async () => {
  const almacen = await evento([{ ...trabajo, miembroId: "vol" }]);
  await conBandera(undefined, () => sincronizarCobroParaReserva(almacen, [trabajo]));
  assert.equal((await almacen.leerTarea("t1"))?.walletCobro, "");
  await almacen.crearSesion(sesion("vol", RECEPTOR));
  const filas = [((await almacen.leerTarea("t1")) ?? trabajo)];
  await conBandera("on", () => sincronizarCobroParaReserva(almacen, filas));
  assert.equal(filas[0]?.walletCobro, RECEPTOR);
  assert.equal((await almacen.leerTarea("t1"))?.walletCobro, RECEPTOR);
});

test("con protección el despliegue usa al trabajador y no espera la foto", async () => {
  reiniciarLimite();
  const comida: TareaFila = {
    ...trabajo,
    id: "comida",
    titulo: "Meal",
    tipo: "reembolso",
    monto: "15",
    tope: "15",
    miembroId: "vol",
    walletCobro: RECEPTOR,
  };
  const almacen = await evento([comida]);
  const restaurarRoles = rolesDePrueba();
  const original = globalThis.fetch;
  const visto: { cuerpo: Record<string, unknown> | null; llamadas: number } = { cuerpo: null, llamadas: 0 };
  globalThis.fetch = async (input, init) => {
    visto.llamadas += 1;
    const url = String(input);
    if (horizonte(input)) {
      return new Response(
        JSON.stringify({
          balances: [{ balance: "1000", asset_code: "USDC", asset_issuer: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5" }],
        }),
        { status: 200 },
      );
    }
    if (url.endsWith("/escrow/multi-release/v2/deploy")) {
      visto.cuerpo = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return new Response(JSON.stringify({ unsignedXdr: "AAAA", txHash: "abc", contractId: CONTRATO }), { status: 200 });
    }
    throw new Error(`fetch inesperado: ${url}`);
  };
  try {
    const apagado = await conBandera(undefined, () =>
      prepararFirmaHttp(sesion("org", ORGANIZADOR), pedido({ accion: "desplegar", tareaId: "comida" }), almacen),
    );
    assert.equal(apagado.status, 409);
    assert.equal(((await apagado.json()) as { aviso: string }).aviso, "Review pending");
    assert.equal(visto.cuerpo === null, true);

    const encendido = await conBandera("on", () =>
      prepararFirmaHttp(sesion("org", ORGANIZADOR), pedido({ accion: "desplegar", tareaId: "comida" }), almacen),
    );
    assert.equal(encendido.status, 200);
    const json = (await encendido.json()) as { monto: number; contrato: string };
    assert.equal(json.monto, 15);
    assert.equal(json.contrato, CONTRATO);
    assert.equal((await almacen.listarEvidencias("comida")).length, 0);
    const cuerpo = visto.cuerpo;
    if (!cuerpo) throw new Error("missing deploy body");
    assert.equal(cuerpo.engagementId, "hyto-v2-comida");
    const roles = cuerpo.roles as { approvers: string[]; serviceProviders: string[]; releaseSigners: string[]; disputeResolvers: string[] };
    assert.deepEqual(roles.approvers, [ORGANIZADOR]);
    assert.deepEqual(roles.serviceProviders, [RECEPTOR]);
    assert.deepEqual(roles.releaseSigners, [ORGANIZADOR]);
    assert.deepEqual(roles.disputeResolvers, [RESOLUTOR]);
    assert.equal((cuerpo.milestones as { receiver: string; amount: number }[])[0]?.receiver, RECEPTOR);
    assert.equal((cuerpo.milestones as { amount: number }[])[0]?.amount, 15);
  } finally {
    globalThis.fetch = original;
    restaurarRoles();
    reiniciarLimite();
  }
});

test("solo el trabajador marca, y pagar junto exige la marca", async () => {
  reiniciarLimite();
  const almacen = await evento();
  await almacen.actualizarTarea("t1", { miembroId: "vol", walletCobro: RECEPTOR, contratoEscrow: CONTRATO });
  const restaurarRoles = rolesDePrueba();
  const original = globalThis.fetch;
  const visto: { ruta: string; cuerpo: Record<string, unknown> | null } = { ruta: "", cuerpo: null };
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    visto.ruta = url;
    if (init?.body) visto.cuerpo = JSON.parse(String(init.body)) as Record<string, unknown>;
    if (url.endsWith("/change-milestone-status") || url.endsWith("/dispute-milestones")) {
      return new Response(JSON.stringify({ unsignedXdr: "AAAA", txHash: "abc" }), { status: 200 });
    }
    if (url.endsWith("/approve-and-release-milestones")) {
      return new Response(JSON.stringify({ unsignedXdr: "BBBB", txHash: "def" }), { status: 200 });
    }
    if (url.includes(`/escrow/multi-release/v2/${CONTRATO}`)) {
      return new Response(JSON.stringify({ contractId: CONTRATO, milestones: [{ status: "pending" }] }), { status: 200 });
    }
    throw new Error(`fetch inesperado: ${url}`);
  };
  try {
    const ajeno = await conBandera("on", () =>
      prepararFirmaHttp(
        sesion("org", ORGANIZADOR),
        pedido({ accion: "marcar", tareaId: "t1", contrato: CONTRATO, indice: 0, estado: "completed" }),
        almacen,
      ),
    );
    assert.equal(ajeno.status, 403);
    assert.equal(((await ajeno.json()) as { aviso: string }).aviso, AVISO_SOLO_TRABAJADOR);

    const apagado = await conBandera(undefined, () =>
      prepararFirmaHttp(
        sesion("vol", RECEPTOR),
        pedido({
          accion: "marcar",
          tareaId: "t1",
          contrato: CONTRATO,
          firmante: RECEPTOR,
          indice: 0,
          estado: "completed",
        }),
        almacen,
      ),
    );
    assert.equal(apagado.status, 403);

    const marcado = await conBandera("on", () =>
      prepararFirmaHttp(
        sesion("vol", RECEPTOR),
        pedido({
          accion: "marcar",
          tareaId: "t1",
          contrato: CONTRATO,
          indice: 0,
          estado: "completed",
          evidencia: "hyto-evidence:foto-1",
        }),
        almacen,
      ),
    );
    assert.equal(marcado.status, 200);
    assert.match(visto.ruta, /change-milestone-status$/);
    assert.equal(visto.cuerpo?.serviceProvider, RECEPTOR);
    const updates = visto.cuerpo?.updates as { newEvidence?: string; newStatus?: string }[];
    assert.equal(updates[0]?.newStatus, "completed");
    assert.equal(updates[0]?.newEvidence, "hyto-evidence:foto-1");

    const disputa = await conBandera("on", () =>
      prepararFirmaHttp(
        sesion("vol", RECEPTOR),
        pedido({ accion: "disputar", tareaId: "t1", contrato: CONTRATO, indice: 0, motivo: "The organizer did not pay." }),
        almacen,
      ),
    );
    assert.equal(disputa.status, 200);
    assert.equal(visto.cuerpo?.signer, RECEPTOR);

    const juntoApagado = await conBandera(undefined, () =>
      prepararFirmaHttp(
        sesion("org", ORGANIZADOR),
        pedido({ accion: "aprobarLiberar", tareaId: "t1", contrato: CONTRATO, firmante: ORGANIZADOR, indice: 0 }),
        almacen,
      ),
    );
    assert.equal(juntoApagado.status, 409);
    assert.match(((await juntoApagado.json()) as { aviso: string }).aviso, /turned off/);

    const sinMarca = await conBandera("on", () =>
      prepararFirmaHttp(
        sesion("org", ORGANIZADOR),
        pedido({ accion: "aprobarLiberar", tareaId: "t1", contrato: CONTRATO, indice: 0 }),
        almacen,
      ),
    );
    assert.equal(sinMarca.status, 409);
    assert.equal(((await sinMarca.json()) as { aviso: string }).aviso, AVISO_MARCA_PENDIENTE);

    globalThis.fetch = async (input, init) => {
      const url = String(input);
      visto.ruta = url;
      if (init?.body) visto.cuerpo = JSON.parse(String(init.body)) as Record<string, unknown>;
      if (url.includes(`/escrow/multi-release/v2/${CONTRATO}`) && !init?.body) {
        return new Response(
          JSON.stringify({ contractId: CONTRATO, milestones: [{ status: "completed", evidence: "hyto-evidence:foto-1" }] }),
          { status: 200 },
        );
      }
      if (url.endsWith("/approve-and-release-milestones")) {
        return new Response(JSON.stringify({ unsignedXdr: "BBBB", txHash: "def" }), { status: 200 });
      }
      throw new Error(`fetch inesperado: ${url}`);
    };
    const listo = await conBandera("on", () =>
      prepararFirmaHttp(
        sesion("org", ORGANIZADOR),
        pedido({ accion: "aprobarLiberar", tareaId: "t1", contrato: CONTRATO, firmante: RECEPTOR, indice: 0 }),
        almacen,
      ),
    );
    assert.equal(listo.status, 200);
    assert.match(visto.ruta, /approve-and-release-milestones$/);
    assert.equal(visto.cuerpo?.signer, ORGANIZADOR);
  } finally {
    globalThis.fetch = original;
    restaurarRoles();
    reiniciarLimite();
  }
});

test("un reembolso por debajo del tope no se libera directo", async () => {
  reiniciarLimite();
  const comida: TareaFila = {
    ...trabajo,
    id: "comida",
    tipo: "reembolso",
    monto: "15",
    tope: "15",
    miembroId: "vol",
    walletCobro: RECEPTOR,
    contratoEscrow: CONTRATO,
    estado: "en revisión",
  };
  const almacen = await evento([comida]);
  await almacen.crearEvidencia({
    id: "foto",
    tareaId: "comida",
    blobId: "blob",
    monto: "20",
    montoConfirmado: "9.50",
    fecha: "2026-10-08",
    creadaEn: CREADO,
  });
  const restaurarRoles = rolesDePrueba();
  const original = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.includes(`/escrow/multi-release/v2/${CONTRATO}`)) {
      return new Response(JSON.stringify({ contractId: CONTRATO, milestones: [{ status: "completed" }] }), { status: 200 });
    }
    throw new Error(`fetch inesperado: ${url}`);
  };
  try {
    const respuesta = await conBandera("on", () =>
      prepararFirmaHttp(
        sesion("org", ORGANIZADOR),
        pedido({ accion: "aprobarLiberar", tareaId: "comida", contrato: CONTRATO, indice: 0 }),
        almacen,
      ),
    );
    assert.equal(respuesta.status, 409);
    assert.equal(((await respuesta.json()) as { aviso: string }).aviso, AVISO_PAGO_PARCIAL);
  } finally {
    globalThis.fetch = original;
    restaurarRoles();
    reiniciarLimite();
  }
});
