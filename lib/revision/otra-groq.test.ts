import assert from "node:assert/strict";
import test from "node:test";
import { cerrar } from "./armar";
import { etiquetasDe } from "./razones";
import { escribirLectura, leerLectura, leerLecturaGuardada } from "./lectura";
import { preguntarLaya, senalesDeTrabajo, type RespuestasTrabajo } from "./laya";
import { TOPE_FALTA_GRAVE } from "./pesos";
import { pedidoVision } from "./scout";
import { layaPuedeTaparPorOtra, mileOtraConGroqActivo, type EntornoOtraGroq } from "./otra-groq";

const ENCENDIDO: EntornoOtraGroq = { HYTO_MILE_OTRA_CON_GROQ: "on" };
const APAGADO: EntornoOtraGroq = { HYTO_MILE_OTRA_CON_GROQ: "off" };
const PEDIDO = "Photo of the volunteers on the stage, under the welcome screen";

test("el interruptor solo acepta on", () => {
  assert.equal(mileOtraConGroqActivo({}), false);
  assert.equal(mileOtraConGroqActivo({ HYTO_MILE_OTRA_CON_GROQ: "" }), false);
  assert.equal(mileOtraConGroqActivo({ HYTO_MILE_OTRA_CON_GROQ: "off" }), false);
  assert.equal(mileOtraConGroqActivo({ HYTO_MILE_OTRA_CON_GROQ: "true" }), false);
  assert.equal(mileOtraConGroqActivo({ HYTO_MILE_OTRA_CON_GROQ: "1" }), false);
  assert.equal(mileOtraConGroqActivo({ HYTO_MILE_OTRA_CON_GROQ: "ON" }), true);
  assert.equal(mileOtraConGroqActivo({ HYTO_MILE_OTRA_CON_GROQ: " on " }), true);
});

test("apagado, Laya puede tapar aunque Groq diga que coincide", () => {
  assert.equal(layaPuedeTaparPorOtra({ coincide: "si" }, APAGADO), true);
  assert.equal(layaPuedeTaparPorOtra({ coincide: "parcial" }, APAGADO), true);
  assert.equal(layaPuedeTaparPorOtra({ coincide: "no" }, APAGADO), true);
  assert.equal(layaPuedeTaparPorOtra(null, APAGADO), true);
  assert.equal(layaPuedeTaparPorOtra({ coincide: "si" }, ENCENDIDO), false);
  assert.equal(layaPuedeTaparPorOtra({ coincide: "parcial" }, ENCENDIDO), false);
  assert.equal(layaPuedeTaparPorOtra({ coincide: "no" }, ENCENDIDO), true);
  assert.equal(layaPuedeTaparPorOtra({}, ENCENDIDO), true);
  assert.equal(layaPuedeTaparPorOtra(null, ENCENDIDO), true);
});

test("apagado, el pedido a Groq no cambia; encendido, pide coincide", () => {
  const contexto = { condicion: PEDIDO, tipoTarea: "trabajo" as const };
  const apagado = pedidoVision(contexto, APAGADO);
  assert.equal(pedidoVision(contexto, {}), apagado);
  assert.equal(apagado.includes("coincide"), false);
  const encendido = pedidoVision(contexto, ENCENDIDO);
  assert.equal(encendido.replace(", coincide", "").replace(/\ncoincide: "si".*$/m, ""), apagado);
  assert.match(encendido, /faltantes, coincide/);
  assert.match(encendido, /coincide: "si" when the photo shows what the organizer asked for/);
  assert.match(pedidoVision(contexto, { HYTO_MILE_OTRA_CON_GROQ: " ON " }), /faltantes, coincide/);
});

test("coincide se lee y una lectura vieja sigue igual", () => {
  const base = {
    tipo: "trabajo",
    texto_completo: "Volunteers stand on stage under the welcome screen. Nothing asked for is missing.",
    legible: true,
    faltantes: [] as string[],
  };
  assert.equal(leerLectura(base)?.coincide, null);
  assert.equal(leerLectura({ ...base, coincide: "sí" })?.coincide, "si");
  assert.equal(leerLectura({ ...base, coincide: "yes" })?.coincide, "si");
  assert.equal(leerLectura({ ...base, coincide: "parcial" })?.coincide, "parcial");
  assert.equal(leerLectura({ ...base, coincide: "partial" })?.coincide, "parcial");
  assert.equal(leerLectura({ ...base, coincide: "no" })?.coincide, "no");
  assert.equal(leerLectura({ ...base, coincide: "maybe" })?.coincide, null);

  const con = leerLectura({ ...base, coincide: "si" });
  assert.ok(con);
  const guardada = leerLecturaGuardada(escribirLectura(con), con.textoCompleto);
  assert.equal(guardada?.coincide, "si");

  const vieja = leerLectura(base);
  assert.ok(vieja);
  const json = escribirLectura(vieja);
  assert.equal(json.includes("coincide"), false);
  assert.equal(leerLecturaGuardada(json, vieja.textoCompleto)?.coincide, null);
});

test("apagado, otra y es_otra_cosa siguen en 0 aunque Groq diga que coincide", async () => {
  const senales = await preguntar(APAGADO, "otra", { coincide: "si" });
  assert.equal(senales.score, "0");
  assert.equal(senales.choice, "otra");
  assert.deepEqual(senales.motivos, ["otra"]);
  const cerrado = cerrar("trabajo", null, { texto: "Volunteers on stage.", monto: null, fecha: null }, senales, "scout");
  assert.equal(cerrado?.nota, 0);
  assert.equal(cerrado?.veredicto, "insuficiente");
});

test("encendido, Groq que dice que coincide no deja que Laya ponga 0 ni el tope de 49", async () => {
  for (const coincide of ["si", "parcial"] as const) {
    const senales = await preguntar(ENCENDIDO, "otra", { coincide });
    assert.notEqual(senales.score, "0");
    assert.equal(senales.choice, "trabajo");
    assert.equal(senales.motivos, undefined);
    const cerrado = cerrar(
      "trabajo",
      null,
      { texto: "Volunteers on stage.", monto: null, fecha: null, lectura: { ...lecturaMinima(), coincide } },
      senales,
      "scout",
    );
    assert.equal(cerrado?.nota, 80);
    assert.equal(cerrado?.veredicto, "cumplió");
    assert.ok((cerrado?.nota ?? 0) > TOPE_FALTA_GRAVE);
  }
});

test("encendido, una foto de otra cosa sigue en 0 y el camino de trabajo sigue topado en 49", async () => {
  const cero = await preguntar(ENCENDIDO, "otra", { coincide: "no" });
  assert.equal(cero.score, "0");
  assert.equal(cero.choice, "otra");
  assert.deepEqual(cero.motivos, ["otra"]);
  const cerradoCero = cerrar(
    "trabajo",
    null,
    {
      texto: "A wooden marimba, unrelated to the requested stand.",
      monto: null,
      fecha: null,
      lectura: { ...lecturaMinima(), tipo: "otra", coincide: "no" },
    },
    cero,
    "scout",
  );
  assert.equal(cerradoCero?.nota, 0);
  assert.equal(cerradoCero?.veredicto, "insuficiente");

  const sinCampo = await preguntar(ENCENDIDO, "otra", null);
  assert.equal(sinCampo.score, "0");

  const trabajo = await preguntar(ENCENDIDO, "trabajo", { coincide: "no" });
  assert.equal(trabajo.score, "80");
  assert.deepEqual(trabajo.motivos, ["no_coincide"]);
  const cerrado = cerrar(
    "trabajo",
    null,
    { texto: "A wooden marimba.", monto: null, fecha: null, lectura: { ...lecturaMinima(), coincide: "no" } },
    trabajo,
    "scout",
  );
  assert.equal(cerrado?.nota, TOPE_FALTA_GRAVE);
  assert.equal(cerrado?.veredicto, "insuficiente");

  const queSi = senalesDeTrabajo(respuestas(), "", { coincide: "si" }, ENCENDIDO);
  assert.equal(queSi.motivos, undefined);
  assert.equal(queSi.score, "80");
  const aMedias = senalesDeTrabajo({ ...respuestas(), t6: "sin_empezar" }, "", { coincide: "si" }, ENCENDIDO);
  assert.deepEqual(aMedias.motivos, ["sin_empezar"]);
});

test("la etiqueta del tope sigue a la misma regla", () => {
  const previo = process.env.HYTO_MILE_OTRA_CON_GROQ;
  const base = {
    clase: "trabajo" as const,
    trabajo: respuestas(),
    factura: null,
    descripcion: "Volunteers on stage under the welcome screen.",
    cerca: [],
    monto: null,
    fecha: null,
    tope: null,
  };
  try {
    delete process.env.HYTO_MILE_OTRA_CON_GROQ;
    assert.equal(
      etiquetasDe({ ...base, lectura: { ...lecturaMinima(), coincide: "si" } }).some((etiqueta) => etiqueta.id === "cap_no_coincide"),
      true,
    );
    process.env.HYTO_MILE_OTRA_CON_GROQ = "on";
    assert.equal(
      etiquetasDe({ ...base, lectura: { ...lecturaMinima(), coincide: "si" } }).some((etiqueta) => etiqueta.id === "cap_no_coincide"),
      false,
    );
    assert.equal(
      etiquetasDe({ ...base, lectura: { ...lecturaMinima(), coincide: "no" } }).some((etiqueta) => etiqueta.id === "cap_no_coincide"),
      true,
    );
    assert.equal(
      etiquetasDe({ ...base, lectura: lecturaMinima() }).some((etiqueta) => etiqueta.id === "cap_no_coincide"),
      true,
    );
  } finally {
    if (previo === undefined) delete process.env.HYTO_MILE_OTRA_CON_GROQ;
    else process.env.HYTO_MILE_OTRA_CON_GROQ = previo;
  }
});

function lecturaMinima() {
  return leerLectura({
    tipo: "trabajo",
    texto_completo: "Volunteers stand on stage under the welcome screen.",
    legible: true,
    faltantes: [],
  })!;
}

function respuestas(): RespuestasTrabajo {
  return {
    lugar: "stand_o_mesa",
    v1: "es_otra_cosa",
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

async function preguntar(
  env: EntornoOtraGroq,
  clase: "otra" | "trabajo",
  lectura: { coincide?: "si" | "parcial" | "no" | null } | null,
) {
  return preguntarLaya(
    "https://laya.example",
    "Volunteers on stage under the welcome screen.",
    PEDIDO,
    async (_input, init) => {
      const cuerpo = JSON.parse(String(init?.body)) as { questions: Record<string, unknown> };
      if ("c1" in cuerpo.questions) return Response.json({ answers: { c1: { choice: clase } } });
      return Response.json({
        answers: {
          lugar: { choice: "stand_o_mesa" },
          v1: { choice: "es_otra_cosa" },
          v2: { score: 2 },
          v3: { noul: true },
          v4: { noul: false },
          t5: { choice: "armar_o_montar" },
          t6: { choice: "terminado" },
          t7: { noul: true },
          t8: { noul: true },
          t9: { noul: false },
          t10: { score: 2 },
        },
      });
    },
    undefined,
    undefined,
    undefined,
    lectura,
    env,
  );
}
