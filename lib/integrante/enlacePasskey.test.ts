import assert from "node:assert/strict";
import test from "node:test";
import { enlacePasskey, enlacePasskeyVisible, pidePasskey, RUTA_PASSKEY_CUENTAS } from "./enlacePasskey";

test("el enlace de la guía apunta a la tarjeta de llave de acceso en el mismo sitio", () => {
  assert.equal(enlacePasskey("https://hyto.vercel.app"), "https://hyto.vercel.app/account?add=passkey#passkey");
  assert.equal(enlacePasskey("https://hyto.vercel.app/"), "https://hyto.vercel.app/account?add=passkey#passkey");
  assert.equal(enlacePasskeyVisible("hyto.vercel.app"), "hyto.vercel.app/account");
  assert.equal(RUTA_PASSKEY_CUENTAS, "/cuentas?add=passkey");
});

test("Cuenta reconoce el enlace por la consulta o por el ancla", () => {
  assert.equal(pidePasskey("?add=passkey", ""), true);
  assert.equal(pidePasskey("", "#passkey"), true);
  assert.equal(pidePasskey("?x=1&add=passkey", "#otra"), true);
  assert.equal(pidePasskey("", ""), false);
  assert.equal(pidePasskey("?add=otra", "#nada"), false);
});
