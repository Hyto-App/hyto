import assert from "node:assert/strict";
import test from "node:test";
import { crearMemoria } from "../db/memoria";
import { asegurarSemilla, tareasSemilla } from "../db/semilla";
import { guardarRevision } from "../api/evidencias";
import { mileRequisitosActivo, maxIntentosMile } from "./requisitos-bandera";
import { nivelesDeRequisitos, preguntasDeRequisitos } from "./requisitos-laya";
import {
  decidirRequisitos,
  entradaRequisitos,
  leerRechazo,
  leerRequisitos,
  leerRevisionMile,
  serializarRechazo,
  serializarRevisionMile,
} from "./requisitos";
import { leerSugerencias, sugerirRequisitos } from "./sugerir";
import { revisar } from "./revisar";

const FOTO = { tipo: "image/jpeg", bytes: new Uint8Array([1, 2, 3]) };

function groq(texto: string): Response {
  return Response.json({ choices: [{ message: { content: JSON.stringify({ texto, monto: null, fecha: null }) } }] });
}

test("la bandera y el tope salen apagados salvo un on explícito", () => {
  assert.equal(mileRequisitosActivo({}), false);
  assert.equal(mileRequisitosActivo({ HYTO_MILE_REQUISITOS: "off" }), false);
  assert.equal(mileRequisitosActivo({ HYTO_MILE_REQUISITOS: "on" }), true);
  assert.equal(maxIntentosMile({}), 3);
  assert.equal(maxIntentosMile({ HYTO_MILE_INTENTOS: "2" }), 2);
  assert.equal(maxIntentosMile({ HYTO_MILE_INTENTOS: "0" }), 3);
  assert.equal(maxIntentosMile({ HYTO_MILE_INTENTOS: "diez" }), 3);
});

test("un requisito vacío se descarta y no se guardan más de tres", () => {
  assert.deepEqual(leerRequisitos(null), []);
  assert.deepEqual(leerRequisitos("no-json"), []);
  assert.deepEqual(leerRequisitos([{ texto: "  " }, { id: "banner", texto: "<b>Banner</b> de frente" }]), [
    { id: "banner", texto: "Banner de frente" },
  ]);
  const muchos = leerRequisitos(["uno", "dos", "tres", "cuatro"]);
  assert.deepEqual(muchos.map((item) => item.id), ["r1", "r2", "r3"]);
  assert.equal(entradaRequisitos("no").ok, false);
  assert.equal(entradaRequisitos(["a", "b", "c", "d"]).ok, false);
  const bien = entradaRequisitos([{ id: "mesa", texto: "La mesa" }, "Cajas"]);
  assert.equal(bien.ok, true);
  if (bien.ok) assert.deepEqual(bien.requisitos, [
    { id: "mesa", texto: "La mesa" },
    { id: "r2", texto: "Cajas" },
  ]);
});

test("solo no_cumple rechaza, parcial sigue, y el tope deja la foto al organizador", () => {
  const requisitos = [
    { id: "banner", texto: "Banner" },
    { id: "mesa", texto: "Mesa" },
  ];
  const sigue = decidirRequisitos({ requisitos, niveles: [2, 2], idioma: "en", intento: 1, maxIntentos: 3 });
  assert.ok(sigue);
  assert.equal(sigue.accion, "seguir");
  assert.equal(sigue.puntaje, 100);
  assert.deepEqual(sigue.fallidos, []);
  assert.equal(sigue.notaMile, "Your photo meets every point. The organizer reviews it next.");
  assert.equal(sigue.resultados[0]?.observacion, "This is in your photo.");

  const parcial = decidirRequisitos({ requisitos, niveles: [2, 1], idioma: "es", intento: 1, maxIntentos: 3 });
  assert.equal(parcial?.accion, "seguir");
  assert.equal(parcial?.puntaje, 75);
  assert.equal(parcial?.resultados[1]?.estado, "parcial");
  assert.equal(parcial?.resultados[1]?.observacion, "Esto está solo en parte en tu foto.");
  assert.match(parcial?.notaMile ?? "", /organizador decide/);

  const rechazo = decidirRequisitos({ requisitos, niveles: [2, 0], idioma: "es", intento: 1, maxIntentos: 3 });
  assert.equal(rechazo?.accion, "rechazar");
  assert.deepEqual(rechazo?.fallidos, ["mesa"]);
  assert.equal(rechazo?.puntaje, 50);
  assert.equal(rechazo?.resultados[1]?.estado, "no_cumple");
  assert.equal(rechazo?.resultados[1]?.observacion, "Esto no aparece en tu foto.");
  assert.match(rechazo?.notaMile ?? "", /Toma otra foto/);

  const tope = decidirRequisitos({ requisitos, niveles: [0, 0], idioma: "en", intento: 3, maxIntentos: 3 });
  assert.equal(tope?.accion, "seguir");
  assert.equal(tope?.puntaje, 0);
  assert.match(tope?.notaMile ?? "", /maximum number of attempts/);
  assert.equal(decidirRequisitos({ requisitos, niveles: [0], idioma: "en", intento: 1 }) , null);
});

test("Laya pide un nivel por requisito y 0 es no_cumple", () => {
  const preguntas = preguntasDeRequisitos([{ id: "banner", texto: "Banner de frente" }]);
  assert.deepEqual(Object.keys(preguntas), ["r0"]);
  assert.equal(preguntas.r0?.type, "score");
  assert.equal(preguntas.r0?.criteria[0], "It is missing. The description does not show this requirement.");
  assert.equal(preguntas.r0?.criteria[2], "It is there. The description shows this requirement.");
  assert.deepEqual(
    nivelesDeRequisitos({ answers: { r0: { score: 0 }, r1: { probabilities: { "0": 0.1, "1": 0.2, "2": 0.7 } } } }, 2),
    [0, 2],
  );
  assert.equal(nivelesDeRequisitos({ answers: { r0: { score: 1 } } }, 2), null);
});

test("el rechazo guarda los ids y la nota de Mile", () => {
  const decision = decidirRequisitos({
    requisitos: [{ id: "mesa", texto: "Mesa" }],
    niveles: [0],
    idioma: "es",
    intento: 2,
    maxIntentos: 3,
  });
  assert.ok(decision);
  const json = serializarRechazo({
    nota: decision.notaMile,
    fallidos: decision.fallidos,
    en: "2026-10-05T12:00:00.000Z",
    origen: "mile",
    intento: 2,
    puntaje: decision.puntaje,
    notaMile: decision.notaMile,
    resultados: decision.resultados,
  });
  const leido = leerRechazo(json);
  assert.equal(leido?.origen, "mile");
  assert.deepEqual(leido?.fallidos, ["mesa"]);
  assert.equal(leido?.notaMile, decision.notaMile);
  assert.equal(leerRevisionMile(serializarRevisionMile({
    puntaje: 0,
    notaMile: decision.notaMile,
    resultados: decision.resultados,
  }))?.puntaje, 0);
});

test("con la bandera apagada la revisión sigue en la condición", async () => {
  const base = tareasSemilla().find((item) => item.id === "stand");
  assert.ok(base);
  const tarea = { ...base, requisitos: JSON.stringify([{ id: "banner", texto: "Banner" }]) };
  const cuerpos: string[] = [];
  const resultado = await revisar(tarea, FOTO, {
    claveGroq: "clave",
    layaUrl: "https://laya.example",
    mileActivo: false,
    esperar: async () => undefined,
    fetchImpl: async (input, init) => {
      if (String(input).includes("groq")) return groq("Banner.");
      cuerpos.push(String(init?.body ?? ""));
      return new Response("no", { status: 502 });
    },
  });
  assert.equal(resultado.origen, "error");
  assert.equal(resultado.mile, undefined);
  assert.match(cuerpos[0] ?? "", /"c1"/);
  assert.equal((cuerpos[0] ?? "").includes('"r0"'), false);
});

test("con la bandera encendida Mile rechaza el requisito que no cumple", async () => {
  const base = tareasSemilla().find((item) => item.id === "stand");
  assert.ok(base);
  const tarea = {
    ...base,
    requisitos: JSON.stringify([
      { id: "banner", texto: "El banner de frente" },
      { id: "mesa", texto: "La mesa armada" },
    ]),
  };
  let llamadas = 0;
  const resultado = await revisar(tarea, FOTO, {
    claveGroq: "clave",
    layaUrl: "https://laya.example",
    mileActivo: true,
    intento: 1,
    maxIntentos: 3,
    idioma: "es",
    fetchImpl: async (input) => {
      if (String(input).includes("groq")) return groq("Solo se ve el banner.");
      llamadas += 1;
      return Response.json({
        answers: {
          r0: { score: 2 },
          r1: { score: 0 },
        },
      });
    },
  });
  assert.equal(llamadas, 1);
  assert.equal(resultado.origen, "scout");
  assert.equal(resultado.mile?.accion, "rechazar");
  assert.equal(resultado.mile?.puntaje, 50);
  assert.equal(resultado.mile?.resultados[1]?.estado, "no_cumple");
  assert.equal(resultado.mile?.resultados[1]?.observacion, "Esto no aparece en tu foto.");
  assert.match(resultado.frase, /Toma otra foto/);
  const rechazo = leerRechazo(resultado.mile?.rechazoJson);
  assert.equal(rechazo?.origen, "mile");
  assert.deepEqual(rechazo?.fallidos, ["mesa"]);
});

test("si Laya no responde los requisitos, la revisión vuelve a la condición", async () => {
  const base = tareasSemilla().find((item) => item.id === "stand");
  assert.ok(base);
  const tarea = { ...base, requisitos: JSON.stringify([{ id: "banner", texto: "Banner" }]) };
  const cuerpos: string[] = [];
  await revisar(tarea, FOTO, {
    claveGroq: "clave",
    layaUrl: "https://laya.example",
    mileActivo: true,
    esperar: async () => undefined,
    fetchImpl: async (input, init) => {
      if (String(input).includes("groq")) return groq("Banner.");
      cuerpos.push(String(init?.body ?? ""));
      if (cuerpos.length === 1) return Response.json({ answers: {} });
      return new Response("no", { status: 502 });
    },
  });
  assert.match(cuerpos[0] ?? "", /"r0"/);
  assert.match(cuerpos[1] ?? "", /"c1"/);
});

test("guardar el rechazo de Mile devuelve la tarea a pendiente", async () => {
  const almacen = crearMemoria();
  await asegurarSemilla(almacen);
  const base = tareasSemilla().find((item) => item.id === "stand");
  assert.ok(base);
  await almacen.actualizarTarea(base.id, { estado: "en revisión" });
  await almacen.crearEvidencia({
    id: "ev-mile",
    tareaId: base.id,
    blobId: "blob",
    monto: null,
    montoConfirmado: null,
    fecha: null,
    creadaEn: "2026-10-05T12:00:00.000Z",
  });
  await guardarRevision(almacen, "ev-mile", base.id, {
    texto: "Solo el banner.",
    monto: null,
    fecha: null,
    choice: "requisitos",
    noul: false,
    score: "50",
    veredicto: "parcial",
    nota: 50,
    frase: "Falta un punto. Toma otra foto y envíala de nuevo.",
    origen: "scout",
    codigo: null,
    mile: {
      accion: "rechazar",
      rechazoJson: serializarRechazo({
        nota: "Falta un punto. Toma otra foto y envíala de nuevo.",
        fallidos: ["mesa"],
        en: "2026-10-05T12:00:00.000Z",
        origen: "mile",
        intento: 1,
        puntaje: 50,
        notaMile: "Falta un punto. Toma otra foto y envíala de nuevo.",
        resultados: [{ id: "mesa", texto: "Mesa", estado: "no_cumple", observacion: "Esto no aparece en tu foto." }],
      }),
      puntaje: 50,
      notaMile: "Falta un punto. Toma otra foto y envíala de nuevo.",
      resultados: [{ id: "mesa", texto: "Mesa", estado: "no_cumple", observacion: "Esto no aparece en tu foto." }],
    },
  });
  const tarea = await almacen.leerTarea(base.id);
  assert.equal(tarea?.estado, "pendiente");
  assert.deepEqual(leerRechazo(tarea?.rechazo)?.fallidos, ["mesa"]);
  assert.equal((await almacen.veredictoDe("ev-mile"))?.frase.includes("Toma otra foto"), true);
});

test("una sugerencia mal formada o una Laya caída devuelve lista vacía", async () => {
  assert.deepEqual(leerSugerencias("hola"), []);
  assert.deepEqual(
    leerSugerencias(JSON.stringify({ requisitos: ["<b>Banner</b>", "Banner", "Mesa", "Cajas", "Extra"] })),
    ["Banner", "Mesa", "Cajas"],
  );
  const vacio = await sugerirRequisitos("Puesto", "Arma la mesa", async () => {
    throw new Error("red");
  }, "clave");
  assert.deepEqual(vacio, []);
  const caido = await sugerirRequisitos("Puesto", "Arma la mesa", async () => new Response("no", { status: 503 }), "clave");
  assert.deepEqual(caido, []);
  assert.deepEqual(await sugerirRequisitos("Puesto", "Arma la mesa", async () => groq("no"), null), []);
});
