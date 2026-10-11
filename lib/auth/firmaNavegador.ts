import { asegurarIdentidadCavos } from "@/lib/auth/cavosSesion";
import { conectarStellar, crearAuth } from "@/lib/auth/cliente";

/**
 * Whether THIS browser can sign for the signed-in account.
 *
 * The Hyto session (cookie + wallet address) and the account key are two different things. Signing
 * in with the email code finds the account's address in the Cavos registry and opens a session
 * even when this browser's Cavos vault holds no key for it (`needs-device-approval`). The balance
 * and the address then look fine everywhere, but nothing can be signed here. Settings and Lock
 * budget both ask this one question, the same way the signature asks it.
 */
export type EstadoFirma =
  | { estado: "lista"; direccion: string }
  /** `passkey`: a passkey the person added can restore the key here (only known after `restaurar`). */
  | { estado: "sin-clave"; direccion: string | null; passkey: boolean }
  | { estado: "sin-sesion" }
  | { estado: "desconocido" };

export type BilleteraRevisada = { address: string; status: string; passkeyRestore?: boolean };

export type DependenciasFirma = {
  /** Null when sign-in isn't configured. Throws when the Cavos sign-in is gone. */
  conectar: (opciones: { passkey: boolean }) => Promise<BilleteraRevisada | null>;
};

export type OpcionesRevision = {
  /**
   * Passkey mode: the Cavos vault restores the key from a passkey the person added, and shows its
   * own "Verify it's you" window to do it. Off (the default), the check never opens a window.
   */
  restaurar?: boolean;
  deps?: DependenciasFirma;
};

export class SinSesionCavos extends Error {}

export async function revisarFirmaNavegador(opciones: OpcionesRevision = {}): Promise<EstadoFirma> {
  const deps = opciones.deps ?? dependenciasReales();
  let billetera: BilleteraRevisada | null;
  try {
    billetera = await deps.conectar({ passkey: opciones.restaurar === true });
  } catch (error) {
    if (error instanceof SinSesionCavos) return { estado: "sin-sesion" };
    return { estado: "desconocido" };
  }
  if (!billetera) return { estado: "desconocido" };
  const direccion = billetera.address.trim() || null;
  if (billetera.status === "needs-device-approval") {
    return { estado: "sin-clave", direccion, passkey: billetera.passkeyRestore === true };
  }
  if (!direccion) return { estado: "desconocido" };
  return { estado: "lista", direccion };
}

function dependenciasReales(): DependenciasFirma {
  return {
    async conectar({ passkey }) {
      const auth = await crearAuth();
      if (!auth) return null;
      if (!asegurarIdentidadCavos(auth)) throw new SinSesionCavos();
      const conectada = await conectarStellar(auth, passkey ? { passkey: true } : {});
      const billetera = conectada.wallet("stellar");
      if (billetera.chain !== "stellar") return null;
      const conRestauracion = billetera as typeof billetera & { passkeyRestore?: boolean };
      return { address: billetera.address, status: billetera.status, passkeyRestore: conRestauracion.passkeyRestore };
    },
  };
}
