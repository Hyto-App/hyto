import type { AuthProvider, Identity } from "@cavos/kit";
import { olvidarDireccionAdmin } from "@/lib/admin/memoria";
import { borrarCavosLocal, recordarTokenCavos, userIdCavosGuardado } from "@/lib/auth/cavosSesion";
import { APP_SALT, appIdPublico } from "@/lib/integrante/identidades";

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
  if (!appId) throw new Error("El ingreso espera el identificador de Cavos.");
  const { Cavos } = await import("@cavos/kit");
  return Cavos.connect({
    chains: ["stellar"],
    defaultChain: "stellar",
    network: "testnet",
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
  const aviso = json && typeof json.aviso === "string" ? json.aviso : "No se pudo guardar la wallet de la sesión.";
  return { ok: false, aviso };
}

export async function publicarSesion(email: string, token: string | null): Promise<{ ok: true; rol: string } | { ok: false; aviso: string }> {
  if (!email || !token) return { ok: false, aviso: "No se pudo confirmar el ingreso." };
  const respuesta = await fetch("/api/sesion", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, token }),
  });
  const json = (await respuesta.json().catch(() => null)) as { aviso?: unknown; rol?: unknown } | null;
  if (!respuesta.ok) {
    const aviso = json && typeof json.aviso === "string" ? json.aviso : "No se pudo entrar.";
    return { ok: false, aviso };
  }
  return { ok: true, rol: typeof json?.rol === "string" ? json.rol : "" };
}

export async function entrarConCodigo(auth: AuthProvider, email: string, codigo: string): Promise<{ identity: Identity; aviso: string | null; direccion: string | null }> {
  const identity = await authComo(auth).verifyOtp(email, codigo);
  recordarTokenCavos(auth.getAuthToken?.() ?? null);
  const sesion = await publicarSesion(identity.email ?? email, auth.getAuthToken?.() ?? null);
  if (!sesion.ok) return { identity, aviso: sesion.aviso, direccion: null };
  const conectada = await conectarStellar(auth);
  const billetera = conectada.wallet("stellar");
  if (billetera.chain !== "stellar" || !billetera.address) {
    return { identity, aviso: "No se pudo entrar.", direccion: null };
  }
  const guardada = await fijarWallet(billetera.address);
  if (!guardada.ok) return { identity, aviso: guardada.aviso, direccion: billetera.address };
  return { identity, aviso: null, direccion: billetera.address };
}

type AuthConOtp = AuthProvider & {
  verifyOtp(email: string, codigo: string): Promise<Identity>;
  handleCallback(busqueda: string, redirectUri?: string): Promise<Identity>;
  getGoogleOAuthUrl(redirectUri?: string): Promise<string>;
  sendOtp(email: string): Promise<void>;
};

function authComo(auth: AuthProvider): AuthConOtp {
  return auth as AuthConOtp;
}

export async function urlGoogle(auth: AuthProvider, redirectUri: string): Promise<string> {
  return authComo(auth).getGoogleOAuthUrl(redirectUri);
}

export async function entrarConGoogle(auth: AuthProvider, busqueda: string, redirectUri: string) {
  const identity = await authComo(auth).handleCallback(busqueda, redirectUri);
  recordarTokenCavos(auth.getAuthToken?.() ?? null);
  const sesion = await publicarSesion(identity.email ?? "", auth.getAuthToken?.() ?? null);
  if (!sesion.ok) return { aviso: sesion.aviso, direccion: null as string | null };
  const conectada = await conectarStellar(auth);
  const billetera = conectada.wallet("stellar");
  if (billetera.chain !== "stellar" || !billetera.address) return { aviso: "No se pudo entrar.", direccion: null };
  const guardada = await fijarWallet(billetera.address);
  if (!guardada.ok) return { aviso: guardada.aviso, direccion: billetera.address };
  return { aviso: null, direccion: billetera.address };
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
