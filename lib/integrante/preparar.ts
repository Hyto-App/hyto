import type { AuthProvider } from "@cavos/kit";
import { conectarStellar } from "@/lib/auth/cliente";
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
      detalle: "Accounts are waiting for the Cavos app id.",
    };
  }

  const sesion = await conectarStellar(auth);
  const billetera = sesion.wallet("stellar");
  if (billetera.chain !== "stellar") {
    throw new Error("The account did not land on Stellar.");
  }

  const lista = await asegurarCobroUsdc(billetera);
  guardarCuenta(identidad.id, { direccion: lista.direccion, usdcListo: lista.usdcListo });
  return {
    id: identidad.id,
    nombre: identidad.nombre,
    direccion: lista.direccion,
    usdcListo: lista.usdcListo,
    detalle: lista.detalle,
  };
}
