/**
 * First public practice-network payment for the landing "real case" section.
 * Empty until a real 64-hex hash exists. Do not invent one.
 * When set, the landing links to stellar.expert testnet.
 */

/** Paste a 64-character hex hash when the first practice payment lands. Leave empty until then. */
export const HASH_PAGO_PUBLICO = "";

const HEX_64 = /^[a-fA-F0-9]{64}$/;

export function enlacePagoPublico(): string | null {
  const hash = HASH_PAGO_PUBLICO.trim();
  if (!HEX_64.test(hash)) return null;
  return `https://stellar.expert/explorer/testnet/tx/${hash}`;
}

export function hayPagoPublico(): boolean {
  return enlacePagoPublico() !== null;
}
