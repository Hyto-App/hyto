import assert from "node:assert/strict";
import test from "node:test";
import { cerrar, type Descripcion, type Senales } from "./armar";
import { aplicarV4DeFaltantes } from "./faltantes-groq";
import { senalesDeTrabajo, type RespuestasTrabajo } from "./laya";
import type { LecturaEvidencia } from "./lectura";
import { lecturaCompleta, nivelesConLectura, puntosLecturaCompleta } from "./lectura-completa";
import { presentarEtiqueta } from "./notas-idioma";
import { notaDeTrabajo } from "./pesos";
import { etiquetasDe } from "./razones";
import { decidirRequisitos } from "./requisitos";
import { escribirSnapshot } from "./snapshot-razones";

const ENCENDIDO = { HYTO_MILE_FALTANTES_GROQ: "on" };
const APAGADO = { HYTO_MILE_FALTANTES_GROQ: "off" };
const CONDICION = "Foto del mural terminado";

/**
 * QA (Aang): a complete, good photo of the work stayed at 67% «Falta parte de lo pedido».
 * Laya only reads the written description, so it hedged: v1 "can't tell", v2 and t10 on the middle
 * step, lugar "no_claro", and v4 "something is missing" even though Groq listed nothing missing.
 */
const LAYA_DUDOSA: RespuestasTrabajo = {
  lugar: "no_claro",
  v1: "no_se_puede_saber",
  v2: 1,
  v3: true,
  v4: true,
  t5: "pintar",
  t6: "terminado",
  t7: true,
  t8: true,
  t9: false,
  t10: 1,
};

function lectura(extra: Partial<LecturaEvidencia> = {}): LecturaEvidencia {
  return {
    tipo: "trabajo",
    pais: "CR",
    moneda: null,
    montoOriginal: null,
    montoUsd: null,
    tasa: null,
    fecha: null,
    fechaImpresa: null,
    comercio: null,
    articulos: ["mural", "pintura"],
    textoCompleto: "Se ve el mural terminado en la pared de la escuela, con colores completos.",
    legible: true,
    faltantes: [],
    ...extra,
  };
}

function senales(respuestas: RespuestasTrabajo): Senales {
  return {
    ...senalesDeTrabajo(respuestas, CONDICION),
    detalle: escribirSnapshot({ clase: "trabajo", trabajo: respuestas, factura: null, cerca: [] }),
  };
}

function descripcion(leida: LecturaEvidencia): Descripcion {
  return { texto: leida.textoCompleto, monto: null, fecha: null, lectura: leida };
}

test("la foto buena y completa que quedaba en 67% llega a «Cumplió» con HYTO_MILE_FALTANTES_GROQ", () => {
  assert.equal(notaDeTrabajo(LAYA_DUDOSA, CONDICION), 67);
  const leida = lectura();
  const antes = cerrar("trabajo", null, descripcion(leida), senales(LAYA_DUDOSA), "scout", APAGADO);
  assert.equal(antes?.nota, 67);
  assert.equal(antes?.veredicto, "parcial");

  const conFaltantes = aplicarV4DeFaltantes(senales(LAYA_DUDOSA), leida, CONDICION, ENCENDIDO);
  const despues = cerrar("trabajo", null, descripcion(leida), conFaltantes, "scout", ENCENDIDO);
  assert.equal(despues?.veredicto, "cumplió");
  assert.ok((despues?.nota ?? 0) >= 80);
});

test("sin «Falta parte de lo pedido» cuando la lectura dice que no falta nada", () => {
  const etiquetas = etiquetasDe({
    clase: "trabajo",
    trabajo: { ...LAYA_DUDOSA, v4: false },
    factura: null,
    descripcion: lectura().textoCompleto,
    cerca: [],
    monto: null,
    fecha: null,
    tope: null,
    lectura: lectura(),
    condicion: CONDICION,
  });
  assert.equal(etiquetas.some((etiqueta) => etiqueta.id === "part_missing"), false);
});

test("cuando sí falta algo, Mile dice qué falta, en español, y la nota no sube", () => {
  const leida = lectura({ faltantes: ["el rótulo con el nombre del evento", "la firma del grupo"] });
  const ajustadas = aplicarV4DeFaltantes(senales({ ...LAYA_DUDOSA, v4: false }), leida, CONDICION, ENCENDIDO);
  const cerrado = cerrar("trabajo", null, descripcion(leida), ajustadas, "scout", ENCENDIDO);
  assert.notEqual(cerrado?.veredicto, "cumplió");
  assert.equal(puntosLecturaCompleta(LAYA_DUDOSA, leida, ENCENDIDO), 0);

  const etiquetas = etiquetasDe({
    clase: "trabajo",
    trabajo: { ...LAYA_DUDOSA, v4: true },
    factura: null,
    descripcion: leida.textoCompleto,
    cerca: [],
    monto: null,
    fecha: null,
    tope: null,
    lectura: leida,
    condicion: CONDICION,
  });
  const parte = etiquetas.find((etiqueta) => etiqueta.id === "part_missing");
  assert.ok(parte);
  assert.equal(parte.severidad, "problem");
  const es = presentarEtiqueta(parte, "es");
  assert.equal(es.texto, "Falta parte de lo pedido");
  assert.equal(es.explicacion, "Falta: el rótulo con el nombre del evento; la firma del grupo.");
});

test("los fallos reales no se suben: otra cosa, coincide no o parcial, borrosa, sin el interruptor", () => {
  assert.equal(puntosLecturaCompleta(LAYA_DUDOSA, lectura(), APAGADO), 0);
  assert.equal(puntosLecturaCompleta({ ...LAYA_DUDOSA, v4: false, v1: "es_otra_cosa" }, lectura(), ENCENDIDO), 0);
  assert.equal(puntosLecturaCompleta({ ...LAYA_DUDOSA, v4: false }, lectura({ coincide: "no" }), ENCENDIDO), 0);
  assert.equal(puntosLecturaCompleta({ ...LAYA_DUDOSA, v4: false }, lectura({ coincide: "parcial" }), ENCENDIDO), 0);
  assert.equal(puntosLecturaCompleta({ ...LAYA_DUDOSA, v4: false }, lectura({ legible: false }), ENCENDIDO), 0);
  assert.equal(puntosLecturaCompleta({ ...LAYA_DUDOSA, v4: false }, lectura({ tipo: "otra" }), ENCENDIDO), 0);
  // a_medias and t9 are not hedges: they still cost points.
  const aMedias = { ...LAYA_DUDOSA, v4: false, t6: "a_medias" as const, t9: true };
  const nota = notaDeTrabajo(aMedias, CONDICION) + puntosLecturaCompleta(aMedias, lectura(), ENCENDIDO);
  assert.ok(nota < 80);
  assert.equal(lecturaCompleta(lectura()), true);
});

test("requisitos: «solo en parte» por el texto no deja una foto completa en 67%", () => {
  const requisitos = [
    { id: "a", texto: "El mural terminado" },
    { id: "b", texto: "El rótulo del evento" },
    { id: "c", texto: "Las personas voluntarias" },
  ];
  const sinLectura = decidirRequisitos({ requisitos, niveles: [2, 1, 1], idioma: "es", intento: 1 });
  assert.equal(sinLectura?.puntaje, 67);
  assert.match(sinLectura?.notaMile ?? "", /«El rótulo del evento»/);
  assert.match(sinLectura?.notaMile ?? "", /«Las personas voluntarias»/);

  const completa = decidirRequisitos({ requisitos, niveles: nivelesConLectura([2, 1, 1], lectura()), idioma: "es", intento: 1 });
  assert.equal(completa?.puntaje, 100);
  assert.equal(completa?.accion, "seguir");

  // Groq says nothing is missing: a "missing" from the text is not a send-back, the organizer decides.
  const dudosa = decidirRequisitos({ requisitos, niveles: nivelesConLectura([2, 2, 0], lectura()), idioma: "es", intento: 1 });
  assert.equal(dudosa?.accion, "seguir");

  // Groq names what is missing: the levels stay, and the note says which point.
  const falta = lectura({ faltantes: ["el rótulo del evento"] });
  const conFalta = decidirRequisitos({ requisitos, niveles: nivelesConLectura([2, 0, 2], falta), idioma: "es", intento: 1 });
  assert.equal(conFalta?.accion, "rechazar");
  assert.match(conFalta?.notaMile ?? "", /«El rótulo del evento»/);
});
