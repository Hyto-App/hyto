import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { existsSync } from "node:fs";
import test from "node:test";

test("la raíz manda a eventos a quien organiza y a mis tareas al resto, y sin sesión muestra la landing", () => {
  const pagina = readFileSync(new URL("../../app/(admin)/page.tsx", import.meta.url), "utf8");
  assert.match(pagina, /destinoInicio\(sesion, organiza\)/);
  assert.match(pagina, /eventosOrganizados\(sesion\.usuarioId\)/);
  assert.match(pagina, /<Landing demoHabilitado/);
  assert.match(pagina, /generateMetadata/);
  assert.match(pagina, /entrar\.tituloPestana/);
  assert.doesNotMatch(pagina, /absolute: "Hyto · Sign in"/);
  assert.doesNotMatch(pagina, /<Entrar abrirLogin/);
  assert.equal(existsSync(new URL("../../components/admin/Landing.tsx", import.meta.url)), true);
});
