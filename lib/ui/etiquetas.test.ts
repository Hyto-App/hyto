import assert from "node:assert/strict";
import test from "node:test";
import { textoVisible } from "./etiquetas";

test("las frases de ejemplo se traducen sin el prefijo Ejemplo o Example", () => {
  assert.equal(
    textoVisible("Ejemplo. Comprobante de la comida del equipo, con monto y fecha visibles."),
    "Team meal receipt, with the amount and date visible.",
  );
  assert.equal(
    textoVisible("Example. Mesa armada, banner de ZEEK de frente y el salón visible."),
    "Table set up, ZEEK banner facing forward, and the room is visible.",
  );
  assert.equal(textoVisible("Montar el stand"), "Set up the booth");
  assert.equal(textoVisible("Ejemplo. Montar el stand"), "Set up the booth");
  assert.equal(textoVisible("Example. Table set up."), "Table set up.");
  assert.equal(
    textoVisible("Example. Foto. Categoría stand, condición cumplida, evidencia cumplió."),
    "Foto. Category booth, condition met, evidence Completado.",
  );
  assert.equal(textoVisible(""), "");
  assert.equal(textoVisible(null), "");
});
