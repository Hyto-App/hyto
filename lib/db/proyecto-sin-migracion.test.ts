import assert from "node:assert/strict";
import test from "node:test";
import { drizzle as drizzleProxy, type RemoteCallback } from "drizzle-orm/pg-proxy";
import { contextoParaRevision } from "@/lib/api/contexto-evento";
import { crearProyectoHttp, leerProyectoHttp } from "@/lib/api/proyectos";
import { crearAlmacenDesde, type DbAlmacen } from "./neon";

delete process.env.HYTO_COMUNIDADES;
delete process.env.HYTO_TIPO_CUENTA;
delete process.env.HYTO_PERFIL_VOLUNTARIO;
delete process.env.HYTO_TABLON;

const COLUMNAS_NUEVAS =
  /\b(tipo_cuenta|empresa_nombre|empresa_actividad|empresa_descripcion|empresa_foto|experiencia|etiquetas|comunidades|comunidad_miembros|comunidad_solicitudes|comunidad_avisos|comunidad_id)\b/;

const WALLET = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

type Fila = Record<string, unknown>;

function columnasInsert(consulta: string, tabla: string): string[] {
  const normal = consulta.replace(/\s+/g, " ");
  const hallado = new RegExp(`insert into "${tabla}" \\(([^)]+)\\)`, "i").exec(normal);
  if (!hallado?.[1]) throw new Error(`insert sin columnas: ${normal}`);
  return hallado[1].split(",").map((parte) => parte.trim().replace(/"/g, ""));
}

function valoresInsert(consulta: string, params: unknown[]): unknown[] {
  const normal = consulta.replace(/\s+/g, " ");
  const hallado = /values \(([^)]+)\)/i.exec(normal);
  if (!hallado?.[1]) return [...params];
  let cursor = 0;
  return hallado[1].split(",").map((token) => {
    const limpio = token.trim();
    if (/^\$\d+$/.test(limpio)) {
      const valor = params[cursor];
      cursor += 1;
      return valor;
    }
    return null;
  });
}

function columnasSelect(consulta: string, tabla: string): string[] {
  const normal = consulta.replace(/\s+/g, " ");
  const hallado = new RegExp(`select (.+) from "${tabla}"`, "i").exec(normal);
  if (!hallado?.[1]) throw new Error(`select sin columnas: ${normal}`);
  return hallado[1].split(",").map((parte) => parte.trim().replace(/"/g, "").split(".").pop() ?? "");
}

function igualdades(consulta: string, params: unknown[]): Array<[string, unknown]> {
  const normal = consulta.replace(/\s+/g, " ");
  const pares: Array<[string, unknown]> = [];
  const patron = /"([a-z0-9_]+)"\s*=\s*\$(\d+)/gi;
  for (const hallado of normal.matchAll(patron)) {
    const columna = hallado[1];
    const indice = Number(hallado[2]) - 1;
    if (!columna || !Number.isFinite(indice)) continue;
    pares.push([columna, params[indice]]);
  }
  return pares;
}

/** A ledger that only has the tables and columns from before 0010. */
function ledgerSinMigrar() {
  const tablas = new Map<string, Fila[]>();
  const consultas: string[] = [];
  const callback: RemoteCallback = async (consulta, params) => {
    consultas.push(consulta);
    if (COLUMNAS_NUEVAS.test(consulta)) {
      throw Object.assign(new Error(`column or table from 0010–0013 is not on this ledger: ${consulta}`), { code: "42703" });
    }
    const texto = consulta.replace(/\s+/g, " ").trim();
    const bajo = texto.toLowerCase();
    if (/\blimit 0\b/i.test(texto)) return { rows: [] };
    const tabla = /(?:into|update|from) "([a-z0-9_]+)"/i.exec(texto)?.[1];
    if (!tabla) throw new Error(`consulta fuera del alta: ${texto}`);
    const filas = tablas.get(tabla) ?? [];
    tablas.set(tabla, filas);
    if (bajo.startsWith("insert")) {
      const columnas = columnasInsert(texto, tabla);
      const valores = valoresInsert(texto, params);
      const fila: Fila = {};
      columnas.forEach((columna, indice) => {
        fila[columna] = valores[indice] ?? null;
      });
      const clave = tabla === "usuarios" ? "email" : tabla === "sesiones" ? "token" : "id";
      const ya = clave === "id" && fila.id == null
        ? filas.find((existente) => existente.proyecto_id === fila.proyecto_id && existente.usuario_id === fila.usuario_id)
        : filas.find((existente) => existente[clave] === fila[clave]);
      if (!ya) filas.push(fila);
      return { rows: [] };
    }
    if (bajo.startsWith("update")) {
      const donde = igualdades(texto.slice(texto.toLowerCase().indexOf(" where ")), params);
      for (const fila of filas) {
        if (donde.every(([columna, valor]) => fila[columna] === valor)) {
          for (const [columna, valor] of igualdades(texto.slice(0, texto.toLowerCase().indexOf(" where ")), params)) {
            fila[columna] = valor;
          }
        }
      }
      return { rows: [] };
    }
    if (bajo.startsWith("select")) {
      if (/count\(\*\)/i.test(texto)) return { rows: [{ n: filas.length }] };
      const columnas = columnasSelect(texto, tabla);
      const donde = igualdades(texto, params);
      const elegidas = filas.filter((fila) => donde.every(([columna, valor]) => fila[columna] === valor));
      return { rows: elegidas.map((fila) => columnas.map((columna) => fila[columna] ?? null)) };
    }
    throw new Error(`consulta fuera del alta: ${texto}`);
  };
  const db = drizzleProxy(callback);
  return { consultas, almacen: crearAlmacenDesde(db as unknown as DbAlmacen) };
}

test("crear un evento y leerlo no nombra columnas ni tablas de 0010–0013", async () => {
  const { almacen, consultas } = ledgerSinMigrar();
  const antes = consultas.length;
  assert.deepEqual(await almacen.listarComunidades(), []);
  assert.equal(await almacen.leerComunidad("c1"), null);
  assert.equal(await almacen.leerComunidadPorCodigo("HYTO"), null);
  await almacen.crearComunidad({
    id: "c1",
    nombre: "Norte",
    descripcion: "",
    fotoUrl: null,
    visibilidad: "publica",
    codigo: "HYTO",
    creadoEn: new Date().toISOString(),
    creadorId: "org-1",
  });
  assert.deepEqual(await almacen.listarMiembrosComunidad("c1"), []);
  assert.deepEqual(await almacen.comunidadesDeUsuario("org-1"), []);
  assert.equal(await almacen.miembroComunidad("c1", "org-1"), null);
  await almacen.guardarMiembroComunidad({ comunidadId: "c1", usuarioId: "org-1", rol: "admin", creadoEn: new Date().toISOString() });
  assert.deepEqual(await almacen.listarSolicitudesComunidad("c1"), []);
  await almacen.crearSolicitudComunidad({
    id: "s1",
    comunidadId: "c1",
    usuarioId: "org-1",
    estado: "pendiente",
    creadoEn: new Date().toISOString(),
  });
  await almacen.actualizarSolicitudComunidad("s1", "aprobada");
  await almacen.fijarComunidadProyecto("p1", "c1");
  assert.deepEqual(await almacen.listarAvisosComunidad("c1"), []);
  await almacen.crearAvisoComunidad({
    id: "a1",
    comunidadId: "c1",
    tipo: "disponible",
    titulo: "Cajas",
    nombre: null,
    tareaId: null,
    creadoEn: new Date().toISOString(),
  });
  assert.equal(consultas.length, antes);

  const creado = await crearProyectoHttp(
    new Request("http://local/api/proyectos", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        nombre: "Feria",
        descripcion: "Puestos",
        tareas: [{ titulo: "Cajas", tipo: "trabajo", monto: "8" }],
      }),
    }),
    almacen,
    "org-1",
    { wallet: WALLET, leerSaldo: async () => ({ saldo: "100" }) },
  );
  assert.equal(creado.status, 201, consultas.join("\n"));
  const cuerpo = (await creado.json()) as { proyecto: { id: string; nombre: string } };
  assert.equal(cuerpo.proyecto.nombre, "Feria");

  await almacen.actualizarProyecto(cuerpo.proyecto.id, { descripcion: "Puestos del sábado" });

  const lectura = await leerProyectoHttp(almacen, { usuarioId: "org-1", demo: false });
  assert.equal(lectura.status, 200, consultas.join("\n"));
  const leido = (await lectura.json()) as { proyecto: { id: string; nombre: string }; tareas: { titulo: string }[] };
  assert.equal(leido.proyecto.id, cuerpo.proyecto.id);
  assert.equal(leido.proyecto.nombre, "Feria");
  assert.equal(leido.tareas[0]?.titulo, "Cajas");

  const sqlEmitido = consultas.join("\n");
  assert.doesNotMatch(sqlEmitido, COLUMNAS_NUEVAS);
  const alta = /insert into "proyectos" \(([^)]+)\)/i.exec(sqlEmitido)?.[1] ?? "";
  const columnas = alta.split(",").map((parte) => parte.trim().replace(/"/g, ""));
  assert.deepEqual(columnas.sort(), ["contexto_ia", "creado_en", "descripcion", "id", "nombre", "organizador_id"]);
});

test("un valor que no es on ignora comunidadId y no nombra las tablas nuevas", async () => {
  const valores = [undefined, "", "off", "OFF", "true", "yes", "1", "enabled", "onn", " onn "] as const;
  const previo = process.env.HYTO_COMUNIDADES;
  try {
    for (const valor of valores) {
      if (valor === undefined) delete process.env.HYTO_COMUNIDADES;
      else process.env.HYTO_COMUNIDADES = valor;
      const { almacen, consultas } = ledgerSinMigrar();
      const antes = consultas.length;
      assert.deepEqual(await almacen.listarComunidades(), []);
      assert.equal(await almacen.leerComunidad("c-ajena"), null);
      await almacen.fijarComunidadProyecto("p-no", "c-ajena");
      await almacen.crearAvisoComunidad({
        id: "a1",
        comunidadId: "c-ajena",
        tipo: "disponible",
        titulo: "Cajas",
        nombre: null,
        tareaId: null,
        creadoEn: new Date().toISOString(),
      });
      assert.equal(consultas.length, antes, String(valor));
      const creado = await crearProyectoHttp(
        new Request("http://local/api/proyectos", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            nombre: "Feria",
            comunidadId: "c-ajena",
            descripcion: "Puestos",
            tareas: [{ titulo: "Cajas", tipo: "trabajo", monto: "8" }],
          }),
        }),
        almacen,
        "org-1",
        { wallet: WALLET, leerSaldo: async () => ({ saldo: "100" }) },
      );
      assert.equal(creado.status, 201, `${valor}\n${consultas.join("\n")}`);
      const id = ((await creado.json()) as { proyecto: { id: string } }).proyecto.id;
      assert.equal((await almacen.leerProyecto(id))?.comunidadId ?? null, null);
      assert.doesNotMatch(
        consultas.join("\n"),
        /\b(comunidades|comunidad_miembros|comunidad_solicitudes|comunidad_avisos|comunidad_id)\b/,
      );
    }
  } finally {
    if (previo === undefined) delete process.env.HYTO_COMUNIDADES;
    else process.env.HYTO_COMUNIDADES = previo;
  }
});

test("el contexto para la IA se escribe y se lee en contexto_ia", async () => {
  const regla = "Only supermarket receipts count.";
  const { almacen, consultas } = ledgerSinMigrar();
  const creado = await crearProyectoHttp(
    new Request("http://local/api/proyectos", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        nombre: "Feria",
        contextoIa: `  ${regla}  `,
        tareas: [{ titulo: "Compras", tipo: "reembolso", monto: "15" }],
      }),
    }),
    almacen,
    "org-1",
  );
  assert.equal(creado.status, 201, consultas.join("\n"));
  const id = ((await creado.json()) as { proyecto: { id: string } }).proyecto.id;
  const guardado = await almacen.leerProyecto(id);
  assert.equal(guardado?.contextoIa, regla);
  assert.equal((await contextoParaRevision(almacen, id))?.contextoIa, regla);
  const sqlEmitido = consultas.join("\n");
  assert.match(sqlEmitido, /insert into "proyectos" \([\s\S]*?"contexto_ia"/);
  const lecturas = consultas.filter((consulta) => /\bselect\b/i.test(consulta) && /from "proyectos"/i.test(consulta));
  assert.ok(lecturas.some((consulta) => consulta.includes('"contexto_ia"')), lecturas.join("\n"));

  await almacen.actualizarProyecto(id, { contextoIa: "Only hardware receipts count." });
  assert.equal((await almacen.leerProyecto(id))?.contextoIa, "Only hardware receipts count.");
  assert.match(consultas.join("\n"), /update "proyectos" set "contexto_ia"/);
});

test("con comunidades encendidas el alta nombra comunidad_id", async () => {
  process.env.HYTO_COMUNIDADES = "on";
  try {
    const consultas: string[] = [];
    const db = drizzleProxy(async (consulta) => {
      consultas.push(consulta);
      return { rows: [] };
    });
    const almacen = crearAlmacenDesde(db as unknown as DbAlmacen);
    await almacen.crearProyecto(
      {
        id: "p",
        nombre: "Feria",
        creadoEn: new Date().toISOString(),
        organizadorId: null,
        comunidadId: "c1",
      },
      [],
    );
    assert.match(consultas[0] ?? "", /"comunidad_id"/);
  } finally {
    delete process.env.HYTO_COMUNIDADES;
  }
});
