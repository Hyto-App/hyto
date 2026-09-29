import assert from "node:assert/strict";
import test from "node:test";
import { SESION_SIN_EXP_SEGUNDOS, TOPE_SESION_SEGUNDOS, encabezadoCookie, expiracion, segundosDeSesion } from "./cookie";

const AHORA = Date.parse("2026-09-29T12:00:00.000Z");

test("la sesión sigue el exp del JWT, con tope de 24 h y 8 h si falta", () => {
  assert.equal(segundosDeSesion(AHORA / 1000 + 60 * 60, AHORA), 60 * 60);
  assert.equal(segundosDeSesion(AHORA / 1000 + 10 * 24 * 60 * 60, AHORA), TOPE_SESION_SEGUNDOS);
  assert.equal(segundosDeSesion(undefined, AHORA), SESION_SIN_EXP_SEGUNDOS);
  assert.equal(segundosDeSesion(Number.NaN, AHORA), SESION_SIN_EXP_SEGUNDOS);
  assert.equal(segundosDeSesion(AHORA / 1000 - 10, AHORA), 1);

  const segundos = segundosDeSesion(AHORA / 1000 + 90 * 60, AHORA);
  assert.equal(encabezadoCookie("abc", segundos).includes(`Max-Age=${segundos}`), true);
  assert.equal(Date.parse(expiracion(segundos, AHORA)), AHORA + segundos * 1000);
  assert.equal(encabezadoCookie("abc").includes(`Max-Age=${SESION_SIN_EXP_SEGUNDOS}`), true);
  assert.equal(Date.parse(expiracion(undefined, AHORA)), AHORA + SESION_SIN_EXP_SEGUNDOS * 1000);
});
