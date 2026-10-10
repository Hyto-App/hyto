import assert from "node:assert/strict";
import test from "node:test";
import { usuarioDemo } from "./demo";
import { nombreEnIdioma, nombreOrganizadorVisible, nombreParaMostrar, nombreVisible } from "./nombre";
import { primerNombre } from "@/lib/ui/saludo";
import { texto } from "@/lib/ui/diccionario";

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

test("los usuarios demo se ven en español con ES y en inglés con EN, sin cambiar los datos sembrados", () => {
  const voluntario = usuarioDemo("voluntario");
  const organizador = usuarioDemo("organizador");
  assert.equal(voluntario.nombre, "Volunteer (demo)");
  assert.equal(organizador.nombre, "Organizer (demo)");
  assert.equal(nombreEnIdioma(voluntario.nombre ?? "", "es"), "Voluntario (demo)");
  assert.equal(nombreEnIdioma(organizador.nombre ?? "", "es"), "Organizador (demo)");
  assert.equal(nombreEnIdioma(voluntario.nombre ?? "", "en"), "Volunteer (demo)");
  assert.equal(nombreEnIdioma(organizador.nombre ?? "", "en"), "Organizer (demo)");
  assert.equal(nombreEnIdioma("Ana Rojas", "es"), "Ana Rojas");
  // Seeded people with role-only names read in Spanish too, so the greeting never says "Volunteer".
  assert.equal(nombreEnIdioma("Volunteer 1", "es"), "Voluntario 1");
  assert.equal(primerNombre(nombreEnIdioma("Volunteer 1", "es")), "Voluntario");
  assert.equal(nombreEnIdioma("Organizer", "es"), "Organizador");
  assert.equal(nombreEnIdioma("Volunteer 1", "en"), "Volunteer 1");
  assert.equal(nombreEnIdioma("Volunteer Smith", "es"), "Volunteer Smith");
  // Greeting, "To …" in the payment dialog, and "… decides".
  assert.equal(primerNombre(nombreEnIdioma(voluntario.nombre ?? "", "es")), "Voluntario");
  assert.equal(`${texto("es", "confirmar.to")} ${nombreEnIdioma(voluntario.nombre ?? "", "es")}`, "Para Voluntario (demo)");
  const decide = nombreParaMostrar(organizador.nombre, "ZEEK", "es");
  assert.equal(decide, "Organizador (demo)");
  assert.equal(texto("es", "evidencia.stepOrganizerName", { name: decide ?? "" }), "El organizador aprueba (Organizador (demo) decide)");
  assert.equal(nombreParaMostrar(organizador.nombre, "ZEEK", "en"), "Organizer (demo)");
  assert.equal(nombreParaMostrar("Organizer", "ZEEK", "es"), "Organizador");
});
