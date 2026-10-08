import type { AuthProvider } from "@cavos/kit";
import { conectarStellar, fijarWallet } from "@/lib/auth/cliente";
import { guardarCuenta } from "./almacen";
import { appIdPublico } from "./identidades";
import type { IdentidadDemo } from "./tipos";
import { asegurarCobroUsdc } from "./usdc";

export type CuentaPreparada = {
  id: string;
  nombre: string;
  direccion: string | null;
  usdcListo: boolean;
  detalle: string | null;
};

export async function prepararIdentidad(identidad: IdentidadDemo, auth: AuthProvider): Promise<CuentaPreparada> {
  const appId = appIdPublico();
  if (!appId) {
    return {
      id: identidad.id,
      nombre: identidad.nombre,
      direccion: null,
      usdcListo: false,
      detalle: "Account setup isn't available yet.",
    };
  }

  const sesion = await conectarStellar(auth);
  const billetera = sesion.wallet("stellar");
  if (billetera.chain !== "stellar") {
    throw new Error("The payout account didn't open. Try again.");
  }

  const lista = await asegurarCobroUsdc(billetera);
  guardarCuenta(identidad.id, { direccion: lista.direccion, usdcListo: lista.usdcListo });
  const guardada = await fijarWallet(lista.direccion, (mensaje) => billetera.signMessage(mensaje));
  const detalle = [lista.detalle, guardada.ok ? null : guardada.aviso].filter((item): item is string => Boolean(item)).join(" ");
  return {
    id: identidad.id,
    nombre: identidad.nombre,
    direccion: lista.direccion,
    usdcListo: lista.usdcListo,
    detalle: detalle || null,
  };
}
