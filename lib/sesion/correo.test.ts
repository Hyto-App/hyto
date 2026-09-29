import assert from "node:assert/strict";
import test from "node:test";
import { correoDelToken } from "./correo";

function token(claims: unknown): string {
  return `aaaa.${Buffer.from(JSON.stringify(claims)).toString("base64url")}.bbbb`;
}

test("toma el correo del token si coincide", () => {
  const correo = correoDelToken(token({ sub: "abc", email: "Organizador@demo.hyto" }), "organizador@demo.hyto");
  assert.deepEqual(correo, { correo: "organizador@demo.hyto", sub: "abc" });
});

test("rechaza otro correo y un token sin sujeto", () => {
  assert.equal(correoDelToken(token({ sub: "abc", email: "otro@demo.hyto" }), "organizador@demo.hyto"), null);
  assert.equal(correoDelToken(token({ email: "organizador@demo.hyto" }), "organizador@demo.hyto"), null);
  assert.equal(correoDelToken("no-es-token", "organizador@demo.hyto"), null);
});
