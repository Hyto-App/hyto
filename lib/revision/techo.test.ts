import assert from "node:assert/strict";
import test from "node:test";
import { VARIABLES } from "@/lib/config/entorno";
import type { LecturaEvidencia } from "./lectura";
import { senalesDeFactura, senalesDeTrabajo, type RespuestasTrabajo } from "./laya";
import { escribirSnapshot } from "./snapshot-razones";
import { cerrar, type Descripcion, type Senales } from "./armar";
import { CASOS_TECHO, type CasoTecho } from "./techo-casos";
import { mileTecho80Activo } from "./techo-bandera";
import {
  UMBRAL_CUMPLIO,
  UMBRAL_PARCIAL,
  etiquetaDesdeNota,
  notaDeTrabajo,
  puntosTecho80,
} from "./pesos";

const APAGADO = { HYTO_MILE_TECHO_80: "off" };
const ENCENDIDO = { HYTO_MILE_TECHO_80: "on" };
const SIN_LUGAR = "Hacer un ensayo";
const CON_LUGAR = "Pintar el mural en la entrada";

/** The answers Laya gives on a photo Groq read completely. v2 and t10 stay on the middle step, and v4 says something is missing. */
const REALISTA: RespuestasTrabajo = {
  lugar: "espacio_abierto",
  v1: "es_lo_pedido",
  v2: 1,
  v3: true,
  v4: true,
  t5: "pintar",
  t6: "terminado",
  t7: false,
  t8: true,
  t9: false,
  t10: 1,
};

const MALA: RespuestasTrabajo = {
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

const LECTURA_COMPLETA = { tipo: "trabajo" as const, legible: true, faltantes: [] as const };
const LECTURA_PARCIAL = { tipo: "trabajo" as const, legible: true, faltantes: ["the rest of the wall"] };

test("HYTO_MILE_TECHO_80 solo se enciende con on", () => {
  assert.equal(mileTecho80Activo({}), false);
  assert.equal(mileTecho80Activo({ HYTO_MILE_TECHO_80: "" }), false);
  assert.equal(mileTecho80Activo({ HYTO_MILE_TECHO_80: "off" }), false);
  assert.equal(mileTecho80Activo({ HYTO_MILE_TECHO_80: "true" }), false);
  assert.equal(mileTecho80Activo({ HYTO_MILE_TECHO_80: "1" }), false);
  assert.equal(mileTecho80Activo({ HYTO_MILE_TECHO_80: "yes" }), false);
  assert.equal(mileTecho80Activo({ HYTO_MILE_TECHO_80: "on" }), true);
  assert.equal(mileTecho80Activo({ HYTO_MILE_TECHO_80: "ON" }), true);
  assert.equal(mileTecho80Activo({ HYTO_MILE_TECHO_80: " on " }), true);
  const definida = VARIABLES.find((variable) => variable.nombre === "HYTO_MILE_TECHO_80");
  assert.equal(definida?.silenciosa, true);
  assert.equal(definida?.requerida, false);
});

test("una lectura completa con las respuestas reales de Laya llega a cumplió solo con el interruptor", () => {
  assert.equal(UMBRAL_CUMPLIO, 80);
  assert.equal(notaDeTrabajo(REALISTA), 77);
  assert.equal(puntosTecho80(REALISTA, LECTURA_COMPLETA, APAGADO), 0);
  assert.equal(puntosTecho80(REALISTA, LECTURA_COMPLETA, ENCENDIDO), 12);
  const apagada = notaDeTrabajo(REALISTA) + puntosTecho80(REALISTA, LECTURA_COMPLETA, APAGADO);
  const encendida = notaDeTrabajo(REALISTA) + puntosTecho80(REALISTA, LECTURA_COMPLETA, ENCENDIDO);
  assert.equal(apagada, 77);
  assert.equal(etiquetaDesdeNota(apagada), "parcial");
  assert.equal(encendida, 89);
  assert.ok(encendida >= UMBRAL_CUMPLIO);
  assert.equal(etiquetaDesdeNota(encendida), "cumplió");
});

test("una foto a medias se queda entre 50 y 79, y una foto que no es lo pedido se queda bajo 50", () => {
  const aMedias: RespuestasTrabajo = { ...REALISTA, t6: "a_medias" };
  const notaParcial = notaDeTrabajo(aMedias) + puntosTecho80(aMedias, LECTURA_PARCIAL, ENCENDIDO);
  assert.equal(puntosTecho80(REALISTA, LECTURA_PARCIAL, ENCENDIDO), 0);
  assert.equal(notaDeTrabajo(REALISTA) + puntosTecho80(REALISTA, LECTURA_PARCIAL, ENCENDIDO), 77);
  assert.ok(notaParcial >= UMBRAL_PARCIAL && notaParcial < UMBRAL_CUMPLIO);
  assert.equal(etiquetaDesdeNota(notaParcial), "parcial");

  assert.equal(puntosTecho80(MALA, LECTURA_COMPLETA, ENCENDIDO), 0);
  assert.equal(puntosTecho80(MALA, LECTURA_COMPLETA, APAGADO), 0);
  const notaMala = notaDeTrabajo(MALA, CON_LUGAR);
  assert.ok(notaMala < UMBRAL_PARCIAL);
  assert.equal(notaMala, notaDeTrabajo(MALA, CON_LUGAR) + puntosTecho80(MALA, LECTURA_COMPLETA, ENCENDIDO));
  assert.equal(etiquetaDesdeNota(notaMala), "insuficiente");

  assert.equal(puntosTecho80({ ...REALISTA, v2: 0, t10: 0 }, LECTURA_COMPLETA, ENCENDIDO), 0);
  assert.equal(puntosTecho80(REALISTA, { ...LECTURA_COMPLETA, legible: false }, ENCENDIDO), 0);
  assert.equal(puntosTecho80(REALISTA, { ...LECTURA_COMPLETA, tipo: "otra" }, ENCENDIDO), 0);
});

const RESCATADA: RespuestasTrabajo = {
  ...REALISTA,
  v1: "es_otra_cosa",
  v4: false,
  t7: true,
};

test("coincide si levanta el techo aunque Laya haya dicho que es otra cosa", () => {
  assert.equal(notaDeTrabajo(RESCATADA), 68);
  const completa = { ...LECTURA_COMPLETA, coincide: "si" };
  assert.equal(puntosTecho80(RESCATADA, completa, ENCENDIDO), 12);
  assert.equal(puntosTecho80(RESCATADA, completa, APAGADO), 0);
  assert.equal(puntosTecho80(RESCATADA, { ...LECTURA_COMPLETA, coincide: "sí" }, ENCENDIDO), 12);
  assert.equal(puntosTecho80(RESCATADA, { ...LECTURA_COMPLETA, coincide: " SI " }, ENCENDIDO), 12);
  assert.equal(puntosTecho80(RESCATADA, LECTURA_COMPLETA, ENCENDIDO), 0);
  for (const coincide of [undefined, null, "", "parcial", "partial", "no", "yes", "1", 1, true] as const) {
    assert.equal(puntosTecho80(RESCATADA, { ...LECTURA_COMPLETA, coincide }, ENCENDIDO), 0, String(coincide));
  }
  assert.equal(puntosTecho80(RESCATADA, { ...completa, faltantes: ["the banner"] }, ENCENDIDO), 0);
  assert.equal(puntosTecho80(RESCATADA, { ...completa, legible: false }, ENCENDIDO), 0);
  assert.equal(puntosTecho80(RESCATADA, { ...completa, tipo: "otra" }, ENCENDIDO), 0);
  assert.equal(puntosTecho80(MALA, { ...LECTURA_COMPLETA, coincide: "si" }, ENCENDIDO), 0);

  const desc = descripcionConCoincide("si");
  const sinTope = sinMotivos(senalesTrabajo(RESCATADA));
  const encendida = cerrar("trabajo", null, desc, sinTope, "scout", ENCENDIDO);
  const apagada = cerrar("trabajo", null, desc, sinTope, "scout", APAGADO);
  assert.equal(apagada?.nota, 68);
  assert.equal(apagada?.veredicto, "parcial");
  assert.equal(encendida?.nota, 80);
  assert.ok((encendida?.nota ?? 0) >= UMBRAL_CUMPLIO);
  assert.equal(encendida?.veredicto, "cumplió");

  const conTope = senalesTrabajo(RESCATADA);
  assert.equal(cerrar("trabajo", null, desc, conTope, "scout", ENCENDIDO)?.nota, 49);
  assert.equal(cerrar("trabajo", null, desc, conTope, "scout", APAGADO)?.nota, 49);
  assert.equal(cerrar("trabajo", null, descripcionConCoincide("parcial"), sinTope, "scout", ENCENDIDO)?.nota, 68);
  assert.equal(cerrar("trabajo", null, descripcionConCoincide("no"), sinTope, "scout", ENCENDIDO)?.nota, 68);
  assert.equal(cerrar("trabajo", null, descripcion(LECTURA_COMPLETA), sinTope, "scout", ENCENDIDO)?.nota, 68);
});

test("cerrar aplica el techo y deja los topes donde estaban", () => {
  const completa = cerrar("trabajo", null, descripcion(LECTURA_COMPLETA), senalesTrabajo(REALISTA), "scout", ENCENDIDO);
  const apagada = cerrar("trabajo", null, descripcion(LECTURA_COMPLETA), senalesTrabajo(REALISTA), "scout", APAGADO);
  const parcial = cerrar("trabajo", null, descripcion(LECTURA_PARCIAL), senalesTrabajo(REALISTA), "scout", ENCENDIDO);
  const mala = cerrar("trabajo", null, descripcion(LECTURA_COMPLETA), senalesTrabajo(MALA, CON_LUGAR), "scout", ENCENDIDO);
  assert.equal(apagada?.nota, 77);
  assert.equal(apagada?.veredicto, "parcial");
  assert.equal(completa?.nota, 89);
  assert.equal(completa?.veredicto, "cumplió");
  assert.equal(parcial?.nota, 77);
  assert.equal(parcial?.veredicto, "parcial");
  assert.ok((mala?.nota ?? 100) < UMBRAL_PARCIAL);
  assert.equal(mala?.veredicto, "insuficiente");
  assert.equal(mala?.nota, cerrar("trabajo", null, descripcion(LECTURA_COMPLETA), senalesTrabajo(MALA, CON_LUGAR), "scout", APAGADO)?.nota);
});

test("los 40 casos del examen no cambian con el interruptor apagado, y lo parcial o insuficiente tampoco con él encendido", () => {
  assert.equal(CASOS_TECHO.length, 40);
  const despues = new Map<string, number>();
  for (const caso of CASOS_TECHO) {
    const condicion = condicionQueReproduce(caso);
    const apagada = notaDelCaso(caso, condicion, APAGADO);
    const encendida = notaDelCaso(caso, condicion, ENCENDIDO);
    assert.equal(apagada, caso.nota, caso.id);
    if (caso.esperado !== "Cumplió") assert.equal(encendida, caso.nota, caso.id);
    despues.set(caso.id, encendida);
  }
  assert.equal(despues.get("drive-01-banner-zeek-con-mesa"), 89);
  assert.equal(despues.get("drive-22-charla-con-publico"), 88);
  assert.equal(despues.get("drive-28-letrero-entrada-cerca"), 89);
  assert.equal(despues.get("drive-32-muro-fotos-lleno"), 80);
  assert.equal(despues.get("drive-05-actividad-stand"), 78);
  assert.equal(despues.get("drive-19-muro-fotos-a-medias"), 77);
  assert.equal(despues.get("drive-06-auditorio-medio-lleno"), 80);
  assert.equal(etiquetaDesdeNota(despues.get("drive-28-letrero-entrada-cerca") ?? 0), "cumplió");
  assert.equal(etiquetaDesdeNota(despues.get("drive-19-muro-fotos-a-medias") ?? 0), "parcial");
});

function condicionQueReproduce(caso: CasoTecho): string {
  for (const condicion of [SIN_LUGAR, CON_LUGAR]) {
    if (notaDelCaso(caso, condicion, APAGADO) === caso.nota) return condicion;
  }
  throw new Error(`${caso.id} no reproduce ${caso.nota}`);
}

function notaDelCaso(caso: CasoTecho, condicion: string, env: { HYTO_MILE_TECHO_80: string }): number {
  const cerrado = cerrar(caso.tipo, null, descripcionDe(caso), senalesDe(caso, condicion), "scout", env);
  if (!cerrado || cerrado.nota === null) throw new Error(caso.id);
  return cerrado.nota;
}

function descripcionDe(caso: CasoTecho): Descripcion {
  return {
    texto: "The photo shows the requested work.",
    monto: null,
    fecha: null,
    lectura: lecturaDe(caso),
  };
}

function lecturaDe(caso: Pick<CasoTecho, "tipoLectura" | "legible" | "faltantes">): LecturaEvidencia {
  return {
    tipo: caso.tipoLectura,
    pais: null,
    moneda: null,
    montoOriginal: null,
    montoUsd: null,
    tasa: null,
    fecha: null,
    fechaImpresa: null,
    comercio: null,
    articulos: [],
    textoCompleto: "The photo shows the requested work.",
    legible: caso.legible,
    faltantes: Array.from({ length: caso.faltantes }, (_, indice) => `missing ${indice + 1}`),
  };
}

function descripcionConCoincide(coincide: unknown): Descripcion {
  return {
    texto: "The photo shows the requested work.",
    monto: null,
    fecha: null,
    lectura: Object.assign(lecturaDe({ tipoLectura: "trabajo", legible: true, faltantes: 0 }), { coincide }),
  };
}

function sinMotivos(senales: Senales): Senales {
  const copia = { ...senales };
  delete copia.motivos;
  return copia;
}

function descripcion(lectura: { tipo: LecturaEvidencia["tipo"]; legible: boolean; faltantes: readonly string[] }): Descripcion {
  return {
    texto: "The photo shows the requested work.",
    monto: null,
    fecha: null,
    lectura: lecturaDe({ tipoLectura: lectura.tipo ?? "trabajo", legible: lectura.legible, faltantes: lectura.faltantes.length }),
  };
}

function senalesTrabajo(respuestas: RespuestasTrabajo, condicion = SIN_LUGAR): Senales {
  return {
    ...senalesDeTrabajo(respuestas, condicion),
    detalle: escribirSnapshot({ clase: "trabajo", trabajo: respuestas, factura: null, cerca: [] }),
  };
}

function senalesDe(caso: CasoTecho, condicion: string): Senales {
  if (caso.clase === "otra" && caso.trabajo?.v1 === "es_otra_cosa") {
    return {
      choice: "otra",
      noul: false,
      score: "0",
      motivos: ["otra"],
      detalle: escribirSnapshot({ clase: "otra", trabajo: null, factura: null, cerca: [] }),
    };
  }
  if (caso.factura) {
    return {
      ...senalesDeFactura(caso.factura),
      detalle: escribirSnapshot({ clase: "factura", trabajo: null, factura: caso.factura, cerca: [] }),
    };
  }
  if (!caso.trabajo) throw new Error(caso.id);
  return senalesTrabajo(caso.trabajo, condicion);
}
