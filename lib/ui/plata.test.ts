import assert from "node:assert/strict";
import test from "node:test";
import { formatearDolaresTexto } from "@/lib/integrante/formato";
import { fraseComision, fraseTasa, fraseTresMontos } from "./plata";

const comida = {
  tipo: "reembolso" as const,
  monto: "15",
  tope: "15",
  montoConfirmado: "12.48",
  montoRevisado: "12.48",
  lectura: { moneda: "CRC", montoOriginal: "₡6,300", tasa: 505 },
};

test("los tres montos de la revisión van en una frase, en los dos idiomas", () => {
  const en = fraseTresMontos(comida, "en");
  const es = fraseTresMontos(comida, "es");
  assert.equal(
    en,
    "The volunteer spent ₡6,300 (about US$12.48). We reserve the cap (US$15) and pay only US$12.48.",
  );
  assert.match(es ?? "", /El voluntario gastó ₡6,300/);
  assert.match(es ?? "", /US\$12,48/);
  assert.match(es ?? "", /US\$15/);
  assert.equal(fraseTresMontos({ ...comida, tipo: "trabajo" }, "en"), null);
});

test("sin monto confirmado y por encima del tope no promete pagar el leído", () => {
  const frase = fraseTresMontos(
    { ...comida, montoConfirmado: null, montoRevisado: "20", lectura: null },
    "en",
  );
  assert.match(frase ?? "", /pay only the amount you confirm/);
  assert.equal(frase?.includes("pay only US$20"), false);
});

test("la comisión del 0,3 % separa bruto y neto", () => {
  const frase = fraseComision("12.48", "en");
  assert.match(frase ?? "", /You pay US\$12\.48/);
  assert.match(frase ?? "", /0\.3% fee \(US\$0\.03744\)/);
  assert.match(frase ?? "", /they receive US\$12\.44256/);
  assert.match(fraseComision("12.48", "es") ?? "", /0,3 %/);
  assert.match(fraseComision("12.48", "es") ?? "", /US\$12,44256/);
  assert.equal(fraseComision(null, "en"), null);
});

test("el tipo de cambio dice fuente, fecha y quién absorbe la diferencia", () => {
  const frase = fraseTasa(comida.lectura, "en");
  assert.match(frase ?? "", /Hyto's rate, set on Oct 4, 2026: 505 CRC per US dollar/);
  assert.match(frase ?? "", /the organizer absorbs the difference/);
  assert.equal(frase?.includes("converted at 505"), false);
  assert.match(fraseTasa(comida.lectura, "es") ?? "", /quien organiza absorbe la diferencia/);
  assert.equal(fraseTasa({ moneda: "USD", montoOriginal: "12", tasa: 1 }, "en"), null);
});

test("un neto con más de dos decimales sigue en US$", () => {
  assert.equal(formatearDolaresTexto("12.44256", "en"), "US$12.44256");
  assert.equal(formatearDolaresTexto("12.44256", "es"), "US$12,44256");
  assert.equal(formatearDolaresTexto("19.94", "en"), "US$19.94");
  assert.equal(formatearDolaresTexto("0.03744", "en"), "US$0.03744");
});
