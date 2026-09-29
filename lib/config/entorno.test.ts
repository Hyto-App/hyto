import assert from "node:assert/strict";
import test from "node:test";
import { encabezadoCookie } from "../sesion/cookie";
import {
  CONFIRMACION_BASE_PRODUCCION,
  CONFIRMAR_BASE_PRODUCCION,
  HOST_BASE_PRODUCCION,
  aplicarEnvLocal,
  informeEntorno,
  mensajeFalta,
  mensajeLineasOmitidas,
  parsearEnv,
  prepararBaseDe,
  revisarBaseLocal,
  urlDeBase,
  validarEntorno,
  VARIABLES,
  VARIABLES_PUBLICAS,
  VARIABLES_SERVIDOR,
} from "./entorno";

const SECRETO = "clave-super-secreta-xyz";
const URL_LOCAL = "postgresql://usuario:local-secreta@db.local.ejemplo/hyto";
const URL_PRODUCCION = `postgresql://usuario:${SECRETO}@db.produccion.ejemplo:5432/hyto`;

test("importar y validar no lanza si faltan opcionales", () => {
  const resultado = validarEntorno({});
  assert.equal(resultado.errores.length > 0, true);
  assert.equal(resultado.avisosServidor.length > 0, true);
});

test("solo DATABASE_URL es obligatoria", () => {
  const obligatorias = VARIABLES.filter((variable) => variable.requerida).map((variable) => variable.nombre);
  assert.deepEqual(obligatorias, ["DATABASE_URL"]);
  const resultado = validarEntorno({});
  assert.deepEqual(
    resultado.errores.map((variable) => variable.nombre),
    ["DATABASE_URL"],
  );
  assert.match(mensajeFalta(resultado.errores[0]), /Falta DATABASE_URL \(obligatoria, servidor\)/);
  assert.match(mensajeFalta(resultado.errores[0]), /Neon Postgres/);
});

test("separa lo público de lo de servidor", () => {
  assert.ok(VARIABLES_PUBLICAS.length > 0);
  for (const variable of VARIABLES_PUBLICAS) {
    assert.equal(variable.ambito, "publico");
    assert.equal(variable.nombre.startsWith("NEXT_PUBLIC_"), true);
    assert.equal(variable.requerida, false);
  }
  for (const variable of VARIABLES_SERVIDOR) {
    assert.equal(variable.ambito, "servidor");
    assert.equal(variable.nombre.startsWith("NEXT_PUBLIC_"), false);
  }
  const resultado = validarEntorno({});
  assert.deepEqual(
    resultado.avisosPublicos.map((variable) => variable.nombre),
    ["NEXT_PUBLIC_CAVOS_APP_ID"],
  );
  assert.equal(
    resultado.avisosServidor.some((variable) => variable.nombre === "GROQ_API_KEY"),
    true,
  );
  assert.equal(
    resultado.errores.some((variable) => variable.nombre === "GROQ_API_KEY"),
    false,
  );
  const mencionadas = [...resultado.errores, ...resultado.avisosPublicos, ...resultado.avisosServidor].map(
    (variable) => variable.nombre,
  );
  assert.equal(mencionadas.includes(CONFIRMAR_BASE_PRODUCCION), false);
});

test("un valor vacío o en blanco cuenta como ausente", () => {
  const resultado = validarEntorno({ DATABASE_URL: "   ", GROQ_API_KEY: "" });
  assert.deepEqual(
    resultado.errores.map((variable) => variable.nombre),
    ["DATABASE_URL"],
  );
  assert.equal(
    resultado.avisosServidor.some((variable) => variable.nombre === "GROQ_API_KEY"),
    true,
  );
});

test("el informe dice qué falta y para qué, sin valores", () => {
  const resultado = validarEntorno({
    DATABASE_URL: URL_PRODUCCION,
    GROQ_API_KEY: SECRETO,
    NEXT_PUBLIC_CAVOS_APP_ID: "app-secreta",
  });
  const texto = informeEntorno(resultado);
  assert.match(texto, /No falta ninguna variable de servidor obligatoria/);
  assert.match(texto, /Definidas, sin mostrar el valor: NEXT_PUBLIC_CAVOS_APP_ID, DATABASE_URL, GROQ_API_KEY/);
  assert.equal(texto.includes(SECRETO), false);
  assert.equal(texto.includes("postgresql://"), false);
  assert.equal(texto.includes("app-secreta"), false);
  assert.match(texto, /Faltan variables de servidor opcionales/);
  assert.match(texto, /LAYA_URL/);
  assert.match(texto, /stub/);
});

test("parsea .env.local y omite la línea que no se puede leer", () => {
  const parseo = parsearEnv(`
# comentario
export DATABASE_URL="${URL_PRODUCCION}"
GROQ_API_KEY='${SECRETO}'
LAYA_URL=https://laya.ejemplo # nota
BLOB_READ_WRITE_TOKEN=
TRUSTLESS_API_KEY="sin cierre
esto no es una variable
`);
  assert.equal(parseo.valores.DATABASE_URL, URL_PRODUCCION);
  assert.equal(parseo.valores.GROQ_API_KEY, SECRETO);
  assert.equal(parseo.valores.LAYA_URL, "https://laya.ejemplo");
  assert.equal(parseo.valores.BLOB_READ_WRITE_TOKEN, "");
  assert.equal(parseo.valores.TRUSTLESS_API_KEY, undefined);
  assert.equal(parseo.lineasOmitidas, 2);
  assert.equal(mensajeLineasOmitidas(1).includes(SECRETO), false);
  assert.match(mensajeLineasOmitidas(2), /No se leyeron 2 líneas/);
});

test("aplicar el archivo no pisa el entorno ni copia claves desconocidas", () => {
  const destino: { [clave: string]: string | undefined } = { DATABASE_URL: "ya-definida" };
  aplicarEnvLocal(
    {
      DATABASE_URL: URL_PRODUCCION,
      GROQ_API_KEY: SECRETO,
      OTRA_COSA: SECRETO,
      BLOB_READ_WRITE_TOKEN: "   ",
    },
    destino,
  );
  assert.equal(destino.DATABASE_URL, "ya-definida");
  assert.equal(destino.GROQ_API_KEY, SECRETO);
  assert.equal(destino.OTRA_COSA, undefined);
  assert.equal(destino.BLOB_READ_WRITE_TOKEN, undefined);
  const confirmacion: { [clave: string]: string | undefined } = {};
  aplicarEnvLocal({ [CONFIRMAR_BASE_PRODUCCION]: CONFIRMACION_BASE_PRODUCCION }, confirmacion);
  assert.equal(confirmacion[CONFIRMAR_BASE_PRODUCCION], CONFIRMACION_BASE_PRODUCCION);
});

test("sin host configurado no bloquea ni inventa uno", () => {
  const revision = revisarBaseLocal(URL_LOCAL, null, null);
  assert.equal(revision.ok, true);
  if (revision.ok) {
    assert.match(revision.aviso ?? "", new RegExp(HOST_BASE_PRODUCCION));
    assert.equal((revision.aviso ?? "").includes("local-secreta"), false);
    assert.equal((revision.aviso ?? "").includes("neon.tech"), false);
  }
});

test("un fragmento del host no cuenta como producción", () => {
  const revision = revisarBaseLocal(URL_PRODUCCION, "produccion", null);
  assert.equal(revision.ok, true);
  if (revision.ok) assert.equal(revision.aviso, null);
});

test("si el host coincide, hace falta la confirmación explícita", () => {
  const sinConfirmar = revisarBaseLocal(URL_PRODUCCION, "db.produccion.ejemplo", null);
  assert.equal(sinConfirmar.ok, false);
  if (!sinConfirmar.ok) {
    assert.match(sinConfirmar.mensaje, new RegExp(CONFIRMAR_BASE_PRODUCCION));
    assert.match(sinConfirmar.mensaje, new RegExp(CONFIRMACION_BASE_PRODUCCION));
    assert.equal(sinConfirmar.mensaje.includes(SECRETO), false);
    assert.equal(sinConfirmar.mensaje.includes("postgresql://"), false);
    assert.equal(sinConfirmar.mensaje.includes("db.produccion.ejemplo"), false);
  }
  for (const valor of ["true", "1", "yes", "sí"]) {
    assert.equal(revisarBaseLocal(URL_PRODUCCION, "db.produccion.ejemplo", valor).ok, false);
  }
  const confirmada = revisarBaseLocal(URL_PRODUCCION, "db.produccion.ejemplo", " SI ");
  assert.equal(confirmada.ok, true);
  if (confirmada.ok) assert.equal((confirmada.aviso ?? "").includes(SECRETO), false);
});

test("acepta el host dentro de una URL configurada y varios hosts", () => {
  const comoUrl = revisarBaseLocal(
    URL_PRODUCCION,
    `postgresql://otro:${SECRETO}@db.produccion.ejemplo/hyto`,
    "si",
  );
  assert.equal(comoUrl.ok, true);
  if (comoUrl.ok) assert.equal((comoUrl.aviso ?? "").includes(SECRETO), false);
  const lista = revisarBaseLocal(URL_LOCAL, "db.produccion.ejemplo, db.local.ejemplo:5432", null);
  assert.equal(lista.ok, false);
});

test("un host mal escrito detiene la migración sin repetir el texto", () => {
  const revision = revisarBaseLocal(URL_PRODUCCION, `no es host ${SECRETO}`, null);
  assert.equal(revision.ok, false);
  if (!revision.ok) {
    assert.match(revision.mensaje, new RegExp(HOST_BASE_PRODUCCION));
    assert.equal(revision.mensaje.includes(SECRETO), false);
  }
});

test("un token ilegible invalida toda la lista y la coma final vacía no", () => {
  const mezclada = revisarBaseLocal(
    URL_PRODUCCION,
    `ep-prod.us-east-2.aws.neon.tech/${SECRETO}, db.produccion.ejemplo`,
    "si",
  );
  assert.equal(mezclada.ok, false);
  if (!mezclada.ok) {
    assert.match(mezclada.mensaje, new RegExp(HOST_BASE_PRODUCCION));
    assert.equal(mezclada.mensaje.includes(SECRETO), false);
    assert.equal(mezclada.mensaje.includes("ep-prod"), false);
    assert.equal(mezclada.mensaje.includes("db.produccion.ejemplo"), false);
  }
  const comaFinal = revisarBaseLocal(URL_PRODUCCION, "db.produccion.ejemplo,", null);
  assert.equal(comaFinal.ok, false);
  const otra = revisarBaseLocal(URL_LOCAL, "db.produccion.ejemplo, ,", null);
  assert.equal(otra.ok, true);
  if (otra.ok) assert.equal(otra.aviso, null);
});

test("una URL ilegible no se migra y no se imprime", () => {
  const preparada = prepararBaseDe({ DATABASE_URL: `no-es-url-${SECRETO}` });
  assert.equal(preparada.ok, false);
  if (!preparada.ok) {
    assert.match(preparada.mensaje, /no se puede leer como URL/);
    assert.equal(preparada.mensaje.includes(SECRETO), false);
    assert.equal("url" in preparada, false);
  }
});

test("preparar la base local exige DATABASE_URL y respeta la salvaguarda", () => {
  const falta = prepararBaseDe({});
  assert.equal(falta.ok, false);
  if (!falta.ok) assert.match(falta.mensaje, /Falta DATABASE_URL/);
  const lista = prepararBaseDe({
    DATABASE_URL: URL_PRODUCCION,
    [HOST_BASE_PRODUCCION]: "db.produccion.ejemplo",
  });
  assert.equal(lista.ok, false);
  const sigue = prepararBaseDe({
    DATABASE_URL: URL_LOCAL,
    [HOST_BASE_PRODUCCION]: "db.produccion.ejemplo",
  });
  assert.equal(sigue.ok, true);
  if (sigue.ok) {
    assert.equal(sigue.url, URL_LOCAL);
    assert.equal(sigue.aviso, null);
  }
});

test("la cookie solo marca Secure en producción", () => {
  const env = process.env as { NODE_ENV?: string };
  const anterior = env.NODE_ENV;
  try {
    env.NODE_ENV = "production";
    assert.match(encabezadoCookie("abc"), /; Secure/);
    env.NODE_ENV = "development";
    assert.equal(encabezadoCookie("abc").includes("Secure"), false);
  } finally {
    if (anterior === undefined) delete env.NODE_ENV;
    else env.NODE_ENV = anterior;
  }
});

test("urlDeBase lee DATABASE_URL en el momento", () => {
  const anterior = process.env.DATABASE_URL;
  try {
    delete process.env.DATABASE_URL;
    assert.equal(urlDeBase(), null);
    process.env.DATABASE_URL = `  ${URL_LOCAL}  `;
    assert.equal(urlDeBase(), URL_LOCAL);
  } finally {
    if (anterior === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = anterior;
  }
});
