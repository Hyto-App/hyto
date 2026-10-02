import assert from "node:assert/strict";
import test from "node:test";
import type { RespuestasFactura, RespuestasTrabajo } from "./laya";
import { preguntasFactura, preguntasTrabajo } from "./laya-preguntas";
import {
  PESOS_PREGUNTAS,
  TOPE_NOTA_REEMBOLSO,
  UMBRAL_CUMPLIO,
  UMBRAL_PARCIAL,
  etiquetaDesdeNota,
  notaDeFactura,
  notaDeTexto,
  notaDeTrabajo,
  notaEntera,
} from "./pesos";

test("los pesos publicados son estos números", () => {
  assert.deepEqual(PESOS_PREGUNTAS.trabajo, {
    lugar: 1,
    v1: 20,
    v2: 16,
    v3: 4,
    v4: 10,
    t5: 2,
    t6: 16,
    t7: 1,
    t8: 12,
    t9: 10,
    t10: 8,
  });
  assert.deepEqual(PESOS_PREGUNTAS.factura, {
    f1: 18,
    f2: 10,
    f3: 10,
    f4: 14,
    g1: 6,
    g2: 20,
    g3: 10,
    g4: 2,
    g5: 10,
  });
});

test("los pesos de cada camino suman 100 y cubren las preguntas reales", () => {
  assert.equal(sumar(PESOS_PREGUNTAS.trabajo), 100);
  assert.equal(sumar(PESOS_PREGUNTAS.factura), 100);
  assert.deepEqual(Object.keys(PESOS_PREGUNTAS.trabajo), Object.keys(preguntasTrabajo("pedido")));
  assert.deepEqual(Object.keys(PESOS_PREGUNTAS.factura), Object.keys(preguntasFactura("pedido")));
  assert.equal(Object.keys(PESOS_PREGUNTAS.factura).length, 9);
  assert.equal(Object.keys(PESOS_PREGUNTAS.trabajo).length, 11);
});

test("las respuestas a medias caen en pesos pares", () => {
  for (const id of ["v1", "v2", "t6", "t10"] as const) assert.equal(PESOS_PREGUNTAS.trabajo[id] % 2, 0);
  for (const id of ["f1", "f4", "g5"] as const) assert.equal(PESOS_PREGUNTAS.factura[id] % 2, 0);
});

test("un trabajo correcto suma 100 y el crédito parcial resta la mitad del peso", () => {
  assert.equal(notaDeTrabajo(trabajoPerfecto()), 100);
  assert.equal(notaDeTrabajo({ ...trabajoPerfecto(), v2: 1 }), 100 - PESOS_PREGUNTAS.trabajo.v2 / 2);
  assert.equal(notaDeTrabajo({ ...trabajoPerfecto(), v2: 0 }), 100 - PESOS_PREGUNTAS.trabajo.v2);
  assert.equal(notaDeTrabajo({ ...trabajoPerfecto(), t6: "a_medias" }), 100 - PESOS_PREGUNTAS.trabajo.t6 / 2);
  assert.equal(notaDeTrabajo({ ...trabajoPerfecto(), t6: "sin_empezar" }), 100 - PESOS_PREGUNTAS.trabajo.t6);
  assert.equal(notaDeTrabajo({ ...trabajoPerfecto(), t6: "no_claro" }), 100 - PESOS_PREGUNTAS.trabajo.t6);
  assert.equal(notaDeTrabajo({ ...trabajoPerfecto(), v1: "no_se_puede_saber" }), 100 - PESOS_PREGUNTAS.trabajo.v1 / 2);
  assert.equal(notaDeTrabajo({ ...trabajoPerfecto(), v1: "es_otra_cosa" }), 100 - PESOS_PREGUNTAS.trabajo.v1);
  assert.equal(notaDeTrabajo({ ...trabajoPerfecto(), t10: 1 }), 100 - PESOS_PREGUNTAS.trabajo.t10 / 2);
  assert.equal(notaDeTrabajo({ ...trabajoPerfecto(), v4: true }), 100 - PESOS_PREGUNTAS.trabajo.v4);
  assert.equal(notaDeTrabajo({ ...trabajoPerfecto(), t9: true }), 100 - PESOS_PREGUNTAS.trabajo.t9);
  assert.equal(notaDeTrabajo({ ...trabajoPerfecto(), t8: false }), 100 - PESOS_PREGUNTAS.trabajo.t8);
  assert.equal(notaDeTrabajo({ ...trabajoPerfecto(), v3: false }), 100 - PESOS_PREGUNTAS.trabajo.v3);
  assert.equal(notaDeTrabajo({ ...trabajoPerfecto(), t7: false }), 100 - PESOS_PREGUNTAS.trabajo.t7);
  assert.equal(notaDeTrabajo({ ...trabajoPerfecto(), lugar: "no_claro" }), 100 - PESOS_PREGUNTAS.trabajo.lugar);
  assert.equal(notaDeTrabajo({ ...trabajoPerfecto(), t5: "otra_o_no_claro" }), 100 - PESOS_PREGUNTAS.trabajo.t5);
  assert.equal(notaDeTrabajo(trabajoVacio()), 0);
});

test("una factura correcta suma 100 y el crédito parcial resta la mitad del peso", () => {
  assert.equal(notaDeFactura(facturaPerfecta()), 100);
  assert.equal(notaDeFactura({ ...facturaPerfecta(), f4: 1 }), 100 - PESOS_PREGUNTAS.factura.f4 / 2);
  assert.equal(notaDeFactura({ ...facturaPerfecta(), f4: 0 }), 100 - PESOS_PREGUNTAS.factura.f4);
  assert.equal(notaDeFactura({ ...facturaPerfecta(), g5: 1 }), 100 - PESOS_PREGUNTAS.factura.g5 / 2);
  assert.equal(notaDeFactura({ ...facturaPerfecta(), f1: "no_se_ve" }), 100 - PESOS_PREGUNTAS.factura.f1 / 2);
  assert.equal(notaDeFactura({ ...facturaPerfecta(), f1: "otro_gasto" }), 100 - PESOS_PREGUNTAS.factura.f1);
  assert.equal(notaDeFactura({ ...facturaPerfecta(), g2: false }), 100 - PESOS_PREGUNTAS.factura.g2);
  assert.equal(notaDeFactura({ ...facturaPerfecta(), f2: false }), 100 - PESOS_PREGUNTAS.factura.f2);
  assert.equal(notaDeFactura({ ...facturaPerfecta(), f3: false }), 100 - PESOS_PREGUNTAS.factura.f3);
  assert.equal(notaDeFactura({ ...facturaPerfecta(), g3: false }), 100 - PESOS_PREGUNTAS.factura.g3);
  assert.equal(notaDeFactura({ ...facturaPerfecta(), g4: false }), 100 - PESOS_PREGUNTAS.factura.g4);
  assert.equal(notaDeFactura({ ...facturaPerfecta(), g1: "otro_o_no_claro" }), 100 - PESOS_PREGUNTAS.factura.g1);
  assert.equal(notaDeFactura(facturaVacia()), 0);
});

test("una sola respuesta mala sigue en la banda cumplió", () => {
  assert.equal(notaDeTrabajo({ ...trabajoPerfecto(), t6: "sin_empezar" }), 84);
  assert.equal(notaDeTrabajo({ ...trabajoPerfecto(), v2: 0 }), 84);
  assert.equal(notaDeTrabajo({ ...trabajoPerfecto(), v1: "es_otra_cosa" }), 80);
  assert.equal(notaDeFactura({ ...facturaPerfecta(), f1: "otro_gasto" }), 82);
  assert.equal(etiquetaDesdeNota(84), "cumplió");
  assert.equal(etiquetaDesdeNota(80), "cumplió");
});

test("notaDeTexto solo acepta un entero de 0 a 100", () => {
  assert.equal(notaDeTexto("abc"), null);
  assert.equal(notaDeTexto("101"), null);
  assert.equal(notaDeTexto("-1"), null);
  assert.equal(notaDeTexto("50.5"), null);
  assert.equal(notaDeTexto(" 50 "), 50);
  assert.equal(notaDeTexto("cumplió"), null);
});

test("notaEntera recorta el rango y rechaza lo que no es finito", () => {
  assert.equal(notaEntera(NaN), 0);
  assert.equal(notaEntera(Infinity), 0);
  assert.equal(notaEntera(-Infinity), 0);
  assert.equal(notaEntera(-1), 0);
  assert.equal(notaEntera(150), 100);
  assert.equal(notaEntera(50.4), 50);
  assert.equal(notaEntera(50.6), 51);
});

test("la banda sale del porcentaje y no aprueba un pago por sí sola", () => {
  assert.equal(etiquetaDesdeNota(0), "insuficiente");
  assert.equal(etiquetaDesdeNota(UMBRAL_PARCIAL - 1), "insuficiente");
  assert.equal(etiquetaDesdeNota(TOPE_NOTA_REEMBOLSO), "insuficiente");
  assert.equal(etiquetaDesdeNota(UMBRAL_PARCIAL), "parcial");
  assert.equal(etiquetaDesdeNota(UMBRAL_CUMPLIO - 1), "parcial");
  assert.equal(etiquetaDesdeNota(UMBRAL_CUMPLIO), "cumplió");
  assert.equal(etiquetaDesdeNota(100), "cumplió");
});

function sumar(pesos: Record<string, number>): number {
  return Object.values(pesos).reduce((total, peso) => total + peso, 0);
}

function trabajoPerfecto(): RespuestasTrabajo {
  return {
    lugar: "stand_o_mesa",
    v1: "es_lo_pedido",
    v2: 2,
    v3: true,
    v4: false,
    t5: "armar_o_montar",
    t6: "terminado",
    t7: true,
    t8: true,
    t9: false,
    t10: 2,
  };
}

function trabajoVacio(): RespuestasTrabajo {
  return {
    lugar: "no_claro",
    v1: "es_otra_cosa",
    v2: 0,
    v3: false,
    v4: true,
    t5: "otra_o_no_claro",
    t6: "sin_empezar",
    t7: false,
    t8: false,
    t9: true,
    t10: 0,
  };
}

function facturaPerfecta(): RespuestasFactura {
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
  };
}

function facturaVacia(): RespuestasFactura {
  return {
    f1: "otro_gasto",
    f2: false,
    f3: false,
    f4: 0,
    g1: "otro_o_no_claro",
    g2: false,
    g3: false,
    g4: false,
    g5: 0,
  };
}
