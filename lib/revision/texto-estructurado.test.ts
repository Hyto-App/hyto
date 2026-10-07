import assert from "node:assert/strict";
import test from "node:test";
import { corregirFactura, type RespuestasFactura } from "./laya";
import { contextoParaLaya } from "./lectura";
import { etiquetasDe } from "./razones";
import {
  estructurarTranscripcion,
  fechaCoincideConPedido,
  fechaEscrita,
  montoEscrito,
} from "./texto-estructurado";

const RECIBO = ["PRICESMART ZAPOTE", "Fecha: 01/10/2026", "Pollo asado", "TOTAL USD 4.10"].join("\n");

test("una transcripción llena monto, fecha e ítems como la lectura de una foto", () => {
  const descripcion = estructurarTranscripcion(RECIBO, {
    tipoTarea: "reembolso",
    condicion: "Receipt for a team meal on 1 October 2026",
  });
  assert.equal(descripcion.texto, RECIBO);
  assert.equal(descripcion.monto, "4.10");
  assert.equal(descripcion.fecha, "2026-10-01");
  assert.equal(descripcion.lectura?.moneda, "USD");
  assert.equal(descripcion.lectura?.comercio, "PRICESMART ZAPOTE");
  assert.deepEqual(descripcion.lectura?.articulos, ["Pollo asado"]);
  assert.match(contextoParaLaya(descripcion.lectura!), /Total as printed: USD 4\.10/);
  assert.match(contextoParaLaya(descripcion.lectura!), /Purchase date: 2026-10-01/);
  assert.match(contextoParaLaya(descripcion.lectura!), /Items: Pollo asado/);
});

test("02/10 que coincide con el pedido es el 2 de octubre y el gasto no queda como no razonable", () => {
  const texto = "Mini super\nFecha: 02/10/2026\nTeam meal\nTOTAL USD 8.00";
  const condicion = "Receipt dated 02/10/2026 for the team meal";
  const descripcion = estructurarTranscripcion(texto, { tipoTarea: "reembolso", condicion });
  assert.equal(descripcion.fecha, "2026-10-02");
  assert.notEqual(descripcion.fecha, "2026-02-10");
  const paraLaya = contextoParaLaya(descripcion.lectura!);
  assert.equal(fechaCoincideConPedido(paraLaya, condicion), true);
  assert.equal(montoEscrito(paraLaya), true);
  assert.equal(fechaEscrita(paraLaya), true);
  const corregida = corregirFactura(factura({ f2: false, f3: false, g2: false, g3: false }), paraLaya, condicion);
  assert.equal(corregida.f2, true);
  assert.equal(corregida.f3, true);
  assert.equal(corregida.g2, true);
  assert.equal(corregida.g3, true);
  const etiquetas = etiquetasDe({
    clase: "factura",
    trabajo: null,
    factura: corregida,
    descripcion: texto,
    cerca: ["f4", "g5"],
    monto: descripcion.monto,
    fecha: descripcion.fecha,
    tope: "15",
    tipo: "reembolso",
    lectura: descripcion.lectura,
  });
  assert.equal(etiquetas.some((etiqueta) => etiqueta.id === "amount_missing"), false);
  assert.equal(etiquetas.some((etiqueta) => etiqueta.id === "date_missing"), false);
  assert.equal(etiquetas.some((etiqueta) => etiqueta.id === "cap_no_razonable"), false);
  assert.equal(etiquetas.some((etiqueta) => etiqueta.id === "no_item"), false);
  assert.equal(etiquetas.some((etiqueta) => etiqueta.id === "low_detail"), false);
  assert.equal(etiquetas.some((etiqueta) => etiqueta.id === "matches"), true);
});

test("un texto sin total ni fecha no inventa campos", () => {
  const descripcion = estructurarTranscripcion("Team meal receipt", { tipoTarea: "reembolso" });
  assert.equal(descripcion.monto, null);
  assert.equal(descripcion.fecha, null);
  assert.equal(descripcion.lectura, undefined);
});

function factura(parcial: Partial<RespuestasFactura>): RespuestasFactura {
  return {
    f1: "coincide_con_lo_pedido",
    f2: true,
    f3: true,
    f4: 2,
    g1: "comida_o_bebida",
    g2: true,
    g3: true,
    g4: true,
    g5: 2,
    ...parcial,
  };
}
