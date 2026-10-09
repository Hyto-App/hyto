import assert from "node:assert/strict";
import test from "node:test";
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
  assert.equal(fecha.texto, "Falta la fecha del recibo");
  assert.equal(monto.texto, "Falta el monto del recibo");
  assert.equal(presentarEtiqueta(etiqueta({ id: "date_missing", texto: "Receipt date missing" }), "en").texto, "Receipt date missing");
});
