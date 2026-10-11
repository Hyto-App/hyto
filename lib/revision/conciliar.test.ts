import assert from "node:assert/strict";
import test from "node:test";
import type { Senales } from "./armar";
import { conciliarConLectura, type EntradaConciliar } from "./conciliar";
import type { RespuestasFactura, RespuestasTrabajo } from "./laya";
import type { LecturaEvidencia } from "./lectura";
import { notaDeFactura, notaDeTrabajo } from "./pesos";
import { elementosPedidos } from "./razones";
import { escribirSnapshot, leerSnapshot } from "./snapshot-razones";

const ON = { HYTO_MILE_FALTANTES_GROQ: "on" };
const OFF = { HYTO_MILE_FALTANTES_GROQ: "off" };
const CONDICION = "Mesa armada en la entrada con mantel, cartel de bienvenida y hoja de registro";

const DUDOSA: RespuestasTrabajo = {
  lugar: "stand_o_mesa",
  v1: "es_otra_cosa",
  v2: 1,
  v3: true,
  v4: false,
  t5: "documentar_evento",
  t6: "no_aplica",
  t7: false,
  t8: true,
  t9: true,
  t10: 1,
};

function lectura(extra: Partial<LecturaEvidencia> = {}): LecturaEvidencia {
  return {
    tipo: "trabajo",
    pais: null,
    moneda: null,
    montoOriginal: null,
    montoUsd: null,
    tasa: null,
    fecha: null,
    fechaImpresa: null,
    comercio: null,
    articulos: [],
    textoCompleto: "Mesa con mantel, cartel y hoja de registro.",
    legible: true,
    faltantes: [],
    coincide: "si",
    ...extra,
  };
}

function trabajo(respuestas: RespuestasTrabajo): Senales {
  const nota = notaDeTrabajo(respuestas, CONDICION);
  return { choice: "trabajo", noul: false, score: String(nota), detalle: escribirSnapshot({ clase: "trabajo", trabajo: respuestas, factura: null, cerca: [] }) };
}

function factura(respuestas: RespuestasFactura): Senales {
  return { choice: "factura", noul: false, score: String(notaDeFactura(respuestas)), detalle: escribirSnapshot({ clase: "factura", trabajo: null, factura: respuestas, cerca: [] }) };
}

const VISION: EntradaConciliar = { tipoTarea: "trabajo", condicion: CONDICION, textual: false, tope: null, monto: null, fecha: null };

test("visión completa y coincide «si»: las dudas de Laya (otra cosa, sin terminar, a medias) no bajan la nota", () => {
  const antes = trabajo(DUDOSA);
  assert.equal(antes.score, "57");
  const despues = conciliarConLectura(antes, lectura(), VISION, ON);
  assert.ok(Number(despues.score) >= 80, despues.score);
  const guardado = leerSnapshot(despues.detalle ?? "")?.trabajo;
  assert.equal(guardado?.t9, false);
  assert.equal(guardado?.v1, "es_lo_pedido");
});

test("sin el switch, o con coincide parcial, faltantes, ilegible o «sin empezar», no se toca nada", () => {
  const antes = trabajo(DUDOSA);
  assert.deepEqual(conciliarConLectura(antes, lectura(), VISION, OFF), antes);
  assert.deepEqual(conciliarConLectura(antes, lectura({ coincide: "parcial" }), VISION, ON), antes);
  assert.deepEqual(conciliarConLectura(antes, lectura({ coincide: null }), VISION, ON), antes);
  assert.deepEqual(conciliarConLectura(antes, lectura({ faltantes: ["hoja de registro"] }), VISION, ON), antes);
  assert.deepEqual(conciliarConLectura(antes, lectura({ legible: false }), VISION, ON), antes);
  const sinEmpezar = trabajo({ ...DUDOSA, t6: "sin_empezar" });
  assert.deepEqual(conciliarConLectura(sinEmpezar, lectura(), VISION, ON), sinEmpezar);
});

test("documento de trabajo (lista): cuenta completo si Laya dice que es lo pedido y está terminado; no si quedó a medias", () => {
  const documento = { ...VISION, textual: true, condicion: "Lista con los nombres y hora de llegada" };
  const lista: RespuestasTrabajo = { ...DUDOSA, lugar: "no_claro", v1: "es_lo_pedido", v4: true, t5: "otra_o_no_claro", t6: "terminado", t8: false, t9: false };
  const antes = { ...trabajo(lista), score: String(notaDeTrabajo(lista, documento.condicion)) };
  assert.equal(antes.score, "74");
  assert.ok(Number(conciliarConLectura(antes, null, documento, ON).score) >= 80);
  const aMedias = { ...lista, t6: "a_medias" as const };
  const sinTerminar = trabajo(aMedias);
  assert.deepEqual(conciliarConLectura(sinTerminar, null, documento, ON), sinTerminar);
  const otraCosa = trabajo({ ...lista, v1: "es_otra_cosa" });
  assert.deepEqual(conciliarConLectura(otraCosa, null, documento, ON), otraCosa);
});

const SIN_FECHA: RespuestasFactura = {
  f1: "coincide_con_lo_pedido",
  f2: true,
  f3: true,
  f4: 1,
  g1: "impresion_o_papeleria",
  g2: false,
  g3: true,
  g4: true,
  g5: 2,
};

test("factura sin fecha: f3 sigue a la lectura y el «no razonable» se va; dentro del tope queda en 79 por la fecha", () => {
  const entrada: EntradaConciliar = { tipoTarea: "reembolso", condicion: "", textual: false, tope: "4", monto: "2.80", fecha: null };
  const despues = conciliarConLectura(factura(SIN_FECHA), lectura({ tipo: "recibo", montoUsd: "2.80" }), entrada, ON);
  const guardada = leerSnapshot(despues.detalle ?? "")?.factura;
  assert.equal(guardada?.f3, false);
  assert.equal(guardada?.g2, true);
  assert.equal((despues.motivos ?? []).includes("gasto_no_razonable"), false);
});

test("factura sobre el tope o que no coincide: el «no razonable» se queda", () => {
  const sobre: EntradaConciliar = { tipoTarea: "reembolso", condicion: "", textual: false, tope: "4", monto: "9.00", fecha: null };
  const despues = conciliarConLectura(factura(SIN_FECHA), lectura({ tipo: "recibo", montoUsd: "9.00" }), sobre, ON);
  assert.equal(leerSnapshot(despues.detalle ?? "")?.factura?.g2, false);
  const dentro: EntradaConciliar = { ...sobre, monto: "2.80" };
  const noCoincide = conciliarConLectura(factura(SIN_FECHA), lectura({ tipo: "recibo", montoUsd: "2.80", coincide: "no" }), dentro, ON);
  assert.equal(leerSnapshot(noCoincide.detalle ?? "")?.factura?.g2, false);
});

test("elementosPedidos separa lo que pide la tarea", () => {
  assert.deepEqual(elementosPedidos(CONDICION), ["mantel", "cartel de bienvenida", "hoja de registro"]);
  assert.deepEqual(elementosPedidos("Foto del grupo"), ["Foto del grupo"]);
  assert.deepEqual(elementosPedidos("- Mantel\n- Cartel"), ["Mantel", "Cartel"]);
  assert.deepEqual(elementosPedidos(""), []);
});
