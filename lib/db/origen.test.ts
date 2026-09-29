import assert from "node:assert/strict";
import test from "node:test";
import { origenDeFila } from "./neon";

test("el almacén conserva el origen de la revisión", () => {
  assert.equal(origenDeFila("scout"), "scout");
  assert.equal(origenDeFila("guion"), "guion");
  assert.equal(origenDeFila("stub"), "stub");
  assert.equal(origenDeFila("error"), "error");
  assert.equal(origenDeFila("otro"), "scout");
});
