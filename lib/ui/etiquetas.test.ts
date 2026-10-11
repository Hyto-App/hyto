import assert from "node:assert/strict";
import test from "node:test";
import { estadoConFoto, etiquetaVeredicto, textoNota, textoVisible } from "./etiquetas";

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
    "Foto. Category booth, condition met, evidence Completed.",
  );
  assert.equal(textoVisible(""), "");
  assert.equal(textoVisible(null), "");
});

test("los veredictos se muestran en inglés", () => {
  assert.equal(etiquetaVeredicto("cumplió"), "Completed");
  assert.equal(etiquetaVeredicto("parcial"), "Partially completed");
  assert.equal(etiquetaVeredicto("insuficiente"), "Insufficient");
  assert.equal(textoNota(etiquetaVeredicto("parcial"), 64), "64% · Partially completed");
});

test("la bandeja muestra comprobantes de llegada y la evidencia de la comida", () => {
  assert.equal(textoVisible("Lista de quienes llegaron al evento", "es"), "Comprobantes de llegada recibidos");
  assert.equal(textoVisible("Lista de quienes llegaron al evento"), "Check-in proofs received");
  assert.equal(textoVisible("Comprobantes recibidos"), "Check-in proofs received");
  assert.equal(textoVisible("List of people who arrived", "es"), "Comprobantes de llegada recibidos");
  assert.equal(textoVisible("Evidencia de la comida"), "Evidence of the meal");
  assert.equal(textoVisible("Evidencia de la comida", "es"), "Evidencia de la comida");
  assert.equal(textoVisible("Foto del comprobante de la comida"), "Evidence of the meal receipt");
  assert.equal(textoVisible("Foto del comprobante"), "Evidence of the meal receipt");
  assert.equal(textoVisible("Photo of the meal receipt"), "Evidence of the meal receipt");
  assert.equal(textoVisible("Evidence of the meal receipt", "es"), "Evidencia del comprobante de la comida");
  assert.equal(textoVisible("Foto del comprobante", "es"), "Evidencia del comprobante de la comida");
  assert.equal(textoVisible("Photo of the meal receipt", "es"), "Evidencia del comprobante de la comida");
});

test("los veredictos en español no cambian el valor interno", () => {
  assert.equal(etiquetaVeredicto("insuficiente", "es"), "Insuficiente");
  assert.equal(etiquetaVeredicto("parcial", "es"), "Parcialmente completado");
  assert.equal(etiquetaVeredicto("cumplió", "es"), "Completado");
  assert.equal(textoNota(etiquetaVeredicto("parcial", "es"), 64), "64% · Parcialmente completado");
  assert.equal(textoVisible("Set up the booth", "es"), "Montar el stand");
  assert.equal(textoVisible("Montar el stand", "es"), "Montar el stand");
});

test("estadoConFoto keeps a pending task pending when a photo exists", () => {
  assert.equal(estadoConFoto("pendiente", true), "pendiente");
  assert.equal(estadoConFoto("pendiente", false), "pendiente");
  assert.equal(estadoConFoto("en revisión", true), "en revisión");
  assert.equal(estadoConFoto("pagado", true), "pagado");
});

test("la cola en inglés «Category X, grade N%.» de la nota de Mile no llega a la pantalla", () => {
  assert.equal(
    textoVisible("Mesa armada en la entrada, con el banner de frente. Category work, grade 67%.", "es"),
    "Mesa armada en la entrada, con el banner de frente.",
  );
  assert.equal(
    textoVisible("The image displays a white paper receipt. Category receipt, grade 88%.", "en"),
    "The image displays a white paper receipt.",
  );
  assert.equal(textoVisible("Category work, grade 67%.", "es"), "");
});
