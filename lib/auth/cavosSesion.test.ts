import assert from "node:assert/strict";
import test from "node:test";
import { tokenCavosVigente } from "./cavosSesion";

function jwt(payload: Record<string, unknown>): string {
  const parte = (valor: Record<string, unknown>) => Buffer.from(JSON.stringify(valor)).toString("base64url");
  return `${parte({ alg: "none" })}.${parte(payload)}.x`;
}

test("un token de Cavos vigente se puede reutilizar y uno vencido no", () => {
  const ahora = Date.parse("2026-09-29T12:00:00Z");
  const vigente = jwt({ sub: "u", exp: Math.floor(ahora / 1000) + 3600 });
  const vencido = jwt({ sub: "u", exp: Math.floor(ahora / 1000) - 5 });
  const sinExp = jwt({ sub: "u" });
  assert.equal(tokenCavosVigente(vigente, ahora), true);
  assert.equal(tokenCavosVigente(vencido, ahora), false);
  assert.equal(tokenCavosVigente(sinExp, ahora), false);
  assert.equal(tokenCavosVigente("no-es-jwt", ahora), false);
});
