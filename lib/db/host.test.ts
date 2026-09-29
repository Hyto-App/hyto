import assert from "node:assert/strict";
import test from "node:test";
import { esHostLocal, esHostNeon } from "./host";

test("una URL de esta máquina no es Neon", () => {
  const local = "postgres://hyto:hyto@127.0.0.1:5432/hyto";
  assert.equal(esHostNeon(local), false);
  assert.equal(esHostLocal(local), true);
  assert.equal(esHostLocal("postgres://hyto:hyto@localhost:5432/hyto"), true);
  assert.equal(esHostNeon("postgres://u:p@ep-ejemplo.us-east-1.aws.neon.tech/neondb"), true);
  assert.equal(esHostLocal("postgres://u:p@ep-ejemplo.us-east-1.aws.neon.tech/neondb"), false);
});
