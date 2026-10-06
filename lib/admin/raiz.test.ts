import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { existsSync } from "node:fs";
import test from "node:test";

test("la raíz no tiene landing: abre el login o va a mis tareas", () => {
  const pagina = readFileSync(new URL("../../app/(admin)/page.tsx", import.meta.url), "utf8");
  assert.match(pagina, /if \(sesion\) redirect\("\/mis-tareas"\)/);
  assert.match(pagina, /<Entrar abrirLogin/);
  assert.equal(existsSync(new URL("../../components/admin/Landing.tsx", import.meta.url)), false);
});
