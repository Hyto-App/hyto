import { USDC } from "@/lib/integrante/identidades";
import { HORIZON_TESTNET } from "@/lib/integrante/trustline";

const ESCALA = 10_000_000n;
const HORIZON_PUBLIC = "https://horizon.stellar.org";

/** Small USDC reserve kept on top of the amount being locked. */
export const RESERVA_USDC = "1";

export type LecturaSaldo = {
  saldo: string | null;
  /**
   * False when the account is missing or cannot hold the payment yet.
   * Omitted when the caller did not check. A zero balance with this true
   * means the account can receive and simply has nothing yet.
   */
  puedeRecibir?: boolean;
};

export type LectorSaldo = (direccion: string) => Promise<LecturaSaldo>;

let lector: LectorSaldo | null = null;

export function usarLectorSaldo(siguiente: LectorSaldo | null): void {
  lector = siguiente;
}

export function lectorSaldoVigente(): LectorSaldo {
  return lector ?? leerSaldoUsdc;
}

export function redStellar(env: NodeJS.ProcessEnv = process.env): "testnet" | "public" {
  const red = env.HYTO_STELLAR_NETWORK?.trim().toLowerCase();
  if (red === "public" || red === "mainnet") return "public";
  return "testnet";
}

export function urlHorizon(direccion: string, env: NodeJS.ProcessEnv = process.env): string {
  const base = redStellar(env) === "public" ? HORIZON_PUBLIC : HORIZON_TESTNET;
  return `${base}/accounts/${encodeURIComponent(direccion)}`;
}

export function aUnidades(valor: string): bigint | null {
  const limpio = valor.trim();
  if (!/^\d+(\.\d+)?$/.test(limpio)) return null;
  const [entero, frac = ""] = limpio.split(".");
  const fraccion = (frac + "0000000").slice(0, 7);
  return BigInt(entero) * ESCALA + BigInt(fraccion);
}

export function desdeUnidades(valor: bigint): string {
  const entero = valor / ESCALA;
  const fraccion = (valor % ESCALA).toString().padStart(7, "0").replace(/0+$/, "");
  return fraccion ? `${entero}.${fraccion}` : String(entero);
}

export function sumarMontos(montos: string[]): string | null {
  let total = 0n;
  for (const monto of montos) {
    const unidades = aUnidades(monto);
    if (unidades === null) return null;
    total += unidades;
  }
  return desdeUnidades(total);
}

export function conReserva(monto: string): string | null {
  const base = aUnidades(monto);
  const reserva = aUnidades(RESERVA_USDC);
  if (base === null || reserva === null) return null;
  return desdeUnidades(base + reserva);
}

/**
 * The create-event button uses this before it asks the server.
 * Null means the balance is unknown or already covers the tasks plus the reserve.
 */
export function faltaParaCrear(saldo: string | null, montoTareas: string): { necesario: string; reserva: string } | null {
  if (saldo === null) return null;
  const base = aUnidades(montoTareas);
  if (base === null || base <= 0n) return null;
  const necesario = conReserva(montoTareas);
  if (!necesario || alcanza(saldo, necesario)) return null;
  return { necesario, reserva: RESERVA_USDC };
}

/** Balance already on the ledger, or null when it cannot be read. Does not create anything. */
export async function saldoCreacion(
  wallet: string | null | undefined,
  leer: LectorSaldo = leerSaldoUsdc,
): Promise<string | null> {
  const limpia = wallet?.trim() ?? "";
  if (!/^G[A-Z2-7]{55}$/.test(limpia)) return null;
  try {
    return (await leer(limpia)).saldo;
  } catch {
    return null;
  }
}

export function alcanza(saldo: string, necesario: string): boolean {
  const disponible = aUnidades(saldo);
  const pedido = aUnidades(necesario);
  if (disponible === null || pedido === null) return false;
  return disponible >= pedido;
}

export function saldoUsdcDe(cuenta: { balances?: { balance?: string; asset_code?: string; asset_issuer?: string }[] } | null): string {
  const linea = lineaUsdc(cuenta);
  return linea?.balance && aUnidades(linea.balance) !== null ? linea.balance : "0";
}

/** True only when the account can already hold the payment. A missing account cannot. */
export function puedeRecibirUsdc(cuenta: { balances?: { asset_code?: string; asset_issuer?: string }[] } | null): boolean {
  return lineaUsdc(cuenta) !== undefined;
}

function lineaUsdc(cuenta: { balances?: { balance?: string; asset_code?: string; asset_issuer?: string }[] } | null) {
  return (cuenta?.balances ?? []).find((saldo) => saldo.asset_code === USDC.code && saldo.asset_issuer === USDC.issuer);
}

export async function leerSaldoUsdc(direccion: string, fetchImpl: typeof fetch = fetch): Promise<LecturaSaldo> {
  let respuesta: Response;
  try {
    respuesta = await fetchImpl(urlHorizon(direccion), { signal: AbortSignal.timeout(4000) });
  } catch {
    throw new Error("Could not read the USDC balance.");
  }
  if (respuesta.status === 404) return { saldo: null, puedeRecibir: false };
  if (!respuesta.ok) throw new Error("Could not read the USDC balance.");
  const json = (await respuesta.json()) as { balances?: { balance?: string; asset_code?: string; asset_issuer?: string }[] };
  const puedeRecibir = puedeRecibirUsdc(json);
  return { saldo: saldoUsdcDe(json), puedeRecibir };
}

export async function rechazoSiFondos(wallet: string, monto: string, leer: LectorSaldo = lectorSaldoVigente()): Promise<Response | null> {
  const limpia = wallet.trim();
  if (!/^G[A-Z2-7]{55}$/.test(limpia)) {
    return Response.json({ aviso: "Add a Stellar wallet before locking this payment." }, { status: 400 });
  }
  const necesario = conReserva(monto);
  if (!necesario) return Response.json({ aviso: "The milestone amount has to be greater than zero." }, { status: 400 });
  try {
    const lectura = await leer(limpia);
    if (lectura.saldo === null) return Response.json({ aviso: "This wallet is not on the network yet." }, { status: 400 });
    if (!alcanza(lectura.saldo, necesario)) {
      return Response.json(
        { aviso: `Your balance does not cover US$${necesario} (this amount plus a US$${RESERVA_USDC} reserve).` },
        { status: 400 },
      );
    }
  } catch {
    return Response.json({ aviso: "Could not read the USDC balance." }, { status: 503 });
  }
  return null;
}
