import { AVISO_COBRO_SIN_CONFIRMAR } from "@/lib/integrante/avisosUsdc";

/**
 * The person who just signed up. Not the organizer sentence about "the person who gets paid".
 * Same English as `entrar.altaPendiente`.
 */
export const AVISO_ALTA_PERSONA =
  "Open Events and tap Get ready to be paid to finish setting up your account.";

/** The session is open. This browser still cannot confirm the payout account, and signing out would not fix that. */
export const AVISO_ALTA_SIN_CONFIRMAR =
  "You're signed in. This browser can't confirm payouts yet. Open Events and finish that from your account.";

/**
 * Which dictionary line the signup notice should use.
 * A trustline or receiver failure is rewritten to the first-person line: the organizer
 * sentence (`errores.listoCobro`) is for the person who pays, not for the one who just signed up.
 * Null keeps the original notice plus the first-person follow-up.
 */
export function claveAvisoAlta(crudo: string): "entrar.altaSinConfirmar" | "entrar.altaPendiente" | null {
  const limpio = crudo.trim();
  if (!limpio) return null;
  if (limpio === AVISO_ALTA_SIN_CONFIRMAR || limpio === AVISO_COBRO_SIN_CONFIRMAR) return "entrar.altaSinConfirmar";
  if (limpio === AVISO_ALTA_PERSONA || /trustline|receiver/i.test(limpio)) return "entrar.altaPendiente";
  return null;
}
