import assert from "node:assert/strict";
import test from "node:test";
import { tickEspera } from "./relojEspera";

test("al llegar a 0 el ref ya es 0, así el primer toque no se descarta", () => {
  const ref = { current: 1 };
  assert.equal(tickEspera(1, ref), 0);
  assert.equal(ref.current, 0);
  assert.equal(ref.current > 0, false);
  const quieto = { current: 4 };
  assert.equal(tickEspera(4, quieto), 3);
  assert.equal(quieto.current, 3);
  assert.equal(tickEspera(0, quieto), 0);
  assert.equal(quieto.current, 0);
});
