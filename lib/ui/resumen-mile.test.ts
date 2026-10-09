import assert from "node:assert/strict";
import test from "node:test";
import { lineaMontoMile } from "./monto-mile";
import { cuerpoDeFrase, resumirFrase } from "./resumen-mile";

const LARGO =
  "The photo shows a table set up at the entrance with a banner facing forward. Three open boxes sit on the table and the back of the room is out of frame. The work looks started but the requested wall is not visible. Category booth, grade 64%.";

test("el sufijo de categoría y nota no entra en el resumen", () => {
  assert.equal(
    cuerpoDeFrase(LARGO),
    "The photo shows a table set up at the entrance with a banner facing forward. Three open boxes sit on the table and the back of the room is out of frame. The work looks started but the requested wall is not visible.",
  );
});

test("un párrafo largo queda en una línea y el resto aparte", () => {
  const resumen = resumirFrase(LARGO, "en");
  assert.equal(resumen.linea, "The photo shows a table set up at the entrance with a banner facing forward.");
  assert.match(resumen.resto ?? "", /Three open boxes/);
  assert.equal(resumen.linea.includes("Category"), false);
  assert.equal((resumen.resto ?? "").includes("grade 64%"), false);
});

test("en español el resumen no se queda en inglés cuando hay lectura", () => {
  const resumen = resumirFrase(LARGO, "es", { comercio: "Soda La Esquina", montoOriginal: "₡3,300" });
  assert.equal(resumen.linea, "Recibo de Soda La Esquina por ₡3,300.");
  assert.match(resumen.resto ?? "", /The photo shows/);
  assert.equal(resumen.linea.includes("The photo"), false);
});

test("en español sin lectura el resumen usa la frase del diccionario", () => {
  const resumen = resumirFrase(LARGO, "es");
  assert.equal(resumen.linea, "Mile describió esta foto.");
  assert.ok(resumen.resto);
});

test("un texto ya en español se resume en español", () => {
  const frase =
    "La foto muestra la mesa armada y el banner de frente. Falta el fondo del salón. Hay tres cajas abiertas sobre la mesa y no se ve la pared pedida.";
  const resumen = resumirFrase(frase, "es");
  assert.equal(resumen.linea, "La foto muestra la mesa armada y el banner de frente.");
  assert.match(resumen.resto ?? "", /Falta el fondo/);
});

test("una sola oración corta no abre Ver más", () => {
  const resumen = resumirFrase("Table set up, ZEEK banner facing forward.", "en");
  assert.equal(resumen.linea, "Table set up, ZEEK banner facing forward.");
  assert.equal(resumen.resto, null);
});

test("el monto de Mile va primero como cifra impresa y dólares", () => {
  assert.equal(
    lineaMontoMile({ montoOriginal: "₡3,300", moneda: "CRC", montoUsd: "6.53" }, "en"),
    "₡3,300 ≈ US$6.53",
  );
  assert.equal(
    lineaMontoMile({ montoOriginal: "₡3,300", moneda: "CRC", montoUsd: "6.53" }, "es"),
    "₡3,300 ≈ US$6,53",
  );
  assert.equal(lineaMontoMile({ montoUsd: "12.40", moneda: "USD" }, "en"), "US$12.40");
  assert.equal(lineaMontoMile({}, "en"), null);
});
