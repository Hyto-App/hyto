import assert from "node:assert/strict";
import test from "node:test";
import { cerrar } from "./armar";
import { FalloRevision } from "./fallo";
import { etiquetasDe } from "./razones";
import { coincideMencionado, escribirLectura, leerLectura, leerLecturaGuardada } from "./lectura";
import { preguntarLaya, senalesDeTrabajo, type RespuestasTrabajo } from "./laya";
import { TOPE_FALTA_GRAVE } from "./pesos";
import { describirFoto, formatoRespuestaVision, modeloAdmiteEsquemaEstricto, pedidoVision } from "./scout";
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
  assert.equal(layaPuedeTaparPorOtra({ coincide: "parcial" }, ENCENDIDO), true);
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
  assert.notEqual(encendido, apagado);
  assert.match(encendido, /faltantes, coincide/);
  assert.match(encendido, /coincide is required on every reply/);
  assert.match(encendido, /Never omit the key/);
  assert.match(encendido, /"si" only when the photo shows the thing the organizer asked for/);
  assert.match(encendido, /The JSON is invalid without "coincide"/);
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
  assert.equal(leerLectura({ ...base, coincidencia: "si" })?.coincide, "si");
  assert.equal(coincideMencionado('tail\n"coincide": "parcial"'), "parcial");
  assert.equal(coincideMencionado("coincide: sí"), "si");
  assert.equal(coincideMencionado("the photo does not match what was asked"), null);

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

test("encendido, solo coincide si quita el 0 y el tope de 49", async () => {
  const senales = await preguntar(ENCENDIDO, "otra", { coincide: "si" });
  assert.notEqual(senales.score, "0");
  assert.equal(senales.choice, "trabajo");
  assert.equal(senales.motivos, undefined);
  const cerrado = cerrar(
    "trabajo",
    null,
    { texto: "Volunteers on stage.", monto: null, fecha: null, lectura: { ...lecturaMinima(), coincide: "si" } },
    senales,
    "scout",
  );
  assert.equal(cerrado?.nota, 80);
  assert.equal(cerrado?.veredicto, "cumplió");
  assert.ok((cerrado?.nota ?? 0) > TOPE_FALTA_GRAVE);
});

test("encendido, coincide parcial conserva el 0 y el tope de 49 (caso 04)", async () => {
  const cero = await preguntar(ENCENDIDO, "otra", { coincide: "parcial" });
  assert.equal(cero.score, "0");
  assert.equal(cero.choice, "otra");
  assert.deepEqual(cero.motivos, ["otra"]);
  const cerradoCero = cerrar(
    "trabajo",
    null,
    {
      texto: "Cursor stickers. ZEEK was asked and is not the brand in the photo.",
      monto: null,
      fecha: null,
      lectura: { ...lecturaMinima(), coincide: "parcial" },
    },
    cero,
    "scout",
  );
  assert.equal(cerradoCero?.nota, 0);

  const trabajo = await preguntar(ENCENDIDO, "trabajo", { coincide: "parcial" });
  assert.equal(trabajo.score, "80");
  assert.deepEqual(trabajo.motivos, ["no_coincide"]);
  const cerrado = cerrar(
    "trabajo",
    null,
    { texto: "Cursor stickers.", monto: null, fecha: null, lectura: { ...lecturaMinima(), coincide: "parcial" } },
    trabajo,
    "scout",
  );
  assert.equal(cerrado?.nota, TOPE_FALTA_GRAVE);
  assert.equal(cerrado?.veredicto, "insuficiente");
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
      etiquetasDe({ ...base, lectura: { ...lecturaMinima(), coincide: "parcial" } }).some((etiqueta) => etiqueta.id === "cap_no_coincide"),
      true,
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

const FOTO = new Uint8Array([1, 2, 3]);
const LECTURA_SIN = JSON.stringify({
  tipo: "trabajo",
  texto_completo: "Cursor stickers on a laptop. ZEEK was asked and is not visible.",
  legible: true,
  faltantes: ["ZEEK"],
});

test("el esquema exige coincide solo con el interruptor encendido", () => {
  assert.equal(modeloAdmiteEsquemaEstricto("qwen/qwen3.8-27b"), true);
  assert.equal(modeloAdmiteEsquemaEstricto("openai/gpt-oss-20b"), true);
  assert.equal(modeloAdmiteEsquemaEstricto("openai/gpt-oss-120b"), true);
  assert.equal(modeloAdmiteEsquemaEstricto("meta-llama/llama-4-scout-17b-16e-instruct"), false);
  assert.deepEqual(formatoRespuestaVision("qwen/qwen3.8-27b", APAGADO), { type: "json_object" });
  assert.deepEqual(formatoRespuestaVision("qwen/qwen3.8-27b", {}), { type: "json_object" });

  const estricto = formatoRespuestaVision("qwen/qwen3.8-27b", ENCENDIDO);
  assert.equal(estricto.type, "json_schema");
  if (estricto.type !== "json_schema") return;
  assert.equal(estricto.json_schema.strict, true);
  assert.equal(estricto.json_schema.name, "lectura_hyto");
  const required = estricto.json_schema.schema.required as string[];
  assert.ok(required.includes("coincide"));
  assert.equal(required.includes("texto_completo"), true);
  assert.equal(estricto.json_schema.schema.additionalProperties, false);
  const propiedades = estricto.json_schema.schema.properties as Record<string, { type?: string; enum?: string[] }>;
  assert.deepEqual(propiedades.coincide, { type: "string", enum: ["si", "parcial", "no"] });

  const laxo = formatoRespuestaVision("meta-llama/llama-4-scout-17b-16e-instruct", ENCENDIDO);
  if (laxo.type === "json_schema") assert.equal(laxo.json_schema.strict, false);
  const conRegla = formatoRespuestaVision("qwen/qwen3.8-27b", ENCENDIDO, true);
  if (conRegla.type === "json_schema") assert.ok((conRegla.json_schema.schema.required as string[]).includes("cumple_reglas"));
});

test("apagado, Groq sigue en json_object y no reintenta aunque el texto mencione coincide", async () => {
  let llamadas = 0;
  const descripcion = await describirFoto(
    FOTO,
    "image/jpeg",
    "clave",
    async (_input, init) => {
      llamadas += 1;
      const cuerpo = JSON.parse(String(init?.body)) as { response_format: unknown };
      assert.deepEqual(cuerpo.response_format, { type: "json_object" });
      return Response.json({ choices: [{ message: { content: `${LECTURA_SIN}\ncoincide: si` } }] });
    },
    undefined,
    { condicion: "ZEEK stickers" },
    APAGADO,
  );
  assert.equal(llamadas, 1);
  assert.equal(descripcion.lectura?.coincide, null);
});

test("encendido, coincide dentro del JSON no pide otro llamado", async () => {
  let llamadas = 0;
  const descripcion = await describirFoto(
    FOTO,
    "image/jpeg",
    "clave",
    async (_input, init) => {
      llamadas += 1;
      const cuerpo = JSON.parse(String(init?.body)) as { response_format: { type: string } };
      assert.equal(cuerpo.response_format.type, "json_schema");
      return Response.json({
        choices: [{ message: { content: JSON.stringify({ ...JSON.parse(LECTURA_SIN), coincide: "si" }) } }],
      });
    },
    undefined,
    {},
    ENCENDIDO,
  );
  assert.equal(llamadas, 1);
  assert.equal(descripcion.lectura?.coincide, "si");
});

test("encendido, un 400 del esquema reintenta una vez con json_object y no suma un tercero", async () => {
  const formatos: unknown[] = [];
  const conCampo = await describirFoto(
    FOTO,
    "image/jpeg",
    "clave",
    async (_input, init) => {
      const cuerpo = JSON.parse(String(init?.body)) as { response_format: unknown };
      formatos.push(cuerpo.response_format);
      if (formatos.length === 1) return new Response("json_schema is not supported", { status: 400 });
      return Response.json({
        choices: [{ message: { content: JSON.stringify({ ...JSON.parse(LECTURA_SIN), coincide: "no" }) } }],
      });
    },
    undefined,
    {},
    ENCENDIDO,
  );
  assert.equal(formatos.length, 2);
  assert.equal((formatos[0] as { type: string }).type, "json_schema");
  assert.deepEqual(formatos[1], { type: "json_object" });
  assert.equal(conCampo.lectura?.coincide, "no");

  let llamadas = 0;
  const sinCampo = await describirFoto(
    FOTO,
    "image/jpeg",
    "clave",
    async () => {
      llamadas += 1;
      if (llamadas === 1) return new Response("response_format rejected", { status: 400 });
      return Response.json({ choices: [{ message: { content: LECTURA_SIN } }] });
    },
    undefined,
    {},
    ENCENDIDO,
  );
  assert.equal(llamadas, 2);
  assert.equal(sinCampo.lectura?.coincide ?? null, null);
});

test("encendido, un 400 de cupo y un 500 no cambian de formato", async () => {
  let llamadas = 0;
  await assert.rejects(
    () =>
      describirFoto(
        FOTO,
        "image/jpeg",
        "clave",
        async () => {
          llamadas += 1;
          return new Response(JSON.stringify({ error: { message: "You exceeded your token quota" } }), { status: 400 });
        },
        undefined,
        {},
        ENCENDIDO,
      ),
    (error: unknown) => error instanceof FalloRevision && error.code === "cupo",
  );
  assert.equal(llamadas, 1);

  llamadas = 0;
  await assert.rejects(
    () =>
      describirFoto(
        FOTO,
        "image/jpeg",
        "clave",
        async () => {
          llamadas += 1;
          return new Response("no", { status: 500 });
        },
        undefined,
        {},
        ENCENDIDO,
      ),
    (error: unknown) => error instanceof FalloRevision && error.code === "proveedor",
  );
  assert.equal(llamadas, 1);
});

test("encendido, coincide escrito fuera del JSON no pide otro llamado", async () => {
  let llamadas = 0;
  const descripcion = await describirFoto(
    FOTO,
    "image/jpeg",
    "clave",
    async () => {
      llamadas += 1;
      return Response.json({ choices: [{ message: { content: `${LECTURA_SIN}\ncoincide: parcial` } }] });
    },
    undefined,
    {},
    ENCENDIDO,
  );
  assert.equal(llamadas, 1);
  assert.equal(descripcion.lectura?.coincide, "parcial");
});

test("encendido, si falta coincide hay un solo reintento de texto y un fallo conserva la lectura", async () => {
  const cuerpos: { response_format?: { type?: string; json_schema?: { schema?: { required?: string[] } } }; messages?: { content: unknown }[] }[] = [];
  const descripcion = await describirFoto(
    FOTO,
    "image/jpeg",
    "clave",
    async (_input, init) => {
      const cuerpo = JSON.parse(String(init?.body)) as (typeof cuerpos)[number];
      cuerpos.push(cuerpo);
      if (cuerpos.length === 1) return Response.json({ choices: [{ message: { content: LECTURA_SIN } }] });
      return Response.json({ choices: [{ message: { content: '{"coincide":"si"}' } }] });
    },
    undefined,
    { condicion: "ZEEK stickers" },
    ENCENDIDO,
  );
  assert.equal(cuerpos.length, 2);
  assert.ok(Array.isArray(cuerpos[0].messages?.[0]?.content));
  assert.equal(typeof cuerpos[1].messages?.[0]?.content, "string");
  assert.equal(cuerpos[1].response_format?.type, "json_schema");
  assert.deepEqual(cuerpos[1].response_format?.json_schema?.schema?.required, ["coincide"]);
  assert.match(String(cuerpos[1].messages?.[0]?.content), /ZEEK stickers/);
  assert.equal(descripcion.lectura?.coincide, "si");

  let llamadas = 0;
  const sinCampo = await describirFoto(
    FOTO,
    "image/jpeg",
    "clave",
    async () => {
      llamadas += 1;
      if (llamadas === 1) return Response.json({ choices: [{ message: { content: LECTURA_SIN } }] });
      throw new TypeError("fetch failed");
    },
    undefined,
    {},
    ENCENDIDO,
  );
  assert.equal(llamadas, 2);
  assert.equal(sinCampo.lectura?.coincide ?? null, null);
  assert.match(sinCampo.texto, /Cursor stickers/);
});

test("encendido, la respuesta vieja sin lectura no pide coincide otra vez", async () => {
  let llamadas = 0;
  const descripcion = await describirFoto(
    FOTO,
    "image/jpeg",
    "clave",
    async () => {
      llamadas += 1;
      return Response.json({ choices: [{ message: { content: '{"texto":"Mesa","monto":null,"fecha":null}' } }] });
    },
    undefined,
    {},
    ENCENDIDO,
  );
  assert.equal(llamadas, 1);
  assert.equal(descripcion.lectura, undefined);
  assert.equal(descripcion.texto, "Mesa");
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
    { lectura, env },
  );
}
