import assert from "node:assert/strict";
import test from "node:test";
import { veredictosSemilla } from "@/lib/db/semilla";
import type { RespuestasFactura, RespuestasTrabajo } from "./laya";
import { etiquetasDesdeVeredicto } from "./mostrar-razones";
import { etiquetasEjemplo } from "./razones-ejemplo";
import { etiquetasDe, type EntradaRazones } from "./razones";
import { leerSnapshot, separarDescripcion, unirDescripcion, escribirSnapshot } from "./snapshot-razones";

test("cada etiqueta del ejemplo sale de respuestas que la sostienen", () => {
  const stand = ids(etiquetasEjemplo("stand"));
  assert.deepEqual(stand, ["matches", "finished"]);
  const registro = etiquetasEjemplo("registro");
  assert.deepEqual(ids(registro), ["unfinished", "matches"]);
  assert.equal(registro[0]?.severidad, "problem");
  assert.equal(registro.some((etiqueta) => etiqueta.id === "part_missing"), false);
  assert.equal(registro.find((etiqueta) => etiqueta.id === "photo_unclear"), undefined);
  const comida = ids(etiquetasEjemplo("comida"));
  assert.deepEqual(comida, ["matches", "amount_date"]);
  assert.equal(etiquetasEjemplo("bienvenida").length, 0);
});

test("la semilla guarda el snapshot sin meterlo en la frase", () => {
  for (const id of ["stand", "registro", "comida"]) {
    const fila = veredictosSemilla().find((veredicto) => veredicto.tareaId === id);
    assert.equal(fila?.frase.includes("@@hyto-razones@@"), false);
    assert.equal(fila?.textoScout.includes("@@hyto-razones@@"), true);
    assert.deepEqual(
      ids(etiquetasDesdeVeredicto({
        textoScout: fila?.textoScout ?? null,
        origen: fila?.origen ?? null,
        monto: id === "comida" ? "12.40" : null,
        fecha: id === "comida" ? "2026-09-27" : null,
        tope: id === "comida" ? "15" : null,
      })),
      ids(etiquetasEjemplo(id)),
    );
  }
});

test("una fila vieja o un error no inventan etiquetas", () => {
  assert.deepEqual(etiquetasDesdeVeredicto({
    textoScout: "Table set up.",
    origen: "scout",
    monto: null,
    fecha: null,
    tope: null,
  }), []);
  assert.deepEqual(etiquetasDesdeVeredicto({
    textoScout: `Blurry photo.${"\n@@hyto-razones@@\n"}c=otra`,
    origen: "error",
    monto: null,
    fecha: null,
    tope: null,
  }), []);
});

test("el snapshot de trabajo ida y vuelta conserva las respuestas", () => {
  const detalle = {
    clase: "trabajo" as const,
    trabajo: trabajo(),
    factura: null,
    cerca: ["v2", "t10"],
  };
  const texto = unirDescripcion("A clear photo.", escribirSnapshot(detalle));
  assert.equal(separarDescripcion(texto).texto, "A clear photo.");
  assert.deepEqual(leerSnapshot(texto.split("\n@@hyto-razones@@\n")[1] ?? ""), detalle);
  assert.equal(unirDescripcion(texto, escribirSnapshot(detalle)).split("@@hyto-razones@@").length, 2);
});

test("Serious issue: does not match the request", () => {
  const etiquetas = etiquetasDe(entrada({ trabajo: { ...trabajo(), v1: "es_otra_cosa" } }));
  const grave = etiquetas.find((etiqueta) => etiqueta.id === "cap_no_coincide");
  assert.equal(grave?.texto, "Serious issue: does not match the request");
  assert.equal(grave?.severidad, "problem");
  assert.deepEqual(grave?.preguntas, ["v1"]);
  assert.equal(etiquetas.some((etiqueta) => etiqueta.texto === "Not what was requested"), false);
  assert.equal(etiquetas.some((etiqueta) => etiqueta.id === "matches"), false);
});

test("Serious issue: the work has not started", () => {
  const etiquetas = etiquetasDe(entrada({ trabajo: { ...trabajo(), t6: "sin_empezar" } }));
  assert.equal(etiquetas[0]?.texto, "Serious issue: the work has not started");
  assert.deepEqual(etiquetas[0]?.preguntas, ["t6"]);
  assert.equal(etiquetas.some((etiqueta) => etiqueta.id === "unfinished"), false);
  assert.equal(etiquetas.some((etiqueta) => etiqueta.id === "finished"), false);
});

test("Serious issue: a different expense", () => {
  const etiquetas = etiquetasDe(factura({ f1: "otro_gasto" }));
  assert.equal(etiquetas.find((etiqueta) => etiqueta.id === "cap_otro_gasto")?.texto, "Serious issue: a different expense");
  assert.equal(etiquetas.some((etiqueta) => etiqueta.id === "matches"), false);
  assert.equal(etiquetas.some((etiqueta) => etiqueta.texto === "Not what was requested"), false);
});

test("otra y una foto borrosa muestran la falta grave, el selfie y el desenfoque", () => {
  const etiquetas = etiquetasDe({
    clase: "otra",
    trabajo: null,
    factura: null,
    descripcion: "A blurry selfie with no work and no receipt.",
    cerca: [],
    monto: null,
    fecha: null,
    tope: null,
  });
  assert.deepEqual(ids(etiquetas), ["cap_otra", "photo_unclear", "selfie_or_empty"]);
  assert.equal(etiquetas[0]?.texto, "Serious issue: no work or receipt shown");
  assert.deepEqual(etiquetas.find((etiqueta) => etiqueta.id === "photo_unclear")?.preguntas, ["c1"]);
});

test("el desenfoque sale de la descripción y no de out of frame", () => {
  const borrosa = etiquetasDe(entrada({ descripcion: "The banner is blurry and hard to read." }));
  assert.equal(borrosa[0]?.texto, "Photo unclear or blurry");
  assert.deepEqual(borrosa[0]?.preguntas, []);
  const fuera = etiquetasDe(entrada({
    descripcion: "The back of the room is out of frame.",
  }));
  assert.equal(fuera.some((etiqueta) => etiqueta.id === "photo_unclear"), false);
});

test("un trabajo no se marca como selfie aunque la palabra aparezca", () => {
  const etiquetas = etiquetasDe(entrada({ descripcion: "Not a selfie. The booth is finished." }));
  assert.equal(etiquetas.some((etiqueta) => etiqueta.id === "selfie_or_empty"), false);
});

test("Part of the request missing y Requested parts are missing", () => {
  const media = etiquetasDe(entrada({ trabajo: { ...trabajo(), v1: "no_se_puede_saber", v2: 1 } }));
  const parte = media.find((etiqueta) => etiqueta.id === "part_missing");
  assert.equal(parte?.texto, "Part of the request missing");
  assert.equal(parte?.severidad, "warning");
  assert.deepEqual(parte?.preguntas, ["v2"]);
  const ninguna = etiquetasDe(entrada({ trabajo: { ...trabajo(), v1: "no_se_puede_saber", v2: 0, v4: true } }));
  assert.equal(ninguna.find((etiqueta) => etiqueta.id === "none_shown")?.severidad, "problem");
  assert.equal(ninguna.find((etiqueta) => etiqueta.id === "part_missing")?.severidad, "problem");
  assert.deepEqual(ninguna.find((etiqueta) => etiqueta.id === "part_missing")?.preguntas, ["v4"]);
});

test("Work unfinished y Not done at the requested place", () => {
  const aMedias = etiquetasDe(entrada({ trabajo: { ...trabajo(), t6: "a_medias" } }));
  assert.equal(aMedias.find((etiqueta) => etiqueta.id === "unfinished")?.texto, "Work unfinished");
  assert.equal(aMedias.find((etiqueta) => etiqueta.id === "unfinished")?.severidad, "warning");
  const lugar = etiquetasDe(entrada({ trabajo: { ...trabajo(), t8: false } }));
  assert.equal(lugar.find((etiqueta) => etiqueta.id === "wrong_place")?.texto, "Not done at the requested place");
  assert.deepEqual(lugar.find((etiqueta) => etiqueta.id === "wrong_place")?.preguntas, ["t8"]);
});

test("Receipt amount missing, Receipt date missing, No item named y Amount over the cap", () => {
  const sinMonto = etiquetasDe(factura({ f2: false }, { monto: "12.40", fecha: "2026-09-27", tope: "15" }));
  assert.equal(sinMonto.find((etiqueta) => etiqueta.id === "amount_missing")?.texto, "Receipt amount missing");
  assert.deepEqual(sinMonto.find((etiqueta) => etiqueta.id === "amount_missing")?.preguntas, ["f2"]);
  assert.equal(sinMonto.some((etiqueta) => etiqueta.id === "amount_date"), false);
  const sinFecha = etiquetasDe(factura({ f3: false }, { monto: "12.40", fecha: "2026-09-27", tope: "15" }));
  assert.equal(sinFecha.find((etiqueta) => etiqueta.id === "date_missing")?.texto, "Receipt date missing");
  assert.deepEqual(sinFecha.find((etiqueta) => etiqueta.id === "date_missing")?.preguntas, ["f3"]);
  const guardado = etiquetasDe(factura({}, { monto: null, fecha: null, tope: "15" }));
  assert.deepEqual(guardado.find((etiqueta) => etiqueta.id === "amount_missing")?.preguntas, []);
  assert.equal(guardado.find((etiqueta) => etiqueta.id === "amount_missing")?.explicacion.includes("saved"), true);
  const item = etiquetasDe(factura({ g3: false }));
  assert.equal(item.find((etiqueta) => etiqueta.id === "no_item")?.texto, "No item named");
  const conItems = etiquetasDe({
    ...factura({ g3: false, f4: 1 }),
    lectura: {
      tipo: "recibo",
      pais: "CR",
      moneda: "CRC",
      montoOriginal: "₡1.000",
      montoUsd: null,
      tasa: null,
      fecha: null,
      fechaImpresa: null,
      comercio: "Super",
      articulos: ["Arroz", "Huevos"],
      textoCompleto: "A receipt listing Arroz and Huevos.",
      legible: true,
      faltantes: [],
    },
  });
  assert.equal(conItems.some((etiqueta) => etiqueta.id === "no_item"), false);
  assert.equal(conItems.some((etiqueta) => etiqueta.id === "matches"), true);
  assert.equal(conItems.some((etiqueta) => etiqueta.id === "part_missing"), false);
  const tope = etiquetasDe(factura({}, { monto: "20", fecha: "2026-09-27", tope: "15" }));
  assert.equal(tope.find((etiqueta) => etiqueta.id === "over_cap")?.texto, "Amount over the cap");
  assert.deepEqual(tope.find((etiqueta) => etiqueta.id === "over_cap")?.preguntas, ["tope"]);
  assert.equal(tope.some((etiqueta) => etiqueta.id === "amount_date"), false);
});

test("No puede ser Completado cuando el gasto no es razonable", () => {
  const etiquetas = etiquetasDe(factura({ g2: false }));
  const tope = etiquetas.find((etiqueta) => etiqueta.id === "cap_no_razonable");
  assert.equal(tope?.texto, "Cannot be Completed: the expense is not reasonable");
  assert.equal(tope?.severidad, "warning");
  assert.deepEqual(tope?.preguntas, ["g2"]);
  assert.equal(etiquetas.some((etiqueta) => etiqueta.texto === "Expense not reasonable for the task"), false);
});

test("Match is unclear no es una falta grave", () => {
  const trabajoDebil = etiquetasDe(entrada({ trabajo: { ...trabajo(), v1: "no_se_puede_saber" } }));
  assert.equal(trabajoDebil.some((etiqueta) => etiqueta.id.startsWith("cap_")), false);
  assert.equal(trabajoDebil.find((etiqueta) => etiqueta.id === "unclear_match")?.texto, "Match is unclear");
  const facturaDebil = etiquetasDe(factura({ f1: "no_se_ve" }));
  assert.equal(facturaDebil.some((etiqueta) => etiqueta.id === "cap_otro_gasto"), false);
  assert.deepEqual(facturaDebil.find((etiqueta) => etiqueta.id === "unclear_match")?.preguntas, ["f1"]);
});

test("Low detail pide dos respuestas débiles o dudosas", () => {
  const una = etiquetasDe(entrada({ trabajo: { ...trabajo(), lugar: "no_claro" } }));
  assert.equal(una.some((etiqueta) => etiqueta.id === "low_detail"), false);
  const dos = etiquetasDe(entrada({ trabajo: { ...trabajo(), lugar: "no_claro", t5: "otra_o_no_claro" } }));
  const baja = dos.find((etiqueta) => etiqueta.id === "low_detail");
  assert.equal(baja?.texto, "Low detail");
  assert.deepEqual(baja?.preguntas, ["lugar", "t5"]);
  const cerca = etiquetasDe(entrada({ cerca: ["v2", "t10"] }));
  assert.deepEqual(cerca.find((etiqueta) => etiqueta.id === "low_detail")?.preguntas, ["v2", "t10"]);
  const unaCerca = etiquetasDe(entrada({ cerca: ["v2"] }));
  assert.equal(unaCerca.some((etiqueta) => etiqueta.id === "low_detail"), false);
  const misma = etiquetasDe(entrada({ trabajo: { ...trabajo(), lugar: "no_claro" }, cerca: ["lugar"] }));
  assert.equal(misma.some((etiqueta) => etiqueta.id === "low_detail"), false);
  const larga = etiquetasDe(entrada({ descripcion: "word ".repeat(80) }));
  assert.equal(larga.some((etiqueta) => etiqueta.id === "low_detail"), false);
});

test("Matches the request, Finished y Amount and date found", () => {
  const hecho = etiquetasDe(entrada({}));
  assert.equal(hecho.find((etiqueta) => etiqueta.id === "matches")?.texto, "Matches the request");
  assert.equal(hecho.find((etiqueta) => etiqueta.id === "finished")?.texto, "Finished");
  const recibo = etiquetasDe(factura({}));
  assert.equal(recibo.find((etiqueta) => etiqueta.id === "amount_date")?.texto, "Amount and date found");
  assert.deepEqual(recibo.find((etiqueta) => etiqueta.id === "amount_date")?.preguntas, ["f2", "f3"]);
});

test("los problemas van antes que los avisos y los aciertos", () => {
  const etiquetas = etiquetasDe(entrada({
    trabajo: { ...trabajo(), v2: 1, t8: false, t6: "a_medias" },
    cerca: ["v3", "t7"],
  }));
  const orden = etiquetas.map((etiqueta) => etiqueta.severidad);
  const problemas = orden.lastIndexOf("problem");
  const avisos = orden.indexOf("warning");
  const buenos = orden.indexOf("good");
  assert.equal(problemas < avisos && avisos < buenos, true);
});

function ids(etiquetas: { id: string }[]): string[] {
  return etiquetas.map((etiqueta) => etiqueta.id);
}

function trabajo(): RespuestasTrabajo {
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

function facturaBase(): RespuestasFactura {
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

function entrada(parcial: Partial<EntradaRazones> & { trabajo?: RespuestasTrabajo }): EntradaRazones {
  return {
    clase: "trabajo",
    trabajo: parcial.trabajo ?? trabajo(),
    factura: null,
    descripcion: parcial.descripcion ?? "Table set up, banner visible.",
    cerca: parcial.cerca ?? [],
    monto: parcial.monto ?? null,
    fecha: parcial.fecha ?? null,
    tope: parcial.tope ?? null,
  };
}

function factura(
  respuestas: Partial<RespuestasFactura>,
  campos: { monto?: string | null; fecha?: string | null; tope?: string | null } = {},
): EntradaRazones {
  return {
    clase: "factura",
    trabajo: null,
    factura: { ...facturaBase(), ...respuestas },
    descripcion: "Team meal receipt, with the amount and date visible.",
    cerca: [],
    monto: campos.monto === undefined ? "12.40" : campos.monto,
    fecha: campos.fecha === undefined ? "2026-09-27" : campos.fecha,
    tope: campos.tope === undefined ? "15" : campos.tope,
  };
}
