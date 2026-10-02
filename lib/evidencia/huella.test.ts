import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { distanciaHamming, sha256De } from "./huella";
import { jpegDePrueba, jpegDistinto } from "./muestras";
import { phashDe, UMBRAL_COPIA } from "./phash";

test("sha256 distingue copias exactas", () => {
  const bytes = new Uint8Array([1, 2, 3, 4]);
  assert.equal(sha256De(bytes), sha256De(bytes));
  assert.notEqual(sha256De(bytes), sha256De(new Uint8Array([1, 2, 3, 5])));
  assert.equal(sha256De(bytes).length, 64);
});

test("la distancia de Hamming cuenta los bits distintos", () => {
  assert.equal(distanciaHamming("0000000000000000", "0000000000000000"), 0);
  assert.equal(distanciaHamming("0000000000000001", "0000000000000000"), 1);
  assert.equal(distanciaHamming("ffffffffffffffff", "0000000000000000"), 64);
});

test("el dHash de una copia cercana queda bajo el umbral y el de un inverso no", async () => {
  const original = await jpegDistinto();
  const copia = new Uint8Array(original);
  const misma = await phashDe(original);
  assert.equal(await phashDe(copia), misma);
  assert.equal(distanciaHamming(misma, misma) <= UMBRAL_COPIA, true);

  const invertido = await sharp(Buffer.from(original)).negate().jpeg().toBuffer();
  const lejos = distanciaHamming(misma, await phashDe(new Uint8Array(invertido)));
  assert.equal(lejos > UMBRAL_COPIA, true);

  const solido = await jpegDePrueba();
  assert.equal((await phashDe(solido)).length, 16);
});
