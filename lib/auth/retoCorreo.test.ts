import assert from "node:assert/strict";
import test from "node:test";
import { conNonce, guardarRetoCorreo, leerRetoCorreo, olvidarRetoCorreo, ponerNonce, VIDA_RETO_MS, type RetoCorreo } from "./retoCorreo";

function memoria(): Storage {
  const datos = new Map<string, string>();
  return {
    get length() {
      return datos.size;
    },
    clear: () => datos.clear(),
    getItem: (clave) => datos.get(clave) ?? null,
    key: (indice) => [...datos.keys()][indice] ?? null,
    removeItem: (clave) => datos.delete(clave),
    setItem: (clave, valor) => datos.set(clave, valor),
  };
}

const RETO: RetoCorreo = { email: "Ana@Example.com", nonce: "nonce-1", intencion: "signin" };

test("el reto del correo sobrevive una recarga y caduca a los diez minutos", () => {
  const caja = memoria();
  const ahora = 1_700_000_000_000;
  guardarRetoCorreo(RETO, ahora, caja);
  assert.deepEqual(leerRetoCorreo(ahora + 30_000, caja), {
    email: "ana@example.com",
    nonce: "nonce-1",
    intencion: "signin",
  });
  assert.equal(leerRetoCorreo(ahora + VIDA_RETO_MS, caja), null);
  assert.equal(leerRetoCorreo(ahora + 1_000, caja), null);
});

test("un reto roto o sin nonce no se restaura", () => {
  const caja = memoria();
  caja.setItem("hyto-reto-correo", "{");
  assert.equal(leerRetoCorreo(0, caja), null);
  guardarRetoCorreo({ email: "ana@example.com", nonce: "  ", intencion: "signup" }, 0, caja);
  assert.equal(leerRetoCorreo(0, caja), null);
  olvidarRetoCorreo(caja);
  assert.equal(caja.getItem("hyto-reto-correo"), null);
});

test("un fallo al verificar devuelve el nonce para reintentar el mismo código", async () => {
  const auth = { pendingNonce: "nonce-1" as string | null };
  const verificar = async () => {
    const nonce = auth.pendingNonce;
    auth.pendingNonce = null;
    if (nonce !== "nonce-1") throw new Error("kit/auth: /api/oauth/firebase/otp/verify -> 401");
    throw new TypeError("Failed to fetch");
  };
  await assert.rejects(() => conNonce(auth, verificar), (error: unknown) => error instanceof TypeError);
  assert.equal(auth.pendingNonce, "nonce-1");
  ponerNonce(auth, "otro");
  assert.equal(auth.pendingNonce, "otro");
});
