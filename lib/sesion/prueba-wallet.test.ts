import assert from "node:assert/strict";
import test from "node:test";
import { prefixedMessageBytes } from "@cavos/kit";
import { Keypair } from "@stellar/stellar-sdk";
import { bytesMensajeCavos, emitirRetoWallet, firmaDeCuenta, firmaDesdeBase64, verificarPruebaWallet } from "./prueba-wallet";

const SECRETO = { HYTO_TOKEN_SECRET: "hyto-token-secret-for-tests-32ch", NODE_ENV: "test" };

test("el prefijo firmado es el de Cavos y la clave de otra cuenta no vale", () => {
  const dueno = Keypair.random();
  const ajeno = Keypair.random();
  const mensaje = "Hyto confirms control of this Stellar account.\nAccount: G\nNonce: abc";
  const bytes = bytesMensajeCavos(mensaje);
  assert.equal(Buffer.from(prefixedMessageBytes(new TextEncoder().encode(mensaje))).equals(Buffer.from(bytes)), true);
  const firma = dueno.sign(Buffer.from(bytes));
  assert.equal(firmaDeCuenta(dueno.publicKey(), mensaje, firma), true);
  assert.equal(firmaDeCuenta(ajeno.publicKey(), mensaje, firma), false);
  assert.equal(firmaDeCuenta(dueno.publicKey(), `${mensaje}!`, firma), false);
  assert.equal(firmaDeCuenta(dueno.publicKey(), mensaje, firma.subarray(0, 32)), false);
});

test("el reto solo lo cumple la sesión y la cuenta que lo pidieron", () => {
  const dueno = Keypair.random();
  const reto = emitirRetoWallet("sesion-1", dueno.publicKey(), 1_000, SECRETO);
  assert.ok(reto);
  const firma = dueno.sign(Buffer.from(bytesMensajeCavos(reto.mensaje)));
  assert.deepEqual(verificarPruebaWallet("sesion-1", dueno.publicKey(), reto.token, firma, 1_000, SECRETO), { ok: true });
  assert.equal(verificarPruebaWallet("sesion-2", dueno.publicKey(), reto.token, firma, 1_000, SECRETO).ok, false);
  assert.equal(verificarPruebaWallet("sesion-1", Keypair.random().publicKey(), reto.token, firma, 1_000, SECRETO).ok, false);
  assert.equal(verificarPruebaWallet("sesion-1", dueno.publicKey(), reto.token, firma, 1_000 + 10 * 60 * 1000, SECRETO).ok, false);
  assert.equal(verificarPruebaWallet("sesion-1", dueno.publicKey(), `${reto.token}x`, firma, 1_000, SECRETO).ok, false);
  assert.equal(emitirRetoWallet("sesion-1", dueno.publicKey(), 1_000, { NODE_ENV: "production" }), null);
});

test("una firma que no es base64 no se lee", () => {
  assert.equal(firmaDesdeBase64(""), null);
  assert.equal(firmaDesdeBase64("%%%"), null);
  const bytes = firmaDesdeBase64(Buffer.from(new Uint8Array(64)).toString("base64"));
  assert.equal(bytes?.length, 64);
});
