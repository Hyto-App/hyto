import assert from "node:assert/strict";
import test from "node:test";
import { datosRecibo } from "./recibo";

const HASH = "ab".repeat(32);

test("el comprobante separa neto, bruto y comisión en los dos idiomas", () => {
  const tarea = {
    tipo: "reembolso" as const,
    monto: "15",
    tope: "15",
    montoConfirmado: "12.48",
    titulo: "Team meal",
    evento: "ZEEK",
    enviadaEn: "2026-10-05T18:04:00.000Z",
    hashPago: HASH,
  };
  const en = datosRecibo(tarea, "en");
  assert.equal(en?.neto, "US$12.44");
  assert.equal(en?.bruto, "US$12.48");
  assert.equal(en?.comision, "US$0.04");
  assert.equal(en?.tarea, "Team meal");
  assert.equal(en?.evento, "ZEEK");
  assert.equal(en?.fecha, "Oct 5, 2026");
  assert.equal(en?.red, `https://stellar.expert/explorer/testnet/tx/${HASH}`);
  assert.equal(en?.red?.includes("/public/"), false);

  const es = datosRecibo(tarea, "es");
  assert.equal(es?.neto, "US$12,44");
  assert.equal(es?.bruto, "US$12,48");
  assert.equal(es?.comision, "US$0,04");
  assert.equal(es?.fecha, "5 oct 2026");
});

test("sin fecha guardada el comprobante no inventa una, y un hash corto no abre la red", () => {
  const datos = datosRecibo(
    {
      tipo: "trabajo",
      monto: "20",
      tope: null,
      titulo: "Booth",
      evento: "  ",
      enviadaEn: null,
      hashPago: "abc",
    },
    "en",
  );
  assert.equal(datos?.neto, "US$19.94");
  assert.equal(datos?.bruto, "US$20");
  assert.equal(datos?.comision, "US$0.06");
  assert.equal(datos?.fecha, null);
  assert.equal(datos?.evento, null);
  assert.equal(datos?.red, null);
});

test("un monto que no se puede explicar no arma comprobante", () => {
  assert.equal(
    datosRecibo({ tipo: "trabajo", monto: "", tope: null, titulo: "Booth" }),
    null,
  );
});
