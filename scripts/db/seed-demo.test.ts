import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  CONSULTA_COLUMNAS,
  EVIDENCIAS,
  HASH_PAGO_PLACEHOLDER,
  ID,
  MIGRACION_0007,
  TAREAS,
  USUARIOS,
  WALLET,
  aSql,
  claveFila,
  columnasDelPlan,
  columnasFaltantes,
  contarInserciones,
  filasDemo,
  mensajeColumnasFaltantes,
  revisarArgumentos,
  revisarBandera,
  sqlPermitido,
  textoPrueba,
} from "./plan-demo";
import { correrSemilla, sembrarCon, type Lote } from "./seed-demo";

const TSX = "node_modules/.bin/tsx";

test("la bandera exacta 1 abre la semilla y el dry-run no pide base", () => {
  assert.equal(revisarBandera(undefined).ok, false);
  assert.equal(revisarBandera("").ok, false);
  assert.equal(revisarBandera("true").ok, false);
  assert.equal(revisarBandera(" 1").ok, false);
  assert.equal(revisarBandera("1").ok, true);
  assert.deepEqual(revisarArgumentos([]), { ok: true, prueba: false });
  assert.deepEqual(revisarArgumentos(["--dry-run"]), { ok: true, prueba: true });
  assert.equal(revisarArgumentos(["--aplicar"]).ok, false);
});

test("el plan cubre organizer, team, dos voluntarios y los tres estados", () => {
  assert.deepEqual(
    USUARIOS.map((usuario) => usuario.email),
    [
      "organizer.demo@example.com",
      "team.demo@example.com",
      "ana.volunteer.demo@example.com",
      "luis.volunteer.demo@example.com",
    ],
  );
  assert.equal(USUARIOS.every((usuario) => usuario.email.endsWith("@example.com")), true);
  const filas = filasDemo();
  const miembros = filas.filter((fila) => fila.tabla === "proyecto_miembros");
  const rol = (usuarioId: string) => miembros.find((fila) => fila.valores[1] === usuarioId)?.valores[2];
  assert.equal(rol(ID.org), "organizer");
  assert.equal(rol(ID.team), "team");
  assert.equal(rol(ID.ana), "volunteer");
  assert.equal(rol(ID.luis), "volunteer");
  assert.deepEqual(
    TAREAS.map((tarea) => tarea.estado).sort(),
    ["en revisión", "en revisión", "pagado", "pendiente"],
  );
  assert.equal(TAREAS.find((tarea) => tarea.id === ID.pendiente)?.hashPago, null);
  assert.equal(TAREAS.find((tarea) => tarea.id === ID.revision)?.contratoEscrow, null);
  assert.equal(TAREAS.find((tarea) => tarea.id === ID.pagada)?.hashPago, HASH_PAGO_PLACEHOLDER);
  assert.equal(/^[a-fA-F0-9]{64}$/.test(HASH_PAGO_PLACEHOLDER), false);
  assert.equal(TAREAS.every((tarea) => tarea.walletCobro.startsWith("PLACEHOLDER-")), true);
  assert.equal(Object.values(WALLET).every((wallet) => wallet.startsWith("PLACEHOLDER-G-")), true);
  assert.equal(EVIDENCIAS.some((evidencia) => evidencia.tareaId === ID.pendiente), false);
  assert.equal(EVIDENCIAS.every((evidencia) => evidencia.blobId.startsWith("placeholder-demo-12-oct/")), true);
  assert.equal(EVIDENCIAS.find((evidencia) => evidencia.tareaId === ID.comida)?.montoConfirmado, "12.40");
});

test("cada sentencia es un insert que no pisa filas y la segunda pasada no inserta", () => {
  const filas = filasDemo();
  const claves = new Set(filas.map((fila) => claveFila(fila)));
  assert.equal(claves.size, filas.length);
  for (const fila of filas) {
    const sentencia = aSql(fila);
    assert.equal(sqlPermitido(sentencia.texto), true);
    assert.equal(sentencia.texto.includes("on conflict do nothing"), true);
    assert.equal(sentencia.valores.length, fila.columnas.length);
    assert.equal(sentencia.texto.includes("'"), false);
    assert.equal((sentencia.texto.match(/\$\d+/g) ?? []).length, sentencia.valores.length);
  }
  assert.equal(sqlPermitido("delete from tareas"), false);
  assert.equal(sqlPermitido("insert into tareas (id) values ($1)"), false);
  const primera = contarInserciones(filas, new Set());
  assert.equal(primera.nuevas.length, filas.length);
  assert.equal(primera.omitidas.length, 0);
  const segunda = contarInserciones(filas, new Set(primera.nuevas));
  assert.equal(segunda.nuevas.length, 0);
  assert.equal(segunda.omitidas.length, filas.length);
});

test("sin las columnas de 0007 no se escribe nada", async () => {
  let transaccion = 0;
  const lote: Lote = {
    async consultar(texto) {
      assert.equal(texto, CONSULTA_COLUMNAS);
      assert.match(texto, /^select /i);
      return { rows: [], rowCount: 0 };
    },
    async transaccion() {
      transaccion += 1;
      return [];
    },
  };
  const resultado = await sembrarCon(lote);
  assert.equal(resultado.codigo, 1);
  assert.equal(resultado.insertadas, 0);
  assert.equal(transaccion, 0);
  assert.match(resultado.mensaje, new RegExp(MIGRACION_0007.replaceAll(".", "\\.")));
  assert.match(resultado.mensaje, /No se escribió nada/);
  const pedidas = columnasDelPlan();
  assert.equal(pedidas.some((columna) => columna.tabla === "tareas" && columna.columna === "requisitos"), true);
  assert.equal(pedidas.some((columna) => columna.tabla === "veredictos" && columna.columna === "mile"), true);
  const aviso = mensajeColumnasFaltantes(columnasFaltantes([], pedidas));
  assert.match(aviso ?? "", /0007_requisitos_rechazo/);
});

test("con las columnas presentes la transacción solo recibe inserts", async () => {
  const pedidas = columnasDelPlan();
  const vistos: string[] = [];
  const lote: Lote = {
    async consultar() {
      return { rows: pedidas, rowCount: pedidas.length };
    },
    async transaccion(sentencias) {
      for (const sentencia of sentencias) {
        assert.equal(sqlPermitido(sentencia.texto), true);
        vistos.push(sentencia.texto);
      }
      return sentencias.map(() => 1);
    },
  };
  const resultado = await sembrarCon(lote);
  assert.equal(resultado.codigo, 0);
  assert.equal(resultado.insertadas, filasDemo().length);
  assert.equal(vistos.length, filasDemo().length);
  assert.match(resultado.mensaje, /Insertadas/);
});

test("el script de semilla no trae sentencias que borren", () => {
  const fuente = readFileSync(new URL("./seed-demo.ts", import.meta.url), "utf8");
  assert.doesNotMatch(fuente, /\b(delete|truncate|drop|update)\b/i);
  assert.match(fuente, /sembrarCon/);
});

test("dry-run imprime el plan y no abre la base", () => {
  const plan = textoPrueba();
  assert.match(plan, /Modo prueba/);
  assert.match(plan, /demo-12-oct-revision/);
  assert.doesNotMatch(plan, /postgres:\/\//);
  const resultado = spawnSync(TSX, ["scripts/db/seed-demo.ts", "--dry-run"], {
    encoding: "utf8",
    env: {
      ...process.env,
      HYTO_SEED_DEMO: "1",
      DATABASE_URL: "postgres://demo:s3cret@prod.example/hyto",
    },
  });
  assert.equal(resultado.status, 0, resultado.stderr);
  assert.match(resultado.stdout, /Modo prueba/);
  assert.match(resultado.stdout, /Feria demo 12 oct/);
  assert.doesNotMatch(`${resultado.stdout}\n${resultado.stderr}`, /s3cret/);
});

test("sin la bandera y sin base el comando se detiene", async () => {
  const logs: string[] = [];
  const original = console.error;
  console.error = (mensaje?: unknown) => {
    logs.push(String(mensaje));
  };
  try {
    assert.equal(await correrSemilla({ HYTO_SEED_DEMO: "1" }, []), 1);
    assert.match(logs.join("\n"), /DATABASE_URL/);
    logs.length = 0;
    assert.equal(await correrSemilla({}, ["--dry-run"]), 1);
    assert.match(logs.join("\n"), /HYTO_SEED_DEMO=1/);
  } finally {
    console.error = original;
  }
});
