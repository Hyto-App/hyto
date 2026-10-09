import assert from "node:assert/strict";
import test from "node:test";
import { nombreEsInicioDeCorreo, nombreOrganizadorVisible, nombreParaMostrar, nombreVisible } from "./nombre";

const CORREO = "ana@hyto.test";

test("un nombre real se muestra y un pedazo del correo no", () => {
  assert.equal(nombreVisible("Ana Rojas", CORREO), "Ana Rojas");
  assert.equal(nombreVisible("ana", CORREO), null);
  assert.equal(nombreVisible("ANA", CORREO), null);
  assert.equal(nombreVisible(CORREO, CORREO), null);
  assert.equal(nombreVisible("Ana @ Norte", CORREO), null);
  assert.equal(nombreVisible("  ", CORREO), null);
  assert.equal(nombreVisible(null, CORREO), null);
});

test("solo el inicio del correo cuenta como nombre para limpiar", () => {
  assert.equal(nombreEsInicioDeCorreo("ana", CORREO), true);
  assert.equal(nombreEsInicioDeCorreo("ANA", CORREO), true);
  assert.equal(nombreEsInicioDeCorreo(CORREO, CORREO), true);
  assert.equal(nombreEsInicioDeCorreo("Ana Rojas", CORREO), false);
  assert.equal(nombreEsInicioDeCorreo("Ana @ Norte", CORREO), false);
  assert.equal(nombreEsInicioDeCorreo("", CORREO), false);
  assert.equal(nombreEsInicioDeCorreo("ana", ""), false);
});

test("quien organiza sin nombre usa el evento y, si no hay, nada", () => {
  assert.equal(nombreOrganizadorVisible("ana", CORREO, "Feria"), "Feria");
  assert.equal(nombreOrganizadorVisible("Ana Rojas", CORREO, "Feria"), "Ana Rojas");
  assert.equal(nombreOrganizadorVisible("", CORREO, "Feria"), "Feria");
  assert.equal(nombreOrganizadorVisible("ana", CORREO, "  "), null);
  assert.equal(nombreOrganizadorVisible("ana", CORREO, CORREO), null);
  assert.equal(nombreParaMostrar("ana@hyto.test", "Feria"), "Feria");
  assert.equal(nombreParaMostrar(null, null), null);
  assert.equal(nombreParaMostrar("Ana Rojas", null), "Ana Rojas");
});
