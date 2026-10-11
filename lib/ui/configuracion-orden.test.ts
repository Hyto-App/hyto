import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const PAGINA = readFileSync(new URL("../../app/(integrante)/configuracion/page.tsx", import.meta.url), "utf8");

test("Configuración deja «Cerrar sesión» al final de la página", () => {
  const cuerpo = PAGINA.slice(PAGINA.indexOf("<main"), PAGINA.indexOf("</main>"));
  const salir = cuerpo.indexOf("<Salir />");
  assert.ok(salir > 0, "Falta Cerrar sesión.");
  assert.equal(cuerpo.match(/<Salir \/>/g)?.length, 1);
  for (const antes of ["<PanelCuenta />", "<TipoCuenta />", "<AjustesPerfil />", "<EditorPerfil />", 'href="/privacy"', "<Entrar "]) {
    assert.ok(cuerpo.indexOf(antes) < salir, `${antes} debería ir antes de Cerrar sesión`);
  }
});
