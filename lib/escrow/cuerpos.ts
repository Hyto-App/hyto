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
    return "Hay una dirección que no es una cuenta de Stellar.";
  }
  if (!(cuentas.monto > 0) || !Number.isFinite(cuentas.monto)) {
    return "El monto del hito tiene que ser mayor que cero.";
  }
  if (cuentas.organizador === cuentas.receptor) {
    return "El organizador y el receptor son cuentas distintas.";
  }
  if (
    cuentas.resolutor === cuentas.organizador ||
    cuentas.resolutor === cuentas.receptor ||
    cuentas.resolutor === cuentas.proveedor ||
    cuentas.resolutor === cuentas.plataforma
  ) {
    return "El resolutor no puede repetir otro rol.";
  }
  if (cuentas.red === "v2") {
    if (!cuentas.admin) return "En v2 la cuenta admin es otra dirección.";
    const otros = [cuentas.organizador, cuentas.receptor, cuentas.proveedor, cuentas.plataforma, cuentas.resolutor];
    if (otros.includes(cuentas.admin)) return "La cuenta admin no puede repetir otro rol.";
    if (!cuentas.trustline.contractId) return "En v2 el USDC se indica con el contrato del activo.";
  } else if (!cuentas.trustline.address) {
    return "En v1 el USDC se indica con el emisor.";
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
  if (accion.accion === "pagar") {
    return {
      ruta: "/escrow/multi-release/v2/approve-and-release-milestones",
      cuerpo: {
        contractId: accion.contrato,
        signer: accion.firmante,
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
    return "Disputar y resolver un hito usa la API v2.";
  }
  if (accion.accion === "pagar") {
    return "Aprobar y liberar en un paso usa la API v2.";
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
  if (!esContrato(accion.contrato)) return "El contrato del pago no es válido.";
  if (!esCuenta(accion.firmante)) return "La cuenta que firma no es válida.";
  if (accion.accion === "fondear") {
    if (!(accion.monto > 0) || !Number.isFinite(accion.monto)) return "El monto a fondear tiene que ser mayor que cero.";
    return null;
  }
  if (!Number.isInteger(accion.indice) || accion.indice < 0) return "El hito no es válido.";
  if (accion.accion === "marcar") {
    if (accion.estado.trim() === "") return "El estado del hito está vacío.";
    if (accion.estado.length > 50) return "El estado del hito no puede pasar de 50 caracteres.";
    if (accion.evidencia && accion.evidencia.length > 500) return "La evidencia no puede pasar de 500 caracteres.";
  }
  if (accion.accion === "disputar") {
    const motivo = accion.motivo.trim();
    if (motivo === "") return "Falta el motivo de la disputa.";
    if (motivo.length > 500) return "El motivo no puede pasar de 500 caracteres.";
  }
  if (accion.accion === "resolver") return avisoDistribuciones(accion.distribuciones);
  return null;
}

function avisoDistribuciones(lista: Distribucion[]): string | null {
  if (!Array.isArray(lista) || lista.length === 0) return "Falta cómo se reparte la disputa.";
  if (lista.length > 50) return "El reparto no puede pasar de 50 destinos.";
  for (const item of lista) {
    if (!item || typeof item.direccion !== "string" || !esCuenta(item.direccion)) {
      return "Hay un destino del reparto que no es una cuenta de Stellar.";
    }
    if (typeof item.monto !== "number" || !Number.isFinite(item.monto) || !(item.monto > 0)) {
      return "Cada monto del reparto tiene que ser mayor que cero.";
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
  if (!body || typeof body !== "object") return { aviso: "El cuerpo no trae la acción." };
  const datos = body as Record<string, unknown>;
  const accion = datos.accion;
  const contrato = texto(datos.contrato);
  const firmante = texto(datos.firmante);
  if (accion === "desplegar") {
    const tareaId = texto(datos.tareaId);
    if (!tareaId || !/^[A-Za-z0-9_-]{1,80}$/.test(tareaId)) return { aviso: "Falta la tarea que se va a desplegar." };
    return { accion, tareaId };
  }
  if (
    accion !== "fondear" &&
    accion !== "marcar" &&
    accion !== "aprobar" &&
    accion !== "pagar" &&
    accion !== "liberar" &&
    accion !== "disputar" &&
    accion !== "resolver"
  ) {
    return { aviso: "Esa acción no prepara un pago." };
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
    if (!motivo) return { aviso: "Falta el motivo de la disputa." };
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
  if (!Array.isArray(valor)) return "Falta cómo se reparte la disputa.";
  const lista: Distribucion[] = [];
  for (const item of valor) {
    if (!item || typeof item !== "object") return "Hay un destino del reparto que no es válido.";
    const datos = item as Record<string, unknown>;
    const direccion = texto(datos.direccion) ?? "";
    const monto = typeof datos.monto === "number" ? datos.monto : Number(datos.monto);
    lista.push({ direccion, monto });
  }
  return avisoDistribuciones(lista) ?? lista;
}

function leerIndice(valor: unknown): number | string {
  if (valor === null || valor === undefined || valor === "") return "Falta el hito.";
  const indice = typeof valor === "number" ? valor : typeof valor === "string" ? Number(valor) : Number.NaN;
  if (!Number.isInteger(indice) || indice < 0) return "El hito no es válido.";
  return indice;
}

function texto(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  const limpio = valor.trim();
  return limpio ? limpio : null;
}
