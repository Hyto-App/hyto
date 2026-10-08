import assert from "node:assert/strict";
import test from "node:test";
import type { TareaFila } from "../db/tipos";
import { escrowV2Activo } from "./bandera";
import { pedidoAccion, pedidoDespliegue } from "./cuerpos";
import { cuentasDeTarea } from "./desplegar";
import { pasosFirmaPago } from "./firmarCliente";
import {
  actorDe,
  balancePositivo,
  evidenciaDeHito,
  hitoMarcadoDe,
  idEngagement,
  montoAReservar,
  planReserva,
  proveedorDe,
  puedeLiberarDirecto,
} from "./reserva";

const ORGANIZADOR = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
const RECEPTOR = "GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB";
const ADMIN = "GCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC";
const PLATAFORMA = "GDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD";
const RESOLUTOR = "GEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE";
const CONTRATO = "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
const ROLES = { plataforma: PLATAFORMA, resolutor: RESOLUTOR, admin: ADMIN };

const trabajo = {
  id: "stand",
  proyectoId: "evt",
  titulo: "Booth",
  tipo: "trabajo",
  monto: "20",
  tope: null,
  condicion: "",
  miembroId: "vol",
  walletCobro: RECEPTOR,
  estado: "pendiente",
  hashPago: null,
  credencialUrl: null,
  contratoEscrow: null,
  prioridad: "normal",
  dificultad: null,
} satisfies TareaFila;

test("la bandera solo se enciende con on", () => {
  assert.equal(escrowV2Activo({}), false);
  assert.equal(escrowV2Activo({ HYTO_ESCROW_V2: "off" }), false);
  assert.equal(escrowV2Activo({ HYTO_ESCROW_V2: "" }), false);
  assert.equal(escrowV2Activo({ HYTO_ESCROW_V2: "on" }), true);
  assert.equal(escrowV2Activo({ HYTO_ESCROW_V2: " ON " }), true);
});

test("con protección el trabajador es el service provider y el organizador aprueba y libera", () => {
  const apagado = cuentasDeTarea({
    firmante: ORGANIZADOR,
    receptor: RECEPTOR,
    monto: 20,
    titulo: "Booth",
    descripcion: "Banner",
    engagementId: idEngagement("stand", false),
    roles: ROLES,
  });
  const encendido = cuentasDeTarea({
    firmante: ORGANIZADOR,
    receptor: RECEPTOR,
    monto: 20,
    titulo: "Booth",
    descripcion: "Banner",
    engagementId: idEngagement("stand", true),
    roles: ROLES,
    proteger: true,
  });
  assert.equal("aviso" in apagado, false);
  assert.equal("aviso" in encendido, false);
  if ("aviso" in apagado || "aviso" in encendido) return;
  assert.equal(apagado.proveedor, ORGANIZADOR);
  assert.equal(encendido.proveedor, RECEPTOR);
  assert.equal(proveedorDe(ORGANIZADOR, RECEPTOR, false), ORGANIZADOR);
  assert.equal(proveedorDe(ORGANIZADOR, RECEPTOR, true), RECEPTOR);
  assert.equal(apagado.engagementId, "hyto-stand");
  assert.equal(encendido.engagementId, "hyto-v2-stand");

  const pedido = pedidoDespliegue(encendido);
  assert.equal(typeof pedido === "string", false);
  if (typeof pedido === "string") return;
  assert.equal(pedido.ruta, "/escrow/multi-release/v2/deploy");
  const roles = pedido.cuerpo.roles as {
    approvers: string[];
    serviceProviders: string[];
    releaseSigners: string[];
    platform: string;
    disputeResolvers: string[];
    admin: string;
  };
  assert.deepEqual(roles.approvers, [ORGANIZADOR]);
  assert.deepEqual(roles.serviceProviders, [RECEPTOR]);
  assert.deepEqual(roles.releaseSigners, [ORGANIZADOR]);
  assert.equal(roles.platform, PLATAFORMA);
  assert.deepEqual(roles.disputeResolvers, [RESOLUTOR]);
  assert.equal(roles.admin, ADMIN);
  const hitos = pedido.cuerpo.milestones as { receiver: string; amount: number }[];
  assert.equal(hitos[0]?.receiver, RECEPTOR);
  assert.equal(hitos[0]?.amount, 20);
});

test("aprobar y liberar es un solo pedido de Trustless", () => {
  const pedido = pedidoAccion(
    { accion: "aprobarLiberar", contrato: CONTRATO, firmante: ORGANIZADOR, indice: 0 },
    "v2",
  );
  assert.equal(typeof pedido === "string", false);
  if (typeof pedido === "string") return;
  assert.equal(pedido.ruta, "/escrow/multi-release/v2/approve-and-release-milestones");
  assert.deepEqual(pedido.cuerpo, {
    contractId: CONTRATO,
    signer: ORGANIZADOR,
    milestoneIndexes: [0],
  });
  assert.equal(
    pedidoAccion({ accion: "aprobarLiberar", contrato: CONTRATO, firmante: ORGANIZADOR, indice: 0 }, "v1"),
    "Disputing, resolving, and approving with release use the v2 API.",
  );
});

test("el pago protegido es una firma y el anterior sigue en tres", () => {
  assert.deepEqual(pasosFirmaPago(true), ["aprobarLiberar"]);
  assert.deepEqual(pasosFirmaPago(true, "aprobar"), ["aprobarLiberar"]);
  assert.deepEqual(pasosFirmaPago(false), ["marcar", "aprobar", "liberar"]);
  assert.deepEqual(pasosFirmaPago(false, "aprobar"), ["aprobar", "liberar"]);
});

test("quien firma cada acción", () => {
  assert.equal(actorDe("marcar", false), "organizer");
  assert.equal(actorDe("disputar", false), "organizer");
  assert.equal(actorDe("marcar", true), "worker");
  assert.equal(actorDe("disputar", true), "either");
  assert.equal(actorDe("aprobarLiberar", true), "organizer");
  assert.equal(actorDe("resolver", true), "resolver");
});

test("la reserva ocurre antes del trabajo y un reembolso bloquea el tope", () => {
  assert.deepEqual(
    planReserva({ proteger: false, walletCobro: RECEPTOR, contrato: null, estado: "pendiente", monto: 20 }),
    { reservar: false, motivo: "off" },
  );
  assert.deepEqual(
    planReserva({ proteger: true, walletCobro: "", contrato: null, estado: "pendiente", monto: 20 }),
    { reservar: false, motivo: "no-wallet" },
  );
  assert.deepEqual(
    planReserva({ proteger: true, walletCobro: RECEPTOR, contrato: CONTRATO, estado: "pendiente", monto: 20 }),
    { reservar: false, motivo: "already" },
  );
  assert.deepEqual(
    planReserva({ proteger: true, walletCobro: RECEPTOR, contrato: null, estado: "pagado", monto: 20 }),
    { reservar: false, motivo: "paid" },
  );
  assert.deepEqual(
    planReserva({ proteger: true, walletCobro: RECEPTOR, contrato: null, estado: "pendiente", monto: null }),
    { reservar: false, motivo: "no-amount" },
  );
  assert.deepEqual(
    planReserva({ proteger: true, walletCobro: RECEPTOR, contrato: null, estado: "pendiente", monto: 20 }),
    { reservar: true, motivo: "ready" },
  );

  const comida = { ...trabajo, id: "comida", tipo: "reembolso" as const, monto: "15", tope: "15" };
  assert.equal(montoAReservar(trabajo), 20);
  assert.equal(montoAReservar(comida), 15);
  assert.equal(montoAReservar({ ...comida, tope: null, monto: "12" }), 12);
  assert.equal(puedeLiberarDirecto(trabajo, true), true);
  assert.equal(puedeLiberarDirecto({ ...comida, montoConfirmado: "15" }, true), true);
  assert.equal(puedeLiberarDirecto({ ...comida, montoConfirmado: "15.00" }, true), true);
  assert.equal(puedeLiberarDirecto({ ...comida, montoConfirmado: "9.50" }, true), false);
  assert.equal(puedeLiberarDirecto({ ...comida, montoConfirmado: null }, true), false);
  assert.equal(puedeLiberarDirecto({ ...comida, montoConfirmado: "9.50" }, false), true);
});

test("la marca cuenta con evidencia o estado completed, no con un estado inicial", () => {
  assert.equal(hitoMarcadoDe(null), false);
  assert.equal(hitoMarcadoDe({ milestones: [{ status: "" }] }), false);
  assert.equal(hitoMarcadoDe({ milestones: [{ status: "pending" }] }), false);
  assert.equal(hitoMarcadoDe({ escrow: { milestones: [{ status: "inDispute" }] } }), false);
  assert.equal(hitoMarcadoDe({ milestones: [{ status: "Completed" }] }), true);
  assert.equal(hitoMarcadoDe({ milestones: [{ evidence: evidenciaDeHito("foto-1") }] }), true);
  assert.equal(evidenciaDeHito("foto-1"), "hyto-evidence:foto-1");
  assert.equal(balancePositivo({ balance: "20" }), true);
  assert.equal(balancePositivo({ escrow: { balance: "0" } }), false);
  assert.equal(balancePositivo({}), null);
});
