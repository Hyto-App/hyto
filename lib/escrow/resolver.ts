import type { AccionFirma } from "./tipos";

const ESCALA = 10_000_000n;

export type FalloResolucion = {
  mensaje: string;
  estado: number;
  codigo: string;
};

type Resolucion = Extract<AccionFirma, { accion: "resolver" }>;

export function revisarResolucion(accion: Resolucion, fuentes: unknown[]): FalloResolucion | null {
  const resolutores = resolutoresDe(fuentes);
  if (!resolutores.includes(accion.firmante)) {
    return {
      mensaje: "Only the dispute resolver can sign this resolution.",
      estado: 403,
      codigo: "ESCROW_ONLY_DISPUTE_RESOLVER_CAN_EXECUTE",
    };
  }
  const hito = hitoDe(fuentes, accion.indice);
  if (!hito) {
    return {
      mensaje: "El escrow no trae el hito en disputa.",
      estado: 422,
      codigo: "ESCROW_MILESTONE_NOT_FOUND",
    };
  }
  if (!enDisputa(hito)) {
    return {
      mensaje: "Ese hito no está en disputa.",
      estado: 422,
      codigo: "ESCROW_MILESTONE_NOT_IN_DISPUTE",
    };
  }
  const esperado = unidadesDe(hito.amount ?? hito.monto);
  if (esperado === null || esperado <= 0n) {
    return {
      mensaje: "El escrow no trae el monto del hito en disputa.",
      estado: 422,
      codigo: "ESCROW_MILESTONE_AMOUNT",
    };
  }
  let suma = 0n;
  for (const item of accion.distribuciones) {
    const parte = unidadesDe(item.monto);
    if (parte === null) {
      return {
        mensaje: "Hay un monto del reparto que no se puede sumar.",
        estado: 400,
        codigo: "AMOUNT_PRECISION_UNSUPPORTED",
      };
    }
    suma += parte;
  }
  // La comisión de protocolo la descuenta el contrato. El reparto suma el monto bruto.
  if (suma !== esperado) {
    return {
      mensaje: "El reparto tiene que sumar el monto del hito en disputa.",
      estado: 422,
      codigo: "ESCROW_DISTRIBUTIONS_MUST_EQUAL_BALANCE",
    };
  }
  return null;
}

export function resolutoresDe(fuentes: unknown[]): string[] {
  for (const fuente of fuentes) {
    const hallados = resolutoresEn(fuente);
    if (hallados.length > 0) return hallados;
  }
  return [];
}

export function unidadesDe(valor: unknown): bigint | null {
  const texto = textoDecimal(valor);
  if (!texto) return null;
  const partes = /^(\d+)(?:\.(\d+))?$/.exec(texto);
  if (!partes) return null;
  const fraccion = partes[2] ?? "";
  if (fraccion.length > 7) return null;
  return BigInt(partes[1]) * ESCALA + BigInt(fraccion.padEnd(7, "0"));
}

function resolutoresEn(fuente: unknown): string[] {
  const raiz = registro(fuente);
  const grupos = [
    [registro(raiz.roles), registro(registro(raiz.snapshot).roles)],
    [raiz, registro(raiz.snapshot)],
    [registro(registro(raiz.proyecto).roles), registro(raiz.proyecto)],
  ];
  for (const grupo of grupos) {
    const hallados = direcciones(...grupo);
    if (hallados.length > 0) return hallados;
  }
  return [];
}

function direcciones(...objetos: Record<string, unknown>[]): string[] {
  const vistos = new Set<string>();
  for (const datos of objetos) {
    for (const direccion of listaDe(datos.disputeResolvers)) vistos.add(direccion);
    const uno = texto(datos.disputeResolver) ?? texto(datos.resolutor);
    if (uno) vistos.add(uno);
  }
  return [...vistos];
}

function hitoDe(fuentes: unknown[], indice: number): Record<string, unknown> | null {
  for (const fuente of fuentes) {
    const hitos = hitosEn(fuente);
    if (hitos.length === 0) continue;
    return hitos[indice] ?? null;
  }
  return null;
}

function hitosEn(fuente: unknown): Record<string, unknown>[] {
  const raiz = registro(fuente);
  const snapshot = registro(raiz.snapshot);
  const proyecto = registro(raiz.proyecto);
  const lista = Array.isArray(raiz.milestones)
    ? raiz.milestones
    : Array.isArray(snapshot.milestones)
      ? snapshot.milestones
      : Array.isArray(proyecto.milestones)
        ? proyecto.milestones
        : [];
  return lista.filter((item): item is Record<string, unknown> => !!item && typeof item === "object");
}

// GET /escrow/multi-release/v2/{contractId} trae milestones[].dispute.
// isDisputed y resolved son el estado del protocolo. flags y status no:
// status es texto de la app y puede decir «resuelto» con la disputa abierta.
function enDisputa(hito: Record<string, unknown>): boolean {
  const disputa = registro(hito.dispute);
  if (disputa.resolved === true) return false;
  return disputa.isDisputed === true;
}

function listaDe(valor: unknown): string[] {
  if (!Array.isArray(valor)) return [];
  return valor.filter((item): item is string => typeof item === "string" && item.trim() !== "").map((item) => item.trim());
}

function textoDecimal(valor: unknown): string | null {
  if (typeof valor === "number") {
    if (!Number.isFinite(valor) || valor < 0) return null;
    const texto = JSON.stringify(valor);
    return texto.includes("e") || texto.includes("E") ? null : texto;
  }
  if (typeof valor !== "string") return null;
  const texto = valor.trim();
  if (!texto || texto.includes("e") || texto.includes("E")) return null;
  return texto;
}

function registro(valor: unknown): Record<string, unknown> {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) return {};
  return valor as Record<string, unknown>;
}

function texto(valor: unknown): string | null {
  return typeof valor === "string" && valor.trim() ? valor.trim() : null;
}
