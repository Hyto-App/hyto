import { Asset, Networks } from "@stellar/stellar-sdk";
import { normalizarMonto } from "@/lib/admin/vista";
import type { EvidenciaFila, TareaFila } from "@/lib/db/tipos";
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
  const plataforma = leerCuenta(env.HYTO_ESCROW_PLATFORM, "HYTO_ESCROW_PLATFORM", "la plataforma del escrow");
  if (typeof plataforma !== "string") return plataforma;
  const resolutor = leerCuenta(env.HYTO_ESCROW_RESOLVER, "HYTO_ESCROW_RESOLVER", "quien resuelve disputas");
  if (typeof resolutor !== "string") return resolutor;
  const admin = leerCuenta(env.HYTO_ESCROW_ADMIN, "HYTO_ESCROW_ADMIN", "la cuenta admin del escrow");
  if (typeof admin !== "string") return admin;
  if (new Set([plataforma, resolutor, admin]).size !== 3) {
    return {
      aviso: "HYTO_ESCROW_PLATFORM, HYTO_ESCROW_RESOLVER y HYTO_ESCROW_ADMIN tienen que ser tres cuentas distintas.",
    };
  }
  return { plataforma, resolutor, admin };
}

export function montoDeTarea(tarea: TareaFila, evidencia: EvidenciaFila | null): number | null {
  const crudo = tarea.tipo === "reembolso" ? evidencia?.monto || tarea.tope || tarea.monto : tarea.monto;
  const normal = normalizarMonto(crudo ?? "");
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
}): CuentasDespliegue | { aviso: string } {
  if (opciones.roles.plataforma === opciones.firmante || opciones.roles.plataforma === opciones.receptor) {
    return { aviso: "La plataforma no puede ser el organizador ni quien cobra." };
  }
  if (opciones.roles.resolutor === opciones.firmante || opciones.roles.resolutor === opciones.receptor) {
    return { aviso: "El resolutor no puede repetir otro rol." };
  }
  if (
    opciones.roles.admin === opciones.firmante ||
    opciones.roles.admin === opciones.receptor ||
    opciones.roles.admin === opciones.roles.plataforma ||
    opciones.roles.admin === opciones.roles.resolutor
  ) {
    return { aviso: "La cuenta admin no puede repetir otro rol." };
  }
  const titulo = opciones.titulo.trim().slice(0, 120) || "Tarea";
  return {
    red: "v2",
    firmante: opciones.firmante,
    organizador: opciones.firmante,
    receptor: opciones.receptor,
    proveedor: opciones.firmante,
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
  if (!limpio) return { aviso: `Falta ${nombre} en el servidor. Es ${rol} y no puede repetir otro rol.` };
  if (!esCuenta(limpio)) return { aviso: `${nombre} no es una cuenta de Stellar.` };
  return limpio;
}
