import assert from "node:assert/strict";
import test from "node:test";
import type { AuthProvider } from "@cavos/kit";
import {
  POLITICA_INACTIVA,
  URL_CAVOS,
  interpretarPolitica,
  leerPoliticaRecuperacion,
  olvidarPoliticaRecuperacion,
  opcionesRecuperacion,
  urlPolitica,
  type KitRecuperacion,
} from "./enclave";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

test("only enabled with one known provider turns enclave recovery on", () => {
  assert.deepEqual(interpretarPolitica({ enabled: true, provider: "google", delay_seconds: 0 }), { activa: true, proveedor: "google" });
  assert.deepEqual(interpretarPolitica({ enabled: true, provider: "Email" }), { activa: true, proveedor: "email" });
  assert.deepEqual(interpretarPolitica({ enabled: true, provider: "apple" }), { activa: true, proveedor: "apple" });
  // What Cavos answers for Hyto today: off, no provider.
  assert.equal(interpretarPolitica({ enabled: false, providers: ["google", "apple", "email"], provider: null }).activa, false);
  assert.equal(interpretarPolitica({ enabled: true, provider: null }).activa, false);
  assert.equal(interpretarPolitica({ enabled: true, provider: "github" }).activa, false);
  assert.equal(interpretarPolitica({ enabled: "true", provider: "google" }).activa, false);
  assert.equal(interpretarPolitica(null).activa, false);
  assert.equal(interpretarPolitica("enabled").activa, false);
});

test("the policy is read from the public Cavos endpoint once per app id", async () => {
  olvidarPoliticaRecuperacion();
  const urls: string[] = [];
  const pedir = (async (input: RequestInfo | URL) => {
    urls.push(String(input));
    return json({ enabled: true, provider: "email", delay_seconds: 0 });
  }) as typeof fetch;
  assert.deepEqual(await leerPoliticaRecuperacion("cav_app 1", { fetch: pedir }), { activa: true, proveedor: "email" });
  assert.deepEqual(await leerPoliticaRecuperacion("cav_app 1", { fetch: pedir }), { activa: true, proveedor: "email" });
  assert.deepEqual(urls, [`${URL_CAVOS}/api/recovery/social/config?app_id=cav_app%201`]);
  assert.equal(urlPolitica("x"), "https://cavos.xyz/api/recovery/social/config?app_id=x");
});

test("no app id, disabled, unknown app (404), errors and timeouts keep today's sign-in", async () => {
  olvidarPoliticaRecuperacion();
  let llamadas = 0;
  const contar = (respuesta: () => Promise<Response>) =>
    (async () => {
      llamadas += 1;
      return respuesta();
    }) as typeof fetch;

  assert.equal((await leerPoliticaRecuperacion(null, { fetch: contar(async () => json({})) })).activa, false);
  assert.equal(llamadas, 0);

  assert.equal((await leerPoliticaRecuperacion("apagada", { fetch: contar(async () => json({ enabled: false, provider: null })) })).activa, false);
  assert.equal((await leerPoliticaRecuperacion("desconocida", { fetch: contar(async () => json({ error: "environment_not_found" }, 404)) })).activa, false);
  assert.equal((await leerPoliticaRecuperacion("rota", { fetch: contar(async () => json({}, 500)) })).activa, false);
  assert.equal((await leerPoliticaRecuperacion("sin-red", { fetch: contar(async () => Promise.reject(new TypeError("Failed to fetch"))) })).activa, false);
  const lenta = await leerPoliticaRecuperacion("lenta", {
    fetch: contar(() => new Promise<Response>(() => {})),
    esperaMs: 10,
  });
  assert.equal(lenta.activa, false);
  assert.equal(llamadas, 5);

  // A failed or slow answer is asked again; a real "off" or 404 is kept for the visit.
  const encendida = contar(async () => json({ enabled: true, provider: "google" }));
  assert.equal((await leerPoliticaRecuperacion("rota", { fetch: encendida })).activa, true);
  assert.equal((await leerPoliticaRecuperacion("sin-red", { fetch: encendida })).activa, true);
  assert.equal((await leerPoliticaRecuperacion("lenta", { fetch: encendida })).activa, true);
  assert.equal((await leerPoliticaRecuperacion("apagada", { fetch: encendida })).activa, false);
  assert.equal((await leerPoliticaRecuperacion("desconocida", { fetch: encendida })).activa, false);
  assert.equal(llamadas, 8);
  olvidarPoliticaRecuperacion();
});

class ClienteFalso {
  constructor(readonly opciones: { baseUrl: string; appId: string; attestation: unknown }) {}
}
const ATESTACION = { pcr0: "pcr0-prueba" };
const KIT = { SocialRecoveryClient: ClienteFalso, DEFAULT_SOCIAL_RECOVERY_ATTESTATION: ATESTACION } as unknown as KitRecuperacion;

function authCon(credencial: unknown) {
  let tomadas = 0;
  const auth = {
    hasSocialRecoveryCredential: () => credencial !== null,
    consumeSocialRecoveryCredential: () => {
      tomadas += 1;
      return credencial;
    },
  } as unknown as AuthProvider;
  return { auth, tomadas: () => tomadas };
}

test("inactive recovery adds nothing to Cavos.connect", () => {
  const { auth, tomadas } = authCon({ provider: "google" });
  assert.deepEqual(opcionesRecuperacion(POLITICA_INACTIVA, auth, "cav_app", KIT), {});
  assert.equal(tomadas(), 0);
});

test("active recovery passes the enclave client and the fresh sign-in proof when there is one", () => {
  const credencial = { provider: "google", idToken: "tok" };
  const conProof = authCon(credencial);
  const conOpciones = opcionesRecuperacion({ activa: true, proveedor: "google" }, conProof.auth, "cav_app", KIT);
  assert.ok(conOpciones.socialRecovery instanceof ClienteFalso);
  assert.deepEqual((conOpciones.socialRecovery as unknown as ClienteFalso).opciones, {
    baseUrl: "https://cavos.xyz",
    appId: "cav_app",
    attestation: ATESTACION,
  });
  assert.equal(conOpciones.socialRecoveryCredential, credencial);
  assert.equal(conProof.tomadas(), 1);

  // A later connect (signing) has no proof: only the mode, and the key this browser holds.
  const sinProof = authCon(null);
  const sinOpciones = opcionesRecuperacion({ activa: true, proveedor: "google" }, sinProof.auth, "cav_app", KIT);
  assert.ok(sinOpciones.socialRecovery instanceof ClienteFalso);
  assert.equal("socialRecoveryCredential" in sinOpciones, false);
  assert.equal(sinProof.tomadas(), 0);

  // An auth without the recovery API (older SDK) still connects in enclave mode.
  const viejo = opcionesRecuperacion({ activa: true, proveedor: "email" }, {} as AuthProvider, "cav_app", KIT);
  assert.ok(viejo.socialRecovery instanceof ClienteFalso);
  assert.equal("socialRecoveryCredential" in viejo, false);
});
