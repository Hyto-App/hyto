import type { SesionFila } from "@/lib/db/tipos";
import { esCuenta } from "@/lib/escrow/cuerpos";
import { sesionEsDemo } from "./demo";

// The newest sign-in expires last. Demo sessions never supply a payout account.
export function walletDeSesiones(filas: readonly SesionFila[]): string | null {
  const validas = filas
    .filter((fila) => !sesionEsDemo(fila) && esCuenta(fila.wallet.trim()))
    .sort((a, b) => (a.expiraEn < b.expiraEn ? 1 : a.expiraEn > b.expiraEn ? -1 : 0));
  return validas[0]?.wallet.trim() ?? null;
}
