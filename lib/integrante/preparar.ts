import { guardarCuenta } from "./almacen";
import { APP_SALT, appIdPublico, IDENTIDADES } from "./identidades";
import type { IdentidadDemo } from "./tipos";
import { asegurarCobroUsdc } from "./usdc";

export type CuentaPreparada = {
  id: string;
  nombre: string;
  direccion: string | null;
  usdcListo: boolean;
  detalle: string | null;
};

export async function prepararIdentidad(identidad: IdentidadDemo): Promise<CuentaPreparada> {
  const appId = appIdPublico();
  if (!appId) {
    return {
      id: identidad.id,
      nombre: identidad.nombre,
      direccion: null,
      usdcListo: false,
      detalle: "Las cuentas esperan el identificador de Cavos.",
    };
  }

  const { Cavos } = await import("@cavos/kit");
  const sesion = await Cavos.connect({
    chains: ["stellar"],
    defaultChain: "stellar",
    network: "testnet",
    appSalt: APP_SALT,
    appId,
    vault: true,
    identity: { userId: identidad.id, email: identidad.email },
  });
  const billetera = sesion.wallet("stellar");
  if (billetera.chain !== "stellar") {
    throw new Error("La cuenta no quedó en Stellar.");
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

export async function prepararCuentasDemo(
  alActualizar: (cuenta: CuentaPreparada) => void,
): Promise<CuentaPreparada[]> {
  const cuentas: CuentaPreparada[] = [];
  for (const identidad of IDENTIDADES) {
    try {
      const cuenta = await prepararIdentidad(identidad);
      cuentas.push(cuenta);
      alActualizar(cuenta);
    } catch (error) {
      const cuenta: CuentaPreparada = {
        id: identidad.id,
        nombre: identidad.nombre,
        direccion: null,
        usdcListo: false,
        detalle: error instanceof Error ? error.message : "No se pudo preparar la cuenta.",
      };
      cuentas.push(cuenta);
      alActualizar(cuenta);
    }
  }
  return cuentas;
}
