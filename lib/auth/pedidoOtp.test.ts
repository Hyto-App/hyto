import assert from "node:assert/strict";
import test from "node:test";
import { AVISO_RED, avisoDeIngreso, textoEspera } from "./errores";
import { pedirOtp } from "./pedidoOtp";

const CRUDO_429 =
  'kit/auth: /api/oauth/firebase/otp/request -> 429 {"error":"rate_limited","message":"Please wait 19 seconds before requesting another code.","wait_seconds":19}';

test("un 429 legible no es falta de red y no se queda con el nonce rechazado", async () => {
  const original = globalThis.fetch;
  const auth = {
    pendingNonce: "nonce-aceptado" as string | null,
    async sendOtp() {
      this.pendingNonce = "nonce-rechazado";
      throw new Error(CRUDO_429);
    },
  };
  try {
    await assert.rejects(pedirOtp(auth, "ana@example.com"), (error: unknown) => {
      const aviso = avisoDeIngreso(error);
      assert.equal(aviso.esperaSegundos, 19);
      assert.equal(aviso.texto, textoEspera(19));
      assert.notEqual(aviso.texto, AVISO_RED);
      return true;
    });
    assert.equal(auth.pendingNonce, "nonce-aceptado");
    assert.equal(globalThis.fetch, original);
  } finally {
    globalThis.fetch = original;
  }
});

test("si el navegador esconde el 429, Retry-After sigue siendo la espera y no la red", async () => {
  const original = globalThis.fetch;
  const pedidos: string[] = [];
  globalThis.fetch = async (input) => {
    pedidos.push(String(input));
    return new Response(JSON.stringify({ error: "rate_limited", wait_seconds: 53 }), {
      status: 429,
      headers: { "content-type": "application/json", "retry-after": "19" },
    });
  };
  const auth = {
    pendingNonce: "nonce-aceptado" as string | null,
    async sendOtp() {
      this.pendingNonce = "nonce-rechazado";
      const respuesta = await fetch("https://cavos.xyz/api/oauth/firebase/otp/request", {
        method: "POST",
        body: "{}",
      });
      if (!respuesta.ok) throw new TypeError("Failed to fetch");
    },
  };
  try {
    await assert.rejects(pedirOtp(auth, "ana@example.com"), (error: unknown) => {
      const aviso = avisoDeIngreso(error);
      assert.equal(aviso.esperaSegundos, 19);
      assert.equal(aviso.texto, textoEspera(19));
      assert.notEqual(aviso.texto, AVISO_RED);
      assert.equal(aviso.texto.includes("Failed to fetch"), false);
      return true;
    });
    assert.deepEqual(pedidos, ["/api/ingreso/codigo"]);
    assert.equal(auth.pendingNonce, "nonce-aceptado");
  } finally {
    globalThis.fetch = original;
  }
});

test("un fallo de red de verdad sigue siendo falta de conexión", async () => {
  const original = globalThis.fetch;
  const auth = {
    pendingNonce: "nonce-aceptado" as string | null,
    async sendOtp() {
      this.pendingNonce = "nonce-nuevo";
      throw new TypeError("Failed to fetch");
    },
  };
  try {
    await assert.rejects(pedirOtp(auth, "ana@example.com"), (error: unknown) => {
      assert.equal(avisoDeIngreso(error).texto, AVISO_RED);
      return true;
    });
    assert.equal(auth.pendingNonce, "nonce-aceptado");
  } finally {
    globalThis.fetch = original;
  }
});
