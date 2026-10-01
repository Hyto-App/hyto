import { esCuenta } from "@/lib/escrow/cuerpos";
import { USDC } from "@/lib/integrante/identidades";
import { HORIZON_TESTNET } from "@/lib/integrante/trustline";

/** USDC kept aside so the wallet can still pay fees and the next step. */
export const RESERVA_USDC = "1";

export const AVISO_WALLET_FONDOS = "Add a Stellar wallet with USDC before creating an event.";
export const AVISO_SALDO_EVENTO = "Your USDC balance is not enough for this event.";
export const AVISO_SALDO_TAREA = "Your USDC balance is not enough to fund this task.";
export const AVISO_SALDO_LECTURA = "Could not read the USDC balance.";

export type LectorSaldoUsdc = (direccion: string) => Promise<string>;

type Saldo = {
  asset_code?: string;
  asset_issuer?: string;
  balance?: string;
};

let lector: LectorSaldoUsdc = (direccion) => leerSaldoUsdcHorizon(direccion);

export function fijarLectorSaldo(siguiente: LectorSaldoUsdc | null): void {
  lector = siguiente ?? ((direccion) => leerSaldoUsdcHorizon(direccion));
}

export function lectorSaldoActual(): LectorSaldoUsdc {
  return lector;
}

export function aUnidades(valor: string): bigint | null {
  const limpio = valor.trim();
  if (!/^\d+(\.\d+)?$/.test(limpio)) return null;
  const [entero, frac = ""] = limpio.split(".");
  const frac7 = `${frac}0000000`.slice(0, 7);
  return BigInt(entero) * 10_000_000n + BigInt(frac7);
}

export function sumarMontos(montos: string[]): string | null {
  let total = 0n;
  for (const monto of montos) {
    const unidades = aUnidades(monto);
    if (unidades === null) return null;
    total += unidades;
  }
  const entero = total / 10_000_000n;
  const frac = (total % 10_000_000n).toString().padStart(7, "0").replace(/0+$/, "");
  return frac ? `${entero}.${frac}` : entero.toString();
}

export function alcanza(saldo: string, requerido: string): boolean {
  const disponible = aUnidades(saldo);
  const necesario = aUnidades(requerido);
  if (disponible === null || necesario === null) return false;
  return disponible >= necesario;
}

export async function leerSaldoUsdcHorizon(direccion: string, fetchImpl: typeof fetch = fetch): Promise<string> {
  const respuesta = await fetchImpl(`${HORIZON_TESTNET}/accounts/${encodeURIComponent(direccion)}`, {
    signal: AbortSignal.timeout(4000),
  });
  if (!respuesta.ok) throw new Error(AVISO_SALDO_LECTURA);
  const json = (await respuesta.json()) as { balances?: Saldo[] };
  const saldo = (json.balances ?? []).find((item) => item.asset_code === USDC.code && item.asset_issuer === USDC.issuer);
  return saldo?.balance ?? "0";
}

export async function respuestaSiFondosInsuficientes(
  wallet: string,
  monto: string,
  aviso: string,
  leerSaldo: LectorSaldoUsdc = lector,
): Promise<Response | null> {
  if (!esCuenta(wallet)) return Response.json({ aviso: AVISO_WALLET_FONDOS }, { status: 400 });
  const requerido = sumarMontos([monto, RESERVA_USDC]);
  if (!requerido) return Response.json({ aviso: "The milestone amount has to be greater than zero." }, { status: 400 });
  let saldo: string;
  try {
    saldo = await leerSaldo(wallet);
  } catch {
    return Response.json({ aviso: AVISO_SALDO_LECTURA }, { status: 503 });
  }
  if (!alcanza(saldo, requerido)) return Response.json({ aviso }, { status: 402 });
  return null;
}
