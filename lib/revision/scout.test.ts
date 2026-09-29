import assert from "node:assert/strict";
import test from "node:test";
import { leerDescripcion } from "./scout";

test("lee el texto, el monto y la fecha", () => {
  const descripcion = leerDescripcion('{"texto":"Factura de comida","monto":"12.40","fecha":"2026-09-27"}');
  assert.deepEqual(descripcion, { texto: "Factura de comida", monto: "12.40", fecha: "2026-09-27" });
});

test("un monto que no es cifra se deja vacío", () => {
  const descripcion = leerDescripcion('Listo {"texto":"Mesa","monto":null,"fecha":null}');
  assert.equal(descripcion?.texto, "Mesa");
  assert.equal(descripcion?.monto, null);
  assert.equal(descripcion?.fecha, null);
});

test("sin texto no hay descripción", () => {
  assert.equal(leerDescripcion('{"monto":"1"}'), null);
});
