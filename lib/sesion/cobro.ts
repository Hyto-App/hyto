import type { Almacen } from "@/lib/db/almacen";
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

/**
 * The account kept on the user survives sign-out. The sessions are the fallback for someone who has
 * not signed in since 0016, or for a database where 0016 is not applied yet.
 */
export async function cuentaCobroDe(
  almacen: Pick<Almacen, "walletCobroDeUsuario" | "walletDeUsuario">,
  usuarioId: string,
): Promise<string | null> {
  const id = usuarioId.trim();
  if (!id) return null;
  const guardada = (await almacen.walletCobroDeUsuario(id))?.trim() ?? "";
  if (esCuenta(guardada)) return guardada;
  return almacen.walletDeUsuario(id);
}

/** Copies a sign-in's account to the user. A demo session or an invalid account writes nothing. */
export async function guardarCuentaCobro(
  almacen: Pick<Almacen, "guardarWalletCobro">,
  sesion: Pick<SesionFila, "email" | "usuarioId">,
  wallet: string,
): Promise<boolean> {
  const cuenta = wallet.trim();
  if (sesionEsDemo(sesion) || !esCuenta(cuenta)) return false;
  return almacen.guardarWalletCobro(sesion.usuarioId, cuenta);
}
