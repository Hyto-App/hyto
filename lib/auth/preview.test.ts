import assert from "node:assert/strict";
import test from "node:test";
import { esHostPreview } from "./preview";

test("un preview de Vercel no es el sitio de producción ni el entorno local", () => {
  assert.equal(esHostPreview("hyto-git-cursor-security-gaps-d37a-vallesjo781-3057s-projects.vercel.app"), true);
  assert.equal(esHostPreview("hyto.vercel.app"), false);
  assert.equal(esHostPreview("localhost"), false);
  assert.equal(esHostPreview("127.0.0.1"), false);
  assert.equal(esHostPreview("hyto.vercel.app:443"), false);
});
