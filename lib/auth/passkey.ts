import { asegurarIdentidadCavos } from "@/lib/auth/cavosSesion";
import { conectarStellar, crearAuth } from "@/lib/auth/cliente";
import { AVISO_REINGRESO } from "@/lib/escrow/firmarCliente";
import { APP_SALT, appIdPublico } from "@/lib/integrante/identidades";
import type { EstadoCuenta } from "@/lib/integrante/tipos";
import {
  AVISO_PASSKEY_CANCELADA,
  AVISO_PASSKEY_FALLO,
  AVISO_PASSKEY_SIN_CLAVE,
  AVISO_PASSKEY_SIN_CONFIG,
  AVISO_PASSKEY_SIN_SOPORTE,
} from "./avisosPasskey";
import { leerWebAuthn, navegadorPuedeCrearPasskey } from "./soportePasskey";

export {
  AVISO_PASSKEY_CANCELADA,
  AVISO_PASSKEY_FALLO,
  AVISO_PASSKEY_SIN_CLAVE,
  AVISO_PASSKEY_SIN_CONFIG,
  AVISO_PASSKEY_SIN_SOPORTE,
};

type Cuenta = { address: string; status: EstadoCuenta };

export type DatosPasskey = {
  userId: string;
  userName: string;
  appSalt: string;
  authToken: string | null;
};

export type DependenciasPasskey = {
  soportado: () => Promise<boolean>;
  /** Connects without passkey mode, so a browser without the key is never asked for one here. */
  conectar: () => Promise<{ cuenta: Cuenta; datos: DatosPasskey }>;
  /** The Cavos vault shows its own "Add a passkey" window and stores the key copy the passkey seals. */
  enrolar: (datos: DatosPasskey) => Promise<void>;
};

/**
 * Adds a passkey that can open this account's key in another browser. The key never leaves the
 * Cavos vault: the vault encrypts a copy under the passkey's PRF output, and Cavos stores only that
 * ciphertext. Hyto's server stores nothing.
 */
export async function agregarPasskey(deps: DependenciasPasskey = dependenciasReales()): Promise<void> {
  let soportado = false;
  try {
    soportado = await deps.soportado();
  } catch {
    soportado = false;
  }
  if (!soportado) throw new Error(AVISO_PASSKEY_SIN_SOPORTE);

  let conexion: Awaited<ReturnType<DependenciasPasskey["conectar"]>>;
  try {
    conexion = await deps.conectar();
  } catch (error) {
    throw new Error(visible(error));
  }
  if (conexion.cuenta.status === "needs-device-approval") throw new Error(AVISO_PASSKEY_SIN_CLAVE);

  try {
    await deps.enrolar(conexion.datos);
  } catch (error) {
    throw new Error(visible(error));
  }
}

const CONOCIDOS = new Set([AVISO_REINGRESO, AVISO_PASSKEY_SIN_CONFIG, AVISO_PASSKEY_SIN_CLAVE, AVISO_PASSKEY_SIN_SOPORTE]);

function visible(error: unknown): string {
  const texto = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  if (CONOCIDOS.has(texto)) return texto;
  if (/does not hold the wallet key|connect a Solana or Stellar wallet before adding a passkey/i.test(texto)) {
    return AVISO_PASSKEY_SIN_CLAVE;
  }
  if (/cancel|NotAllowedError|not allowed|denied|abort/i.test(texto) || nombre(error) === "NotAllowedError") {
    return AVISO_PASSKEY_CANCELADA;
  }
  if (/registry lookup skipped: no login token|registry lookup failed: 401|kit\/auth: no identity|\b401\b/i.test(texto)) {
    return AVISO_REINGRESO;
  }
  console.warn("[passkey] Cavos did not add the passkey:", limpio(texto));
  return AVISO_PASSKEY_FALLO;
}

function nombre(error: unknown): string {
  return error && typeof error === "object" && "name" in error && typeof error.name === "string" ? error.name : "";
}

/** The raw Cavos error for the browser console, without an email, a token, or a long blob. */
function limpio(texto: string): string {
  return texto
    .replace(/[^\s@"'<>]+@[^\s@"'<>]+\.[a-z]{2,}/gi, "[email]")
    .replace(/eyJ[\w-]+\.[\w-]+\.[\w-]*/g, "[token]")
    .replace(/[A-Za-z0-9+/=_-]{48,}/g, "[…]")
    .slice(0, 300);
}

function dependenciasReales(): DependenciasPasskey {
  return {
    async soportado() {
      // Not PasskeyPrf.isSupported(): that requires a platform authenticator and
      // refuses Linux Chrome before enroll(), which does not require one.
      return navegadorPuedeCrearPasskey(leerWebAuthn());
    },
    async conectar() {
      const auth = await crearAuth();
      if (!auth) throw new Error(AVISO_PASSKEY_SIN_CONFIG);
      if (!asegurarIdentidadCavos(auth)) throw new Error(AVISO_REINGRESO);
      const identidad = auth.restoreIdentity();
      if (!identidad?.userId) throw new Error(AVISO_REINGRESO);
      const conectada = await conectarStellar(auth);
      const billetera = conectada.wallet("stellar");
      return {
        cuenta: { address: billetera.address, status: billetera.status },
        datos: {
          userId: identidad.userId,
          userName: identidad.email ?? identidad.userId,
          appSalt: APP_SALT,
          authToken: auth.getAuthToken?.() ?? null,
        },
      };
    },
    async enrolar(datos) {
      const appId = appIdPublico();
      if (!appId) throw new Error(AVISO_PASSKEY_SIN_CONFIG);
      const { VaultClient } = await import("@cavos/kit");
      // Same iframe the connect above used, so the vault already has this account open.
      await VaultClient.attach({ appId }).enrollPasskey(datos);
    },
  };
}
