import type { AuthProvider, Identity } from "@cavos/kit";
import { olvidarDireccionAdmin } from "@/lib/admin/memoria";
import { borrarCavosLocal, recordarTokenCavos, userIdCavosGuardado } from "@/lib/auth/cavosSesion";
import { debeProvisionar, type IntencionIngreso } from "@/lib/auth/intencion";
import { completarAltaTestnet } from "@/lib/integrante/alta";
import { APP_SALT, appIdPublico } from "@/lib/integrante/identidades";
import type { BilleteraCobro } from "@/lib/integrante/tipos";

const RED_STELLAR = "testnet" as const;

export async function crearAuth() {
  const appId = appIdPublico();
  if (!appId) return null;
  const { CavosAuth } = await import("@cavos/kit");
  // The Hyto cookie lasts 14 days and is shared across tabs. The public Cavos
  // identity has to live in localStorage or a new tab cannot sign. The access
  // token still dies with the tab; recordarTokenCavos keeps a non-expired copy.
  return new CavosAuth({ appId, persistSession: true });
}

export async function conectarStellar(auth: AuthProvider) {
  const appId = appIdPublico();
  if (!appId) throw new Error("Sign-in is waiting for the Cavos app id.");
  const { Cavos } = await import("@cavos/kit");
  return Cavos.connect({
    chains: ["stellar"],
    defaultChain: "stellar",
    network: RED_STELLAR,
    appSalt: APP_SALT,
    appId,
    vault: true,
    auth,
  });
}

export async function fijarWallet(direccion: string): Promise<{ ok: true } | { ok: false; aviso: string }> {
  const respuesta = await fetch("/api/sesion/wallet", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ wallet: direccion }),
  });
  if (respuesta.ok) return { ok: true };
  const json = (await respuesta.json().catch(() => null)) as { aviso?: unknown } | null;
  const aviso = json && typeof json.aviso === "string" ? json.aviso : "Could not save this session's wallet.";
  return { ok: false, aviso };
}

export async function publicarSesion(
  email: string,
  token: string | null,
  intencion?: IntencionIngreso,
): Promise<{ ok: true; rol: string; provisionar: boolean; nuevo: boolean } | { ok: false; aviso: string }> {
  // Apple can sign in without an email (the server then keys the account on the
  // verified token), so only the token is required here.
  if (!token) return { ok: false, aviso: "Could not confirm sign-in." };
  const respuesta = await fetch("/api/sesion", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(intencion ? { email, token, intencion } : { email, token }),
  });
  const json = (await respuesta.json().catch(() => null)) as { aviso?: unknown; rol?: unknown; provisionar?: unknown; nuevo?: unknown } | null;
  if (!respuesta.ok) {
    const aviso = json && typeof json.aviso === "string" ? json.aviso : "Could not sign in.";
    return { ok: false, aviso };
  }
  return {
    ok: true,
    rol: typeof json?.rol === "string" ? json.rol : "",
    provisionar: json?.provisionar === true,
    nuevo: json?.nuevo === true,
  };
}

/**
 * `guardada` is true once the server session holds this wallet. A Sign up whose
 * testnet setup failed after that is still signed in: `aviso` explains what is
 * left, and Get ready to be paid on Events finishes it.
 */
export type IngresoCerrado = { aviso: string | null; direccion: string | null; guardada: boolean };

export async function entrarConCodigo(
  auth: AuthProvider,
  email: string,
  codigo: string,
  intencion: IntencionIngreso = "signin",
): Promise<IngresoCerrado & { identity: Identity }> {
  const identity = await authComo(auth).verifyOtp(email, codigo);
  recordarTokenCavos(auth.getAuthToken?.() ?? null);
  const sesion = await publicarSesion(identity.email ?? email, auth.getAuthToken?.() ?? null, intencion);
  if (!sesion.ok) return { identity, aviso: sesion.aviso, direccion: null, guardada: false };
  return { identity, ...(await cerrarConWallet(auth, sesion, intencion)) };
}

type AuthConOtp = AuthProvider & {
  verifyOtp(email: string, codigo: string): Promise<Identity>;
  handleCallback(busqueda: string, redirectUri?: string): Promise<Identity>;
  getGoogleOAuthUrl(redirectUri?: string): Promise<string>;
  getAppleOAuthUrl(redirectUri?: string): Promise<string>;
  sendOtp(email: string): Promise<void>;
};

function authComo(auth: AuthProvider): AuthConOtp {
  return auth as AuthConOtp;
}

export async function urlGoogle(auth: AuthProvider, redirectUri: string): Promise<string> {
  return authComo(auth).getGoogleOAuthUrl(redirectUri);
}

/** Apple returns through the same `?cavos_auth_code=` callback as Google (`entrarConGoogle`). */
export async function urlApple(auth: AuthProvider, redirectUri: string): Promise<string> {
  return authComo(auth).getAppleOAuthUrl(redirectUri);
}

export async function entrarConGoogle(
  auth: AuthProvider,
  busqueda: string,
  redirectUri: string,
  intencion: IntencionIngreso = "signin",
): Promise<IngresoCerrado> {
  const identity = await authComo(auth).handleCallback(busqueda, redirectUri);
  recordarTokenCavos(auth.getAuthToken?.() ?? null);
  const sesion = await publicarSesion(identity.email ?? "", auth.getAuthToken?.() ?? null, intencion);
  if (!sesion.ok) return { aviso: sesion.aviso, direccion: null, guardada: false };
  return cerrarConWallet(auth, sesion, intencion);
}

async function cerrarConWallet(
  auth: AuthProvider,
  sesion: { provisionar: boolean },
  intencion: IntencionIngreso,
): Promise<IngresoCerrado> {
  const conectada = await conectarStellar(auth);
  const billetera = conectada.wallet("stellar");
  if (billetera.chain !== "stellar" || !billetera.address) {
    return { aviso: "Could not sign in.", direccion: null, guardada: false };
  }
  const guardada = await fijarWallet(billetera.address);
  if (!guardada.ok) return { aviso: guardada.aviso, direccion: billetera.address, guardada: false };
  if (debeProvisionar(intencion, sesion.provisionar)) {
    const alta = await completarAltaTestnet(billetera as BilleteraCobro);
    if (!alta.ok) return { aviso: alta.aviso, direccion: billetera.address, guardada: true };
  }
  return { aviso: null, direccion: billetera.address, guardada: true };
}

export function redirectLimpio(): string {
  return `${window.location.origin}${window.location.pathname}`;
}

export async function cerrarSesionEnCliente(): Promise<void> {
  await olvidarCavos();
  try {
    await fetch("/api/sesion", { method: "DELETE" });
  } catch {
    // An expired or unreachable session still has to leave this browser.
  }
  try {
    olvidarDireccionAdmin();
  } catch {
    // The redirect below is the logout. A storage failure does not cancel it.
  }
  window.location.assign("/?signin=1");
}

async function olvidarCavos(): Promise<void> {
  const appId = appIdPublico();
  const guardado = userIdCavosGuardado(appId);
  try {
    const auth = await crearAuth();
    const identidad = auth?.restoreIdentity();
    const userId = identidad?.userId ?? guardado;
    if (auth && userId && appId) {
      try {
        const { VaultClient } = await import("@cavos/kit");
        const olvido = VaultClient.attach({ appId }).forget(userId, APP_SALT).catch(() => undefined);
        await Promise.race([olvido, new Promise((resolve) => setTimeout(resolve, 2000))]);
      } catch {
        // The vault iframe is optional. The stored identity is still removed.
      }
    }
    auth?.clearStoredIdentity();
  } catch {
    // Logout does not depend on the Cavos SDK loading.
  }
  borrarCavosLocal(appId);
}
