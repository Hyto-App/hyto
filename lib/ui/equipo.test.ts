import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { EQUIPO } from "./equipo";

test("el equipo de la landing tiene las cinco personas con foto WebP y alt", () => {
  assert.deepEqual(
    EQUIPO.map((p) => p.nombre),
    ["Josué", "Sebas", "Esteban", "Abdiel", "Raúl"],
  );
  for (const persona of EQUIPO) {
    assert.ok(persona.rolEn.trim());
    assert.ok(persona.rolEs.trim());
    assert.ok(persona.altEn.includes(persona.nombre));
    assert.ok(persona.altEs.includes(persona.nombre));
    assert.match(persona.foto, /^\/equipo\/[a-z]+\.webp$/);
    const ruta = join(process.cwd(), "public", persona.foto.replace(/^\//, ""));
    assert.equal(existsSync(ruta), true, ruta);
  }
});
