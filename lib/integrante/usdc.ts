import { USDC } from "./identidades";
import type { BilleteraCobro, CuentaLista } from "./tipos";

type Saldo = {
  asset_code?: string;
  asset_issuer?: string;
};

export function cuentaTieneUsdc(cuenta: { balances?: Saldo[] } | null): boolean {
  return (cuenta?.balances ?? []).some(
    (saldo) => saldo.asset_code === USDC.code && saldo.asset_issuer === USDC.issuer,
  );
}

export async function consultarUsdc(direccion: string, fetchImpl: typeof fetch = fetch): Promise<boolean> {
  const respuesta = await fetchImpl(`https://horizon-testnet.stellar.org/accounts/${direccion}`);
  if (respuesta.status === 404) return false;
  if (!respuesta.ok) {
    throw new Error("No se pudo leer la cuenta.");
  }
  const json = (await respuesta.json()) as { balances?: Saldo[] };
  return cuentaTieneUsdc(json);
}

export async function asegurarCobroUsdc(
  billetera: BilleteraCobro,
  tieneUsdc: (direccion: string) => Promise<boolean> = consultarUsdc,
): Promise<CuentaLista> {
  if (billetera.status === "needs-device-approval") {
    return {
      direccion: billetera.address,
      usdcListo: false,
      detalle: "Esta sesión no puede firmar esta cuenta.",
    };
  }

  if (billetera.status === "undeployed") {
    await billetera.execute(1n, billetera.address);
  }

  if (await tieneUsdc(billetera.address)) {
    return { direccion: billetera.address, usdcListo: true, detalle: null };
  }

  await billetera.addTrustline({ code: USDC.code, issuer: USDC.issuer });
  return { direccion: billetera.address, usdcListo: true, detalle: null };
}
