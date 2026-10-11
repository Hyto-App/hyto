import assert from "node:assert/strict";
import test from "node:test";
import { textoFalta } from "./falta";
import { presentarEtiqueta } from "./notas-idioma";
import type { EtiquetaNota } from "./razones";

function etiqueta(parcial: Partial<EtiquetaNota> & Pick<EtiquetaNota, "id" | "texto">): EtiquetaNota {
  return {
    explicacion: "Stored English explanation.",
    severidad: "warning",
    preguntas: [],
    ...parcial,
  };
}

test("en español Receipt no se queda en inglés aunque la explicación no esté en el mapa", () => {
  const fecha = presentarEtiqueta(etiqueta({ id: "date_missing", texto: "Receipt date missing" }), "es");
  const monto = presentarEtiqueta(etiqueta({ id: "amount_missing", texto: "Receipt amount missing" }), "es");
  assert.equal(fecha.texto.includes("Receipt"), false);
  assert.equal(monto.texto.includes("Receipt"), false);
  assert.equal(fecha.texto, "Falta la fecha de la factura");
  assert.equal(monto.texto, "Falta el monto del recibo");
  assert.equal(presentarEtiqueta(etiqueta({ id: "date_missing", texto: "Receipt date missing" }), "en").texto, "Receipt date missing");
});

test("poco detalle nombra a Mile, no al modelo", () => {
  const es = presentarEtiqueta(
    etiqueta({
      id: "low_detail",
      texto: "Low detail",
      explicacion: "Two or more answers are unclear or Mile was unsure, so this grade is less certain.",
    }),
    "es",
  );
  assert.match(es.explicacion, /Mile/);
  assert.equal(es.explicacion.includes("el modelo"), false);
});

test("la nota de lo que falta localiza el comprobante, el monto y la fecha", () => {
  const comida = etiqueta({
    id: "part_missing",
    texto: "Part of the request missing",
    explicacion: "Missing: La foto del comprobante de la comida no es visible.",
  });
  const monto = etiqueta({
    id: "amount_missing",
    texto: "Receipt amount missing",
    explicacion: "The receipt answers do not give an amount.",
  });
  const fecha = etiqueta({
    id: "date_missing",
    texto: "Receipt date missing",
    explicacion: "The receipt answers do not give a date.",
  });
  const etiquetas = [comida, monto, fecha];
  assert.equal(textoFalta(etiquetas, "en"), "Missing: evidence of the meal receipt; the invoice amount; the invoice date.");
  assert.equal(
    textoFalta(etiquetas, "es"),
    "Falta: la evidencia del comprobante de la comida; el monto de la factura; la fecha de la factura.",
  );
  assert.equal(presentarEtiqueta(comida, "en").explicacion, "Missing: evidence of the meal receipt.");
  assert.equal(presentarEtiqueta(comida, "es").explicacion, "Falta: la evidencia del comprobante de la comida.");
  assert.equal(presentarEtiqueta(comida, "es").explicacion.includes("foto"), false);
  const junta = etiqueta({
    id: "part_missing",
    texto: "Part of the request missing",
    explicacion: "Falta: La foto del comprobante de la comida no es visible; el monto de la factura; la fecha de la factura.",
  });
  assert.equal(
    presentarEtiqueta(junta, "en").explicacion,
    "Missing: evidence of the meal receipt; the invoice amount; the invoice date.",
  );
  assert.equal(textoFalta([junta], "en"), "Missing: evidence of the meal receipt; the invoice amount; the invoice date.");
});

test("en inglés My tasks traduce «Missing: el comprobante de la comida.»", () => {
  const etiquetaNota = etiqueta({
    id: "part_missing",
    texto: "Part of the request missing",
    explicacion: "Missing: el comprobante de la comida.",
  });
  const en = presentarEtiqueta(etiquetaNota, "en");
  assert.equal(en.explicacion, "Missing: evidence of the meal receipt.");
  assert.equal(en.explicacion.includes("el comprobante"), false);
  assert.equal(textoFalta([etiquetaNota], "en"), "Missing: evidence of the meal receipt.");
  assert.equal(textoFalta([etiquetaNota], "es"), "Falta: el comprobante de la comida.");
});

test("My tasks cambia «the model was unsure» y «el modelo» por Mile", () => {
  const vieja = etiqueta({
    id: "low_detail",
    texto: "Low detail",
    explicacion: "Two or more answers are unclear or the model was unsure, so this grade is less certain.",
  });
  const en = presentarEtiqueta(vieja, "en");
  assert.match(en.explicacion, /Mile was unsure/);
  assert.equal(en.explicacion.includes("the model"), false);
  const es = presentarEtiqueta(vieja, "es");
  assert.match(es.explicacion, /Mile/);
  assert.equal(es.explicacion.includes("el modelo"), false);
  assert.equal(es.explicacion.includes("the model"), false);
  const suelta = presentarEtiqueta(etiqueta({ id: "nota", texto: "Nota", explicacion: "el modelo no estaba seguro." }), "es");
  assert.equal(suelta.explicacion.includes("el modelo"), false);
  assert.match(suelta.explicacion, /Mile/);
});

test("las notas de Mile para quien organiza dicen evidencia, no foto", () => {
  for (const id of ["cap_otra", "cap_no_coincide", "cap_regla_evento", "photo_unclear", "selfie_or_empty"]) {
    const nota = presentarEtiqueta(etiqueta({ id, texto: "Stored" }), "es");
    assert.doesNotMatch(`${nota.texto} ${nota.explicacion}`, /\bfotos?\b/i, id);
    assert.match(`${nota.texto} ${nota.explicacion}`, /evidencia/i, id);
  }
});
