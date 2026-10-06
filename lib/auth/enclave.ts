import type { AuthProvider, SocialRecoveryClient, SocialRecoveryCredential } from "@cavos/kit";

/**
 * Cavos hardware-isolated recovery ("enclave"): the wallet key is sealed by Cavos's enclave and
 * reopened on any device after a fresh Google, Apple or email-link sign-in. It is opt-in per Cavos
 * environment (Dashboard → App → Environments) and the environment picks exactly one sign-in
 * method. https://docs.cavos.xyz/docs/hardware-isolated-recovery
 *
 * Hyto asks the public policy endpoint before every sign-in and connect. Until Cavos turns it on
 * (or when the endpoint can't be reached) the policy is inactive and sign-in works as before.
 */
export const URL_CAVOS = "https://cavos.xyz";
export const ESPERA_POLITICA_MS = 4000;

export type ProveedorRecuperacion = "google" | "apple" | "email";
export type PoliticaRecuperacion = { activa: false } | { activa: true; proveedor: ProveedorRecuperacion };

export const POLITICA_INACTIVA: PoliticaRecuperacion = Object.freeze({ activa: false });

const PROVEEDORES = new Set<ProveedorRecuperacion>(["google", "apple", "email"]);
const cache = new Map<string, Promise<PoliticaRecuperacion>>();

export function urlPolitica(appId: string): string {
  return `${URL_CAVOS}/api/recovery/social/config?app_id=${encodeURIComponent(appId)}`;
}

/** Anything but `enabled: true` with one known provider keeps today's sign-in. */
export function interpretarPolitica(json: unknown): PoliticaRecuperacion {
  if (!json || typeof json !== "object") return POLITICA_INACTIVA;
  const datos = json as { enabled?: unknown; provider?: unknown };
  if (datos.enabled !== true) return POLITICA_INACTIVA;
  const proveedor = typeof datos.provider === "string" ? datos.provider.toLowerCase() : "";
  if (!PROVEEDORES.has(proveedor as ProveedorRecuperacion)) return POLITICA_INACTIVA;
  return { activa: true, proveedor: proveedor as ProveedorRecuperacion };
}

export type OpcionesPolitica = { fetch?: typeof fetch; esperaMs?: number };

/**
 * One request per page and app id. A failed or slow request is not cached, so the next sign-in
 * asks again instead of keeping the fallback for the whole visit.
 */
export function leerPoliticaRecuperacion(appId: string | null, opciones: OpcionesPolitica = {}): Promise<PoliticaRecuperacion> {
  if (!appId) return Promise.resolve(POLITICA_INACTIVA);
  const guardada = cache.get(appId);
  if (guardada) return guardada;
  const pendiente = pedirPolitica(appId, opciones);
  cache.set(appId, pendiente);
  void pendiente.then((politica) => {
    if (politica === FALLO) cache.delete(appId);
  });
  return pendiente;
}

/** Tests only. */
export function olvidarPoliticaRecuperacion(): void {
  cache.clear();
}

const FALLO: PoliticaRecuperacion = Object.freeze({ activa: false });

async function pedirPolitica(appId: string, opciones: OpcionesPolitica): Promise<PoliticaRecuperacion> {
  const pedir = opciones.fetch ?? globalThis.fetch;
  if (typeof pedir !== "function") return FALLO;
  const control = typeof AbortController === "function" ? new AbortController() : null;
  let reloj: ReturnType<typeof setTimeout> | undefined;
  const limite = new Promise<null>((resolve) => {
    reloj = setTimeout(() => {
      control?.abort();
      resolve(null);
    }, opciones.esperaMs ?? ESPERA_POLITICA_MS);
  });
  try {
    const respuesta = await Promise.race([
      pedir(urlPolitica(appId), { cache: "no-store", ...(control ? { signal: control.signal } : {}) }),
      limite,
    ]);
    if (!respuesta) return FALLO;
    // 404 environment_not_found is an answer (no recovery for this app), not a network failure.
    if (respuesta.status === 404) return POLITICA_INACTIVA;
    if (!respuesta.ok) return FALLO;
    const politica = interpretarPolitica(await respuesta.json().catch(() => null));
    return politica.activa ? politica : POLITICA_INACTIVA;
  } catch {
    return FALLO;
  } finally {
    if (reloj !== undefined) clearTimeout(reloj);
  }
}

type AuthConCredencial = AuthProvider & {
  hasSocialRecoveryCredential?: () => boolean;
  consumeSocialRecoveryCredential?: () => SocialRecoveryCredential;
};

export type KitRecuperacion = Pick<typeof import("@cavos/kit"), "SocialRecoveryClient" | "DEFAULT_SOCIAL_RECOVERY_ATTESTATION">;

/**
 * The `Cavos.connect` fields that turn on enclave recovery. In vault mode the vault builds its own
 * recovery client; the one passed here only selects the mode. The login proof exists only in the
 * tab that just finished a Google, Apple or email-link sign-in (it is never stored), so later
 * connects carry none and use the key this browser already holds.
 */
export function opcionesRecuperacion(
  politica: PoliticaRecuperacion,
  auth: AuthProvider,
  appId: string,
  kit: KitRecuperacion,
): { socialRecovery?: SocialRecoveryClient; socialRecoveryCredential?: SocialRecoveryCredential } {
  if (!politica.activa) return {};
  const socialRecovery = new kit.SocialRecoveryClient({
    baseUrl: URL_CAVOS,
    appId,
    attestation: kit.DEFAULT_SOCIAL_RECOVERY_ATTESTATION,
  });
  const conCredencial = auth as AuthConCredencial;
  const credencial =
    typeof conCredencial.hasSocialRecoveryCredential === "function" &&
    conCredencial.hasSocialRecoveryCredential() &&
    typeof conCredencial.consumeSocialRecoveryCredential === "function"
      ? conCredencial.consumeSocialRecoveryCredential()
      : null;
  return credencial ? { socialRecovery, socialRecoveryCredential: credencial } : { socialRecovery };
}
