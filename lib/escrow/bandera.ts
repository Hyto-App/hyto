/**
 * Worker protection stays off unless HYTO_ESCROW_V2 is exactly "on".
 * Unset, empty, and anything else keep today's escrow: the organizer marks,
 * approves, and releases after the photo.
 */
export const HYTO_ESCROW_V2 = "HYTO_ESCROW_V2";

export type EntornoEscrow = {
  HYTO_ESCROW_V2?: string;
  [clave: string]: string | undefined;
};

export function escrowV2Activo(env: EntornoEscrow = process.env): boolean {
  return (env.HYTO_ESCROW_V2 ?? "").trim().toLowerCase() === "on";
}
