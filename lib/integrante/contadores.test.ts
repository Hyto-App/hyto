import assert from "node:assert/strict";
import test from "node:test";
import { contarEnRevision } from "./contadores";

test("en revisión cuenta fotos, no la suma de los montos", () => {
  const tareas = [
    { estado: "en revisión" as const },
    { estado: "en revisión" as const },
    { estado: "pendiente" as const },
    { estado: "pagado" as const },
  ];
  assert.equal(contarEnRevision(tareas), 2);
  assert.equal(contarEnRevision([]), 0);
});
