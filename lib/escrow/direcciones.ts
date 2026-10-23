import { StrKey, extractBaseAddress } from "@stellar/stellar-sdk";
import { esContrato, esCuenta } from "./cuerpos";

/**
 * Muxed contract address from Protocol 30 (CAP-84, SEP-23 strkey `W…`):
 * a `C…` contract id plus a 64-bit id. The SDK parser is the checksum.
 * A prefix check is not enough: a bad checksum must not be stored or routed.
 */
export function esContratoMuxed(direccion: string): boolean {
  const limpio = direccion.trim();
  if (!limpio.startsWith("W")) return false;
  return StrKey.isValidMuxedContract(limpio);
}

/**
 * Address that can appear as the destination of a transfer or in a contract
 * value: classic account, contract, muxed account (`M…`), or muxed contract (`W…`).
 * A signer, a session wallet, and a payout account stay on {@link esCuenta}.
 */
export function esDestinoStellar(direccion: string): boolean {
  const limpio = direccion.trim();
  return esCuenta(limpio) || esContrato(limpio) || esContratoMuxed(limpio) || StrKey.isValidMed25519PublicKey(limpio);
}

/**
 * Contract id a balance or a token call actually uses.
 * A `C…` is returned as-is. A `W…` returns its base `C…`, because the
 * multiplex id is not part of the contract's storage key.
 */
export function contratoBase(direccion: string): string | null {
  const limpio = direccion.trim();
  if (esContrato(limpio)) return limpio;
  if (!esContratoMuxed(limpio)) return null;
  try {
    const base = extractBaseAddress(limpio);
    return esContrato(base) ? base : null;
  } catch {
    return null;
  }
}
