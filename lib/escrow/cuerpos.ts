import type { AccionFirma, CuentasDespliegue, Distribucion, EntradaDespliegue, Pedido, RedEscrow } from "./tipos";

export const BASE_V2 = "https://beta.api.trustlesswork.com";
export const BASE_V1 = "https://dev.api.trustlesswork.com";

const CODIGOS_FRIENDBOT = new Set([
  "STELLAR_TX_FEE_BUMP_REJECTED",
  "STELLAR_TX_NO_SOURCE_ACCOUNT",
  "STELLAR_TX_INSUFFICIENT_BALANCE",
]);

export function baseDe(red: RedEscrow): string {
  return red === "v2" ? BASE_V2 : BASE_V1;
}

export function claveDeV1(entorno?: {
  TRUSTLESS_API_KEY?: string;
  TRUSTLESS_API_KEY_V1?: string;
}): { clave: string } | { aviso: string } {
  const fuente = entorno ?? {
    TRUSTLESS_API_KEY: process.env.TRUSTLESS_API_KEY,
    TRUSTLESS_API_KEY_V1: process.env.TRUSTLESS_API_KEY_V1,
  };
  const propia = fuente.TRUSTLESS_API_KEY_V1?.trim() ?? "";
  if (!propia) {
    return {
      aviso: "Para repetir el hito en v1 hace falta TRUSTLESS_API_KEY_V1. Esa clave es distinta de TRUSTLESS_API_KEY.",
    };
  }
  if (propia === (fuente.TRUSTLESS_API_KEY?.trim() ?? "")) {
    return { aviso: "TRUSTLESS_API_KEY_V1 repite TRUSTLESS_API_KEY. V1 y v2 piden claves distintas." };
  }
  return { clave: propia };
}

export function convieneFriendbot(codigo: string | null): boolean {
  return codigo !== null && CODIGOS_FRIENDBOT.has(codigo);
}

export function enlacePago(hash: string): string {
  return `https://stellar.expert/explorer/testnet/tx/${hash}`;
}

export function avisoRoles(cuentas: CuentasDespliegue): string | null {
  const direcciones = [
    cuentas.firmante,
    cuentas.organizador,
    cuentas.receptor,
    cuentas.proveedor,
    cuentas.plataforma,
    cuentas.resolutor,
    cuentas.admin ?? "",
  ];
  if (direcciones.some((direccion) => direccion !== "" && !esCuenta(direccion))) {
    return "One address is not a Stellar account.";
  }
  if (!(cuentas.monto > 0) || !Number.isFinite(cuentas.monto)) {
    return "The milestone amount has to be greater than zero.";
  }
  if (cuentas.organizador === cuentas.receptor) {
    return "The organizer and the receiver have to be different accounts.";
  }
  if (
    cuentas.resolutor === cuentas.organizador ||
    cuentas.resolutor === cuentas.receptor ||
    cuentas.resolutor === cuentas.proveedor ||
    cuentas.resolutor === cuentas.plataforma
  ) {
    return "The resolver cannot repeat another role.";
  }
  if (cuentas.red === "v2") {
    if (!cuentas.admin) return "In v2 the admin account is a separate address.";
    const otros = [cuentas.organizador, cuentas.receptor, cuentas.proveedor, cuentas.plataforma, cuentas.resolutor];
    if (otros.includes(cuentas.admin)) return "The admin account cannot repeat another role.";
    if (!cuentas.trustline.contractId) return "In v2, USDC is set with the asset contract.";
  } else if (!cuentas.trustline.address) {
    return "In v1, USDC is set with the issuer.";
  }
  return null;
}

export function pedidoAccion(accion: AccionFirma, red: RedEscrow): Pedido | string {
  const aviso = avisoAccion(accion);
  if (aviso) return aviso;
  if (red === "v2") return pedidoV2(accion);
  return pedidoV1(accion);
}

export function pedidoDespliegue(cuentas: CuentasDespliegue): Pedido | string {
  const aviso = avisoRoles(cuentas);
  if (aviso) return aviso;
  if (cuentas.red === "v2") {
    return {
      ruta: "/escrow/multi-release/v2/deploy",
      cuerpo: {
        signer: cuentas.firmante,
        engagementId: cuentas.engagementId,
        title: cuentas.titulo,
        description: cuentas.descripcion,
        platformFee: cuentas.comision,
        roles: {
          approvers: [cuentas.organizador],
          serviceProviders: [cuentas.proveedor],
          platform: cuentas.plataforma,
          releaseSigners: [cuentas.organizador],
          disputeResolvers: [cuentas.resolutor],
          admin: cuentas.admin,
        },
        milestones: [
          {
            description: cuentas.hito,
            amount: cuentas.monto,
            receiver: cuentas.receptor,
            approvalsTarget: 1,
          },
        ],
        trustline: {
          contractId: cuentas.trustline.contractId,
          symbol: cuentas.trustline.symbol,
        },
      },
    };
  }
  return {
    ruta: "/deployer/multi-release",
    cuerpo: {
      signer: cuentas.firmante,
      engagementId: cuentas.engagementId,
      title: cuentas.titulo,
      description: cuentas.descripcion,
      platformFee: cuentas.comision,
      roles: {
        approver: cuentas.organizador,
        serviceProvider: cuentas.proveedor,
        platformAddress: cuentas.plataforma,
        releaseSigner: cuentas.organizador,
        disputeResolver: cuentas.resolutor,
      },
      milestones: [
        {
          description: cuentas.hito,
          amount: cuentas.monto,
          receiver: cuentas.receptor,
        },
      ],
      trustline: {
        symbol: cuentas.trustline.symbol,
        address: cuentas.trustline.address,
      },
    },
  };
}

function pedidoV2(accion: AccionFirma): Pedido | string {
  if (accion.accion === "fondear") {
    return {
      ruta: "/escrow/multi-release/v2/fund",
      cuerpo: { contractId: accion.contrato, signer: accion.firmante, amount: accion.monto },
    };
  }
  if (accion.accion === "marcar") {
    return {
      ruta: "/escrow/multi-release/v2/change-milestone-status",
      cuerpo: {
        contractId: accion.contrato,
        serviceProvider: accion.firmante,
        updates: [
          {
            index: accion.indice,
            newStatus: accion.estado,
            ...(accion.evidencia ? { newEvidence: accion.evidencia } : {}),
          },
        ],
      },
    };
  }
  if (accion.accion === "aprobar") {
    return {
      ruta: "/escrow/multi-release/v2/approve-milestones",
      cuerpo: {
        contractId: accion.contrato,
        approver: accion.firmante,
        milestoneIndexes: [accion.indice],
      },
    };
  }
  if (accion.accion === "liberar") {
    return {
      ruta: "/escrow/multi-release/v2/release-funds",
      cuerpo: {
        contractId: accion.contrato,
        releaseSigner: accion.firmante,
        milestoneIndexes: [accion.indice],
      },
    };
  }
  if (accion.accion === "disputar") {
    return {
      ruta: "/escrow/multi-release/v2/dispute-milestones",
      cuerpo: {
        contractId: accion.contrato,
        signer: accion.firmante,
        milestoneIndexes: [accion.indice],
        reason: accion.motivo.trim(),
      },
    };
  }
  return {
    ruta: "/escrow/multi-release/v2/resolve-dispute",
    cuerpo: {
      contractId: accion.contrato,
      disputeResolver: accion.firmante,
      milestoneIndexes: [accion.indice],
      distributions: accion.distribuciones.map((item) => ({ address: item.direccion, amount: item.monto })),
    },
  };
}

function pedidoV1(accion: AccionFirma): Pedido | string {
  if (accion.accion === "disputar" || accion.accion === "resolver") {
    return "Disputing and resolving a milestone uses the v2 API.";
  }
  if (accion.accion === "fondear") {
    return {
      ruta: "/escrow/multi-release/fund-escrow",
      cuerpo: { contractId: accion.contrato, signer: accion.firmante, amount: accion.monto },
    };
  }
  if (accion.accion === "marcar") {
    return {
      ruta: "/escrow/multi-release/change-milestone-status",
      cuerpo: {
        contractId: accion.contrato,
        milestoneIndex: String(accion.indice),
        newStatus: accion.estado,
        serviceProvider: accion.firmante,
        ...(accion.evidencia ? { newEvidence: accion.evidencia } : {}),
      },
    };
  }
  if (accion.accion === "aprobar") {
    return {
      ruta: "/escrow/multi-release/approve-milestone",
      cuerpo: {
        contractId: accion.contrato,
        milestoneIndex: String(accion.indice),
        approver: accion.firmante,
      },
    };
  }
  return {
    ruta: "/escrow/multi-release/release-milestone-funds",
    cuerpo: {
      contractId: accion.contrato,
      releaseSigner: accion.firmante,
      milestoneIndex: String(accion.indice),
    },
  };
}

function avisoAccion(accion: AccionFirma): string | null {
  if (!esContrato(accion.contrato)) return "The payment contract is not valid.";
  if (!esCuenta(accion.firmante)) return "The signing account is not valid.";
  if (accion.accion === "fondear") {
    if (!(accion.monto > 0) || !Number.isFinite(accion.monto)) return "The funding amount has to be greater than zero.";
    return null;
  }
  if (!Number.isInteger(accion.indice) || accion.indice < 0) return "The milestone is not valid.";
  if (accion.accion === "marcar") {
    if (accion.estado.trim() === "") return "The milestone status is empty.";
    if (accion.estado.length > 50) return "The milestone status cannot be longer than 50 characters.";
    if (accion.evidencia && accion.evidencia.length > 500) return "The evidence cannot be longer than 500 characters.";
  }
  if (accion.accion === "disputar") {
    const motivo = accion.motivo.trim();
    if (motivo === "") return "The dispute reason is missing.";
    if (motivo.length > 500) return "The reason cannot be longer than 500 characters.";
  }
  if (accion.accion === "resolver") return avisoDistribuciones(accion.distribuciones);
  return null;
}

function avisoDistribuciones(lista: Distribucion[]): string | null {
  if (!Array.isArray(lista) || lista.length === 0) return "The dispute split is missing.";
  if (lista.length > 50) return "The split cannot have more than 50 destinations.";
  for (const item of lista) {
    if (!item || typeof item.direccion !== "string" || !esCuenta(item.direccion)) {
      return "One split destination is not a Stellar account.";
    }
    if (typeof item.monto !== "number" || !Number.isFinite(item.monto) || !(item.monto > 0)) {
      return "Each split amount has to be greater than zero.";
    }
  }
  return null;
}

export function esCuenta(direccion: string): boolean {
  return /^G[A-Z2-7]{55}$/.test(direccion);
}

export function esContrato(direccion: string): boolean {
  return /^C[A-Z2-7]{55}$/.test(direccion);
}

export type EntradaLeida = AccionFirma | EntradaDespliegue | { aviso: string };

export function leerEntrada(body: unknown): EntradaLeida {
  if (!body || typeof body !== "object") return { aviso: "The body does not include the action." };
  const datos = body as Record<string, unknown>;
  const accion = datos.accion;
  const contrato = texto(datos.contrato);
  const firmante = texto(datos.firmante);
  if (accion === "desplegar") {
    const tareaId = texto(datos.tareaId);
    if (!tareaId || !/^[A-Za-z0-9_-]{1,80}$/.test(tareaId)) return { aviso: "The task to deploy is missing." };
    return { accion, tareaId };
  }
  if (
    accion !== "fondear" &&
    accion !== "marcar" &&
    accion !== "aprobar" &&
    accion !== "liberar" &&
    accion !== "disputar" &&
    accion !== "resolver"
  ) {
    return { aviso: "That action does not prepare a payment." };
  }
  if (!contrato || !firmante) return { aviso: "Faltan el contrato y la cuenta que firma." };
  if (accion === "fondear") {
    const monto = typeof datos.monto === "number" ? datos.monto : Number(datos.monto);
    return { accion, contrato, firmante, monto };
  }
  const indice = leerIndice(datos.indice);
  if (typeof indice === "string") return { aviso: indice };
  if (accion === "marcar") {
    const estado = texto(datos.estado) ?? "";
    const evidencia = texto(datos.evidencia);
    return evidencia ? { accion, contrato, firmante, indice, estado, evidencia } : { accion, contrato, firmante, indice, estado };
  }
  if (accion === "disputar") {
    const motivo = texto(datos.motivo);
    if (!motivo) return { aviso: "The dispute reason is missing." };
    return { accion, contrato, firmante, indice, motivo };
  }
  if (accion === "resolver") {
    const distribuciones = leerDistribuciones(datos.distribuciones);
    if (typeof distribuciones === "string") return { aviso: distribuciones };
    return { accion, contrato, firmante, indice, distribuciones };
  }
  return { accion, contrato, firmante, indice };
}

function leerDistribuciones(valor: unknown): Distribucion[] | string {
  if (!Array.isArray(valor)) return "The dispute split is missing.";
  const lista: Distribucion[] = [];
  for (const item of valor) {
    if (!item || typeof item !== "object") return "One split destination is not valid.";
    const datos = item as Record<string, unknown>;
    const direccion = texto(datos.direccion) ?? "";
    const monto = typeof datos.monto === "number" ? datos.monto : Number(datos.monto);
    lista.push({ direccion, monto });
  }
  return avisoDistribuciones(lista) ?? lista;
}

function leerIndice(valor: unknown): number | string {
  if (valor === null || valor === undefined || valor === "") return "The milestone is missing.";
  const indice = typeof valor === "number" ? valor : typeof valor === "string" ? Number(valor) : Number.NaN;
  if (!Number.isInteger(indice) || indice < 0) return "The milestone is not valid.";
  return indice;
}

function texto(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  const limpio = valor.trim();
  return limpio ? limpio : null;
}
