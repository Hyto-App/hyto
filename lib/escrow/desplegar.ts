import { Asset, Networks } from "@stellar/stellar-sdk";
import { normalizarMonto } from "@/lib/admin/vista";
import type { EvidenciaFila, TareaFila } from "@/lib/db/tipos";
import { cifraConfirmada } from "./monto";
import { USDC } from "@/lib/integrante/identidades";
import { esCuenta } from "./cuerpos";
import type { CuentasDespliegue } from "./tipos";

export const USDC_SAC_TESTNET = new Asset(USDC.code, USDC.issuer).contractId(Networks.TESTNET);

export type RolesServidor = {
  plataforma: string;
  resolutor: string;
  admin: string;
};

export function rolesDeEntorno(env: Record<string, string | undefined> = process.env): RolesServidor | { aviso: string } {
  const plataforma = leerCuenta(env.HYTO_ESCROW_PLATFORM, "HYTO_ESCROW_PLATFORM", "the platform account");
  if (typeof plataforma !== "string") return plataforma;
  const resolutor = leerCuenta(env.HYTO_ESCROW_RESOLVER, "HYTO_ESCROW_RESOLVER", "the dispute resolver");
  if (typeof resolutor !== "string") return resolutor;
  const admin = leerCuenta(env.HYTO_ESCROW_ADMIN, "HYTO_ESCROW_ADMIN", "the admin account");
  if (typeof admin !== "string") return admin;
  if (new Set([plataforma, resolutor, admin]).size !== 3) {
    return {
      aviso: "HYTO_ESCROW_PLATFORM, HYTO_ESCROW_RESOLVER, and HYTO_ESCROW_ADMIN have to be three different accounts.",
    };
  }
  return { plataforma, resolutor, admin };
}

export function montoDeTarea(tarea: TareaFila, evidencia: EvidenciaFila | null): number | null {
  if (tarea.tipo === "reembolso") return cifraConfirmada(evidencia?.montoConfirmado, tarea.tope, tarea.monto);
  const normal = normalizarMonto(tarea.monto);
  if (!normal) return null;
  let monto = Number(normal);
  if (!(monto > 0) || !Number.isFinite(monto)) return null;
  const tope = topePositivo(tarea.tope);
  if (tope !== null && monto > tope) monto = tope;
  return monto > 0 ? monto : null;
}

function topePositivo(tope: string | null): number | null {
  if (!tope) return null;
  const normal = normalizarMonto(tope);
  if (!normal) return null;
  const cifra = Number(normal);
  if (!(cifra > 0) || !Number.isFinite(cifra)) return null;
  return cifra;
}

export function cuentasDeTarea(opciones: {
  firmante: string;
  receptor: string;
  monto: number;
  titulo: string;
  descripcion: string;
  engagementId: string;
  roles: RolesServidor;
  proteger?: boolean;
}): CuentasDespliegue | { aviso: string } {
  if (opciones.roles.plataforma === opciones.firmante || opciones.roles.plataforma === opciones.receptor) {
    return { aviso: "The platform account cannot be the organizer or the payee." };
  }
  if (opciones.roles.resolutor === opciones.firmante || opciones.roles.resolutor === opciones.receptor) {
    return { aviso: "The resolver cannot repeat another role." };
  }
  if (
    opciones.roles.admin === opciones.firmante ||
    opciones.roles.admin === opciones.receptor ||
    opciones.roles.admin === opciones.roles.plataforma ||
    opciones.roles.admin === opciones.roles.resolutor
  ) {
    return { aviso: "The admin account cannot repeat another role." };
  }
  const titulo = opciones.titulo.trim().slice(0, 120) || "Task";
  return {
    red: "v2",
    firmante: opciones.firmante,
    organizador: opciones.firmante,
    receptor: opciones.receptor,
    proveedor: opciones.proteger ? opciones.receptor : opciones.firmante,
    admin: opciones.roles.admin,
    plataforma: opciones.roles.plataforma,
    resolutor: opciones.roles.resolutor,
    monto: opciones.monto,
    titulo,
    descripcion: (opciones.descripcion.trim() || titulo).slice(0, 500),
    hito: titulo,
    engagementId: opciones.engagementId,
    trustline: { contractId: USDC_SAC_TESTNET, symbol: USDC.code, address: USDC.issuer },
    comision: 0,
  };
}

function leerCuenta(valor: string | undefined, nombre: string, rol: string): string | { aviso: string } {
  const limpio = valor?.trim() ?? "";
  if (!limpio) return { aviso: `Missing ${nombre} on the server. It is ${rol} and cannot repeat another role.` };
  if (!esCuenta(limpio)) return { aviso: `${nombre} is not a Stellar account.` };
  return limpio;
}
