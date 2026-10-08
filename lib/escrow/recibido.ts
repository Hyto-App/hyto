import { normalizarMonto } from "@/lib/admin/vista";
import { cifraConfirmada } from "./monto";

/**
 * Trustless Work takes a fixed 0.3% protocol fee when a milestone is released.
 * 0.3% is 30 basis points. Hyto deploys with platformFee 0 (`comision: 0` in
 * `cuentasDeTarea`), so the receiver gets the funded amount minus that 0.3%.
 * USDC on Stellar has 7 decimal places. The contract subtracts integer fees.
 */
export const BPS_PROTOCOLO = 30n;
export const BPS_PLATAFORMA_HYTO = 0n;
const BPS = 10_000n;
const DECIMALES_USDC = 7;
const ESCALA = 10n ** BigInt(DECIMALES_USDC);

export function unidadesUsdc(valor: string): bigint | null {
  const limpio = valor.trim().replace(/,/g, "");
  if (!/^\d+(\.\d{1,7})?$/.test(limpio)) return null;
  const [entera, fraccion = ""] = limpio.split(".");
  const unidades = BigInt(entera) * ESCALA + BigInt(fraccion.padEnd(DECIMALES_USDC, "0"));
  return unidades > 0n ? unidades : null;
}

export function textoDesdeUnidades(unidades: bigint): string {
  if (unidades <= 0n) return "";
  const entero = unidades / ESCALA;
  const fraccion = unidades % ESCALA;
  if (fraccion === 0n) return entero.toString();
  const decimales = fraccion.toString().padStart(DECIMALES_USDC, "0").replace(/0+$/, "");
  return `${entero.toString()}.${decimales}`;
}

export function presentarUsdc(unidades: bigint): string {
  if (unidades <= 0n) return unidades === 0n ? "0" : "";
  const texto = textoDesdeUnidades(unidades);
  const [entera, fraccion] = texto.split(".");
  const grupo = entera.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return fraccion ? `${grupo}.${fraccion}` : grupo;
}

/**
 * Net the milestone receiver gets. `comisionPlataformaBps` is the platform fee
 * in basis points. Hyto's deploy uses 0.
 */
export type PartesPago = {
  bruto: string;
  /** Trustless Work protocol fee. Hyto's own platform fee stays 0. */
  comision: string;
  neto: string;
};

/**
 * Gross funded amount, the 0.3% taken when the payment is sent, and what the
 * payee receives. Reserving does not take this fee.
 */
export function partesDePago(bruto: string, comisionPlataformaBps = BPS_PLATAFORMA_HYTO): PartesPago | null {
  const unidades = unidadesUsdc(bruto);
  if (unidades === null) return null;
  if (comisionPlataformaBps < 0n || comisionPlataformaBps >= BPS) return null;
  const protocolo = (unidades * BPS_PROTOCOLO) / BPS;
  const plataforma = (unidades * comisionPlataformaBps) / BPS;
  const comision = protocolo + plataforma;
  const neto = unidades - comision;
  if (neto <= 0n) return null;
  return {
    bruto: textoDesdeUnidades(unidades),
    comision: textoDesdeUnidades(comision),
    neto: textoDesdeUnidades(neto),
  };
}

export function montoRecibido(bruto: string, comisionPlataformaBps = BPS_PLATAFORMA_HYTO): string | null {
  return partesDePago(bruto, comisionPlataformaBps)?.neto ?? null;
}

/**
 * Amount that was funded. A reimbursement uses the confirmed amount, never the cap.
 * A work task uses its milestone amount.
 */
export function brutoFondado(
  tarea: { tipo: "trabajo" | "reembolso"; monto: string; tope: string | null },
  confirmado: string | null | undefined,
): string | null {
  if (tarea.tipo === "reembolso") {
    const normal = normalizarMonto(confirmado ?? "");
    if (!normal || cifraConfirmada(normal, tarea.tope, tarea.monto) === null) return null;
    return normal;
  }
  return normalizarMonto(tarea.monto);
}

/**
 * What the payee actually received. `montoPagado` is already the net from the API.
 * Without it, the funded amount is reduced by the protocol fee. The cap is not a payment.
 */
export function recibidoDeCampos(tarea: {
  tipo: "trabajo" | "reembolso";
  monto: string;
  tope: string | null;
  montoPagado?: string | null;
  montoConfirmado?: string | null;
}): string | null {
  const directo = tarea.montoPagado?.trim() ?? "";
  const yaNeto = directo ? unidadesUsdc(directo) : null;
  if (yaNeto !== null) return textoDesdeUnidades(yaNeto);
  const bruto = brutoFondado(tarea, tarea.montoConfirmado);
  if (!bruto) return null;
  return montoRecibido(bruto);
}
