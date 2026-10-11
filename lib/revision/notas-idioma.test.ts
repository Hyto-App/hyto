import assert from "node:assert/strict";
import test from "node:test";
import { textoFalta } from "./falta";
import { presentarEtiqueta } from "./notas-idioma";
import { faltantesDe, type EtiquetaNota } from "./razones";
import type { LecturaEvidencia } from "./lectura";

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
  assert.equal(textoFalta([etiquetaNota], "es"), "Falta: la evidencia del comprobante de la comida.");
});

test("varias redacciones de Mile caen en el requisito, en Mis tareas y en la nota", () => {
  const redacciones = [
    "La foto del comprobante de la comida no es visible",
    "No se muestra la foto del comprobante de la comida",
    "el comprobante de la comida",
    "The meal receipt photo is not visible",
    "Photo of the meal receipt is missing",
    "no aparece la evidencia del comprobante de la comida",
  ];
  for (const redaccion of redacciones) {
    const nota = etiqueta({
      id: "part_missing",
      texto: "Part of the request missing",
      explicacion: `Missing: ${redaccion}.`,
    });
    assert.equal(presentarEtiqueta(nota, "es").explicacion, "Falta: la evidencia del comprobante de la comida.", redaccion);
    assert.equal(presentarEtiqueta(nota, "en").explicacion, "Missing: evidence of the meal receipt.", redaccion);
    assert.equal(textoFalta([nota], "es"), "Falta: la evidencia del comprobante de la comida.", redaccion);
    assert.equal(textoFalta([nota], "en"), "Missing: evidence of the meal receipt.", redaccion);
  }
  const mezcla = etiqueta({
    id: "part_missing",
    texto: "Part of the request missing",
    explicacion: "Falta: el monto de la factura; No se muestra la foto del comprobante de la comida; la fecha de la factura.",
  });
  assert.equal(
    presentarEtiqueta(mezcla, "es").explicacion,
    "Falta: el monto de la factura; la evidencia del comprobante de la comida; la fecha de la factura.",
  );
  assert.equal(
    presentarEtiqueta(mezcla, "en").explicacion,
    "Missing: the invoice amount; evidence of the meal receipt; the invoice date.",
  );
  assert.equal(presentarEtiqueta(mezcla, "en").explicacion.includes("No se muestra"), false);
  assert.equal(
    textoFalta([mezcla], "es"),
    "Falta: el monto de la factura; la evidencia del comprobante de la comida; la fecha de la factura.",
  );
  const suelta = etiqueta({
    id: "part_missing",
    texto: "Part of the request missing",
    explicacion: "Missing: No se ve el logo del local.",
  });
  assert.equal(presentarEtiqueta(suelta, "es").explicacion, "Falta: algo de lo pedido.");
  assert.equal(presentarEtiqueta(suelta, "en").explicacion, "Missing: something the task asks for.");
  assert.equal(presentarEtiqueta(suelta, "en").explicacion.includes("logo"), false);
  const pedido = etiqueta({
    id: "part_missing",
    texto: "Part of the request missing",
    explicacion: "Missing: el mantel; la hoja de registro.",
  });
  const mesa = "Mesa armada en la entrada con mantel, cartel de bienvenida y hoja de registro";
  assert.equal(presentarEtiqueta(pedido, "es").explicacion, "Falta: algo de lo pedido.");
  assert.equal(presentarEtiqueta(pedido, "en").explicacion, "Missing: something the task asks for.");
  assert.equal(presentarEtiqueta(pedido, "es", mesa).explicacion, "Falta: mantel; hoja de registro.");
  assert.equal(presentarEtiqueta(pedido, "en", mesa).explicacion, "Missing: mantel; hoja de registro.");
  assert.equal(textoFalta([pedido], "en", mesa), "Missing: mantel; hoja de registro.");
  const deMile = etiqueta({
    id: "part_missing",
    texto: "Part of the request missing",
    explicacion: "Missing: mantel sobre la mesa; No se ve el logo del local.",
  });
  assert.equal(presentarEtiqueta(deMile, "es", mesa).explicacion, "Falta: mantel; algo de lo pedido.");
  assert.equal(presentarEtiqueta(deMile, "en", mesa).explicacion, "Missing: mantel; something the task asks for.");
  assert.equal(presentarEtiqueta(deMile, "en", mesa).explicacion.includes("sobre la mesa"), false);
  assert.equal(presentarEtiqueta(deMile, "en", mesa).explicacion.includes("logo"), false);
  assert.equal(
    faltantesDe({ faltantes: ["No se muestra la foto del comprobante de la comida", "el monto de la factura", "No se ve el logo del local"] } as LecturaEvidencia),
    "evidence of the meal receipt; the invoice amount; something the task asks for",
  );
  assert.equal(
    faltantesDe({ faltantes: ["mantel sobre la mesa", "cartel de bienvenida", "No se ve el logo del local"] } as LecturaEvidencia, [
      "mantel",
      "cartel de bienvenida",
      "hoja de registro",
    ]),
    "mantel; cartel de bienvenida; something the task asks for",
  );
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
