import { esCuenta } from "@/lib/escrow/cuerpos";
import type { VistaCuenta } from "./orgullo";

/** Circle's public faucet. The person picks Stellar Testnet there and pastes the address. */
export const FAUCET_CIRCLE = "https://faucet.circle.com";

/**
 * Whether Settings offers «Recargar saldo de prueba».
 * - `lista`: the account already holds the USDC trustline, so faucet USDC will arrive.
 * - `preparar`: the trustline is missing; the faucet payment would fail, so the screen asks to get ready first.
 * - `oculta`: demo, a sample wallet, no wallet, a balance we couldn't read, or a public-network deployment.
 */
export type EstadoRecarga = "lista" | "preparar" | "oculta";

export function estadoRecarga(
  vista: Pick<VistaCuenta, "demo" | "muestra" | "walletMuestra" | "wallet" | "saldoEstado" | "red">,
): EstadoRecarga {
  if (vista.demo || vista.muestra || vista.walletMuestra) return "oculta";
  if ((vista.red ?? "testnet") !== "testnet") return "oculta";
  if (!vista.wallet || !esCuenta(vista.wallet)) return "oculta";
  if (vista.saldoEstado === "ok") return "lista";
  if (vista.saldoEstado === "ausente") return "preparar";
  return "oculta";
}
