import assert from "node:assert/strict";
import test from "node:test";
import { cuandoVence } from "./vence";

test("same local day reads as today", () => {
  const ahora = new Date("2026-10-05T15:00:00Z");
  assert.match(cuandoVence("2026-10-05T22:00:00Z", ahora, "en") ?? "", /^today, 4:00\sPM$/);
  assert.match(cuandoVence("2026-10-05T22:00:00Z", ahora, "es") ?? "", /^hoy, /);
});

test("another day shows the weekday and date; a bad date is null", () => {
  const ahora = new Date("2026-10-05T15:00:00Z");
  assert.match(cuandoVence("2026-10-08T22:00:00Z", ahora, "en") ?? "", /Thu/);
  assert.equal(cuandoVence("nope", ahora, "en"), null);
});
