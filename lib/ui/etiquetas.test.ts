import assert from "node:assert/strict";
import test from "node:test";
import { textoVisible } from "./etiquetas";

test("las frases de ejemplo se traducen después de quitar el prefijo", () => {
  assert.equal(
    textoVisible("Ejemplo. Comprobante de la comida del equipo, con monto y fecha visibles."),
    "Example. Team meal receipt, with the amount and date visible.",
  );
  assert.equal(
    textoVisible("Example. Mesa armada, banner de ZEEK de frente y el salón visible."),
    "Example. Table set up, ZEEK banner facing forward, and the room is visible.",
  );
  assert.equal(textoVisible("Montar el stand"), "Set up the booth");
  assert.equal(textoVisible("Example. Table set up."), "Example. Table set up.");
});
