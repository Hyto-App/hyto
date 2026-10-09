import assert from "node:assert/strict";
import test from "node:test";
import { nombreVisible } from "./perfil";

test("an empty name, the email, or the part before @ is no name", () => {
  assert.equal(nombreVisible("Ana Rojas", "ana@hyto.test"), "Ana Rojas");
  assert.equal(nombreVisible("  ", "ana@hyto.test"), null);
  assert.equal(nombreVisible("ANA@hyto.test", "ana@hyto.test"), null);
  assert.equal(nombreVisible("ana", "ana@hyto.test"), null);
  assert.equal(nombreVisible("ANA", "Ana@hyto.test"), null);
  assert.equal(nombreVisible(null, "ana@hyto.test"), null);
  assert.equal(nombreVisible(undefined, "ana@hyto.test"), null);
});
