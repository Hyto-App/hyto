import assert from "node:assert/strict";
import test from "node:test";
import { puntosDeCondicion } from "./puntos";

test("one sentence stays one point", () => {
  assert.deepEqual(puntosDeCondicion("Banner visible and the table set up"), ["Banner visible and the table set up"]);
});

test("splits on lines, bullets, semicolons and numbering", () => {
  assert.deepEqual(puntosDeCondicion("• Banner visible\n• Table set up"), ["Banner visible", "Table set up"]);
  assert.deepEqual(puntosDeCondicion("Banner visible; table set up; bags full"), ["Banner visible", "table set up", "bags full"]);
  assert.deepEqual(puntosDeCondicion("1. Banner visible 2. Table set up"), ["Banner visible", "Table set up"]);
  assert.deepEqual(puntosDeCondicion("1) Banner\n2) Table"), ["Banner", "Table"]);
  assert.deepEqual(puntosDeCondicion("- Banner\n- Table"), ["Banner", "Table"]);
});

test("drops empty items and keeps at most five", () => {
  assert.deepEqual(puntosDeCondicion("  \n;\n"), []);
  assert.equal(puntosDeCondicion("a;b;c;d;e;f;g").length, 5);
});
