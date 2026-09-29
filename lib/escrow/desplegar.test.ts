import assert from "node:assert/strict";
import test from "node:test";
import { pedidoDespliegue } from "./cuerpos";
import { cuentasDeTarea, rolesDeEntorno, USDC_SAC_TESTNET } from "./desplegar";

const ORGANIZADOR = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
const RECEPTOR = "GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB";
const ADMIN = "GCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC";
const PLATAFORMA = "GDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD";
const RESOLUTOR = "GEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE";

const ROLES = { plataforma: PLATAFORMA, resolutor: RESOLUTOR, admin: ADMIN };

test("faltan las cuentas distintas del servidor", () => {
  const falta = rolesDeEntorno({});
  assert.equal("aviso" in falta, true);
  if (!("aviso" in falta)) return;
  assert.match(falta.aviso, /HYTO_ESCROW_PLATFORM/);
  const invalida = rolesDeEntorno({
    HYTO_ESCROW_PLATFORM: "no-es-cuenta",
    HYTO_ESCROW_RESOLVER: RESOLUTOR,
    HYTO_ESCROW_ADMIN: ADMIN,
  });
  assert.equal("aviso" in invalida, true);
  if (!("aviso" in invalida)) return;
  assert.match(invalida.aviso, /HYTO_ESCROW_PLATFORM/);
  const repetida = rolesDeEntorno({
    HYTO_ESCROW_PLATFORM: PLATAFORMA,
    HYTO_ESCROW_RESOLVER: PLATAFORMA,
    HYTO_ESCROW_ADMIN: ADMIN,
  });
  assert.equal("aviso" in repetida, true);
  if (!("aviso" in repetida)) return;
  assert.match(repetida.aviso, /tres cuentas distintas/);
});

test("el despliegue deja al organizador en aprobar, marcar y liberar", () => {
  const cuentas = cuentasDeTarea({
    firmante: ORGANIZADOR,
    receptor: RECEPTOR,
    monto: 20,
    titulo: "Montar el stand",
    descripcion: "Banner visible",
    engagementId: "hyto-stand",
    roles: ROLES,
  });
  assert.equal("aviso" in cuentas, false);
  if ("aviso" in cuentas) return;
  const pedido = pedidoDespliegue(cuentas);
  assert.equal(typeof pedido === "string", false);
  if (typeof pedido === "string") return;
  assert.equal(pedido.ruta, "/escrow/multi-release/v2/deploy");
  assert.equal(pedido.cuerpo.platformFee, 0);
  assert.equal(pedido.cuerpo.signer, ORGANIZADOR);
  const roles = pedido.cuerpo.roles as {
    approvers: string[];
    serviceProviders: string[];
    releaseSigners: string[];
    platform: string;
    disputeResolvers: string[];
    admin: string;
  };
  assert.deepEqual(roles.approvers, [ORGANIZADOR]);
  assert.deepEqual(roles.serviceProviders, [ORGANIZADOR]);
  assert.deepEqual(roles.releaseSigners, [ORGANIZADOR]);
  assert.equal(roles.platform, PLATAFORMA);
  assert.deepEqual(roles.disputeResolvers, [RESOLUTOR]);
  assert.equal(roles.admin, ADMIN);
  const hitos = pedido.cuerpo.milestones as { receiver: string; amount: number }[];
  assert.equal(hitos[0]?.receiver, RECEPTOR);
  assert.equal(hitos[0]?.amount, 20);
  const trustline = pedido.cuerpo.trustline as { contractId: string; symbol: string };
  assert.equal(trustline.contractId, USDC_SAC_TESTNET);
  assert.equal(trustline.symbol, "USDC");
  assert.match(USDC_SAC_TESTNET, /^C[A-Z2-7]{55}$/);
});

test("la plataforma no puede ser quien cobra", () => {
  const cuentas = cuentasDeTarea({
    firmante: ORGANIZADOR,
    receptor: PLATAFORMA,
    monto: 1,
    titulo: "Tarea",
    descripcion: "",
    engagementId: "hyto",
    roles: ROLES,
  });
  assert.equal("aviso" in cuentas, true);
  if (!("aviso" in cuentas)) return;
  assert.match(cuentas.aviso, /plataforma/);
});
