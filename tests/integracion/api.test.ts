import "./aplicar-guardia";
import assert from "node:assert/strict";
import { afterEach, before, beforeEach, describe, test } from "node:test";
import { POST as sesionPost } from "../../app/api/sesion/route";
import { GET as tareasGet } from "../../app/api/tareas/route";
import { GET as proyectosGet, POST as proyectosPost } from "../../app/api/proyectos/route";
import { GET as informeGet } from "../../app/api/informe/route";
import { GET as revisionGet, POST as revisionPost } from "../../app/api/revision/[id]/route";
import { POST as evidenciasPost } from "../../app/api/evidencias/route";
import { GET as evidenciaGet } from "../../app/api/evidencias/[id]/route";
import { GET as fotoGet } from "../../app/api/evidencias/[id]/foto/route";
import { POST as firmaPost } from "../../app/api/firma/route";
import { POST as enviarPost } from "../../app/api/firma/enviar/route";
import { reiniciarLimite } from "../../lib/escrow/limite";
import { motivoSuiteSync } from "./guardia";
import { consulta, prepararSuite, soltar, tomar, usarAlmacen, usarFotos } from "./postgres";
import { cookieSesionPrueba } from "./sesion-prueba";

const CUENTA = `G${"A".repeat(55)}`;
const CONTRATO = `C${"A".repeat(55)}`;
const HASH = "ab".repeat(32);

const motivo = motivoSuiteSync();

type Json = Record<string, unknown>;

async function leer(respuesta: Response): Promise<Json> {
  return (await respuesta.json()) as Json;
}

function avisoDe(json: Json): string {
  return typeof json.aviso === "string" ? json.aviso : "";
}

function tokenCavos(email: string, claims: Record<string, unknown> = {}): string {
  const cuerpo = Buffer.from(JSON.stringify({ sub: "sub-prueba", email, ...claims })).toString("base64url");
  return `aaaa.${cuerpo}.bbbb`;
}

function cookieDe(respuesta: Response): string {
  const cruda = respuesta.headers.get("set-cookie") ?? "";
  const par = cruda.split(";")[0]?.trim() ?? "";
  if (!par.startsWith("hyto_sesion=")) throw new Error(`Sin cookie de sesión: ${cruda}`);
  return par;
}

async function entrar(email: string): Promise<Response> {
  return sesionPost(
    new Request("http://local/api/sesion", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, token: tokenCavos(email) }),
    }),
  );
}

function pedido(url: string, body: unknown, cookie?: string, extra?: HeadersInit): Request {
  const headers = new Headers(extra);
  if (!(body instanceof FormData)) headers.set("content-type", "application/json");
  if (cookie) headers.set("cookie", cookie);
  return new Request(url, {
    method: "POST",
    headers,
    body: body instanceof FormData ? body : typeof body === "string" ? body : JSON.stringify(body),
  });
}

function contexto(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

function pedidoRevision(id: string, cookie: string, method = "GET"): Request {
  return new Request(`http://local/api/revision/${id}`, { method, headers: { cookie } });
}

function pedirGet(url: string, cookie?: string): Request {
  return new Request(url, { headers: cookie ? { cookie } : {} });
}

async function duenoZeek(cookie: string): Promise<void> {
  await tareasGet(pedirGet("http://local/api/tareas", cookie));
  await consulta("update proyectos set organizador_id = 'organizador' where id = 'zeek' and organizador_id is null");
}

function proyectoNuevo() {
  return {
    nombre: "Feria",
    tareas: [
      { titulo: "Cajas", tipo: "trabajo", monto: "8", condicion: "Cajas cerradas", miembroId: "voluntario-2" },
      { titulo: "Comida extra", tipo: "reembolso", monto: "15", miembroId: "voluntario-1" },
    ],
  };
}

function fotoDe(tareaId: string, tipo = "image/jpeg", bytes = Uint8Array.from([1, 2, 3, 4])): FormData {
  const datos = new FormData();
  datos.set("tareaId", tareaId);
  datos.set("foto", new Blob([bytes], { type: tipo }), "evidencia.jpg");
  datos.set("wallet", CUENTA);
  return datos;
}

async function conFetch(impl: typeof fetch, trabajo: () => Promise<void>): Promise<void> {
  const previo = globalThis.fetch;
  globalThis.fetch = impl;
  try {
    await trabajo();
  } finally {
    globalThis.fetch = previo;
  }
}

describe("rutas de app/api contra Postgres local", { concurrency: false, skip: motivo }, () => {
  before(async () => {
    await prepararSuite();
  });

  beforeEach(async () => {
    await tomar();
    reiniciarLimite();
  });

  afterEach(async () => {
    await soltar();
  });

  test("la migración crea las tablas", async () => {
    const resultado = await consulta<{ table_name: string }>(
      "select table_name from information_schema.tables where table_schema = 'public'",
    );
    const nombres = resultado.rows.map((fila) => fila.table_name);
    for (const tabla of ["usuarios", "proyectos", "tareas", "evidencias", "veredictos", "sesiones"]) {
      assert.ok(nombres.includes(tabla), tabla);
    }
  });

  test("GET /api/tareas exige sesión y, con el dueño, devuelve la semilla de ZEEK", async () => {
    const anonima = await tareasGet(pedirGet("http://local/api/tareas"));
    assert.equal(anonima.status, 401);
    const sesion = await cookieSesionPrueba();
    await duenoZeek(sesion);
    const respuesta = await tareasGet(pedirGet("http://local/api/tareas", sesion));
    assert.equal(respuesta.status, 200);
    assert.match(respuesta.headers.get("content-type") ?? "", /json/);
    const json = (await leer(respuesta)) as { tareas?: { id: string; monto: string; tipo: string; tope: string | null }[] };
    assert.deepEqual(
      json.tareas?.map((tarea) => tarea.id),
      ["stand", "registro", "bienvenida", "comida"],
    );
    assert.equal(json.tareas?.[0]?.monto, "20");
    assert.equal(json.tareas?.[3]?.tipo, "reembolso");
    assert.equal(json.tareas?.[3]?.tope, "15");
  });

  test("GET /api/tareas sin base responde 503", async () => {
    usarAlmacen(async () => null);
    const respuesta = await tareasGet(pedirGet("http://local/api/tareas", "hyto_sesion=sin-base"));
    assert.equal(respuesta.status, 503);
    assert.equal(avisoDe(await leer(respuesta)), "The database is not configured.");
  });

  test("POST /api/sesion abre la sesión del organizador y la guarda", async () => {
    const respuesta = await entrar("organizador@demo.hyto");
    assert.equal(respuesta.status, 200);
    const json = await leer(respuesta);
    assert.equal(json.rol, "organizador");
    assert.equal(json.email, "organizador@demo.hyto");
    assert.equal(json.nombre, "Organizer");
    assert.match(respuesta.headers.get("set-cookie") ?? "", /hyto_sesion=/);
    const filas = await consulta<{ email: string; rol: string }>("select email, rol from sesiones");
    assert.equal(filas.rows.length, 1);
    assert.equal(filas.rows[0]?.email, "organizador@demo.hyto");
    assert.equal(filas.rows[0]?.rol, "organizador");
  });

  test("POST /api/sesion rechaza JSON inválido y un token que no coincide, y registra un correo nuevo", async () => {
    const noJson = await sesionPost(pedido("http://local/api/sesion", "{"));
    assert.equal(noJson.status, 400);
    assert.equal(avisoDe(await leer(noJson)), "The body is not JSON.");

    const sinCorreo = await sesionPost(pedido("http://local/api/sesion", { token: tokenCavos("organizador@demo.hyto") }));
    assert.equal(sinCorreo.status, 400);
    assert.equal(avisoDe(await leer(sinCorreo)), "Could not confirm sign-in.");

    const otro = await sesionPost(
      pedido("http://local/api/sesion", {
        email: "organizador@demo.hyto",
        token: tokenCavos("otro@demo.hyto"),
      }),
    );
    assert.equal(otro.status, 400);
    assert.equal(avisoDe(await leer(otro)), "Could not confirm sign-in.");

    const vacio = await consulta("select token from sesiones");
    assert.equal(vacio.rowCount, 0);

    const ajeno = await entrar("nadie@demo.hyto");
    assert.equal(ajeno.status, 200);
    const json = await leer(ajeno);
    assert.equal(json.rol, "voluntario");
    assert.equal(json.email, "nadie@demo.hyto");
    assert.equal(json.nombre, "nadie");
    assert.match(String(json.usuarioId), /^u-/);
    const sesiones = await consulta<{ email: string; rol: string }>("select email, rol from sesiones");
    assert.equal(sesiones.rows.length, 1);
    assert.equal(sesiones.rows[0]?.email, "nadie@demo.hyto");
    assert.equal(sesiones.rows[0]?.rol, "voluntario");
    const usuarios = await consulta<{ email: string; rol: string; nombre: string }>(
      "select email, rol, nombre from usuarios where email = $1",
      ["nadie@demo.hyto"],
    );
    assert.equal(usuarios.rowCount, 1);
    assert.equal(usuarios.rows[0]?.rol, "voluntario");
    assert.equal(usuarios.rows[0]?.nombre, "nadie");
  });

  test("un segundo ingreso del mismo correo no duplica el usuario ni cambia roles", async () => {
    const primero = await entrar("nueva@demo.hyto");
    assert.equal(primero.status, 200);
    const primeroJson = await leer(primero);
    assert.equal(primeroJson.rol, "voluntario");

    const segundo = await entrar("nueva@demo.hyto");
    assert.equal(segundo.status, 200);
    const segundoJson = await leer(segundo);
    assert.equal(segundoJson.rol, "voluntario");
    assert.equal(segundoJson.usuarioId, primeroJson.usuarioId);

    const usuarios = await consulta<{ id: string; rol: string }>("select id, rol from usuarios where email = $1", [
      "nueva@demo.hyto",
    ]);
    assert.equal(usuarios.rowCount, 1);
    assert.equal(usuarios.rows[0]?.id, primeroJson.usuarioId);
    assert.equal(usuarios.rows[0]?.rol, "voluntario");

    const org = await entrar("organizador@demo.hyto");
    assert.equal(org.status, 200);
    assert.equal((await leer(org)).rol, "organizador");
    const filasOrg = await consulta<{ rol: string }>("select rol from usuarios where email = $1", ["organizador@demo.hyto"]);
    assert.equal(filasOrg.rowCount, 1);
    assert.equal(filasOrg.rows[0]?.rol, "organizador");
  });

  test("POST /api/proyectos crea el proyecto con la sesión del organizador y GET devuelve el último", async () => {
    const sesion = await cookieSesionPrueba();
    const creado = await proyectosPost(pedido("http://local/api/proyectos", proyectoNuevo(), sesion));
    assert.equal(creado.status, 201);
    const json = (await leer(creado)) as {
      proyecto?: { nombre?: string };
      tareas?: { titulo: string; tipo: string; tope: string | null; estado: string; monto: string }[];
    };
    assert.equal(json.proyecto?.nombre, "Feria");
    const reembolso = json.tareas?.find((tarea) => tarea.tipo === "reembolso");
    const trabajo = json.tareas?.find((tarea) => tarea.tipo === "trabajo");
    assert.equal(trabajo?.titulo, "Cajas");
    assert.equal(trabajo?.estado, "pendiente");
    assert.equal(trabajo?.tope, null);
    assert.equal(reembolso?.tope, "15");
    assert.equal(reembolso?.monto, "15");

    await duenoZeek(sesion);
    const lectura = await proyectosGet(pedirGet("http://local/api/proyectos", sesion));
    assert.equal(lectura.status, 200);
    const actual = (await leer(lectura)) as { proyecto?: { nombre?: string }; tareas?: { titulo: string }[] };
    assert.equal(actual.proyecto?.nombre, "Feria");
    assert.deepEqual(
      actual.tareas?.map((tarea) => tarea.titulo),
      ["Cajas", "Comida extra"],
    );

    const tareas = (await leer(await tareasGet(pedirGet("http://local/api/tareas", sesion)))) as { tareas?: { titulo: string }[] };
    assert.equal(tareas.tareas?.some((tarea) => tarea.titulo === "Cajas"), true);
    assert.equal(tareas.tareas?.some((tarea) => tarea.titulo === "Set up the booth"), true);
  });

  test("POST /api/proyectos rechaza cuerpo inválido y tarea sin monto", async () => {
    const sesion = await cookieSesionPrueba();
    await proyectosGet(pedirGet("http://local/api/proyectos", sesion));
    const noJson = await proyectosPost(pedido("http://local/api/proyectos", "{", sesion));
    assert.equal(noJson.status, 400);
    assert.equal(avisoDe(await leer(noJson)), "The body is not JSON.");

    const vacio = await proyectosPost(pedido("http://local/api/proyectos", { nombre: "Feria", tareas: [] }, sesion));
    assert.equal(vacio.status, 400);
    assert.equal(avisoDe(await leer(vacio)), "Enter a name and at least one task with an amount.");

    const sinMonto = await proyectosPost(
      pedido("http://local/api/proyectos", {
        nombre: "Feria",
        tareas: [{ titulo: "Cajas", tipo: "trabajo", monto: "0" }],
      }, sesion),
    );
    assert.equal(sinMonto.status, 400);

    const tipo = await proyectosPost(
      pedido("http://local/api/proyectos", {
        nombre: "Feria",
        tareas: [{ titulo: "Cajas", tipo: "otro", monto: "8" }],
      }, sesion),
    );
    assert.equal(tipo.status, 400);
    const filas = await consulta<{ nombre: string }>("select nombre from proyectos");
    assert.deepEqual(
      filas.rows.map((fila) => fila.nombre),
      ["ZEEK"],
    );
  });

  test("GET /api/informe abre ZEEK sin hash y la bandeja sigue vacía hasta la evidencia", async () => {
    const sesion = await cookieSesionPrueba();
    await duenoZeek(sesion);
    const respuesta = await informeGet(pedirGet("http://local/api/informe", sesion));
    assert.equal(respuesta.status, 200);
    const json = (await leer(respuesta)) as {
      nombre?: string;
      ejemplo?: boolean;
      bandeja?: unknown[];
      resumen?: { presupuesto: string; pagado: string };
      tareas?: { id: string; estado: string; hashPago: string | null }[];
    };
    assert.equal(json.nombre, "ZEEK");
    assert.equal(json.ejemplo, false);
    assert.equal(json.resumen?.presupuesto, "75");
    assert.equal(json.resumen?.pagado, "0");
    assert.equal(json.bandeja?.length, 0);
    assert.equal(json.tareas?.every((tarea) => tarea.estado === "pendiente" && tarea.hashPago === null), true);
  });

  test("GET /api/informe muestra el hash cuando la tarea ya está pagada", async () => {
    const sesion = await cookieSesionPrueba();
    await duenoZeek(sesion);
    await consulta("update tareas set hash_pago = $1, estado = 'pagado' where id = 'stand'", [HASH]);
    const json = (await leer(await informeGet(pedirGet("http://local/api/informe", sesion)))) as {
      resumen?: { pagado: string };
      tareas?: { id: string; hashPago: string | null; estado: string }[];
    };
    assert.equal(json.tareas?.find((tarea) => tarea.id === "stand")?.hashPago, HASH);
    assert.equal(json.tareas?.find((tarea) => tarea.id === "stand")?.estado, "pagado");
    assert.equal(json.resumen?.pagado, "20");
  });

  test("GET /api/revision/:id devuelve la tarea y 404 si no existe", async () => {
    const sesion = await cookieSesionPrueba();
    await duenoZeek(sesion);
    const ok = await revisionGet(pedidoRevision("stand", sesion), contexto("stand"));
    assert.equal(ok.status, 200);
    const json = (await leer(ok)) as {
      tarea?: { id: string; veredicto: string | null; estado: string };
      foto?: string | null;
      enlacePago?: string | null;
    };
    assert.equal(json.tarea?.id, "stand");
    assert.equal(json.tarea?.estado, "pendiente");
    assert.equal(json.tarea?.veredicto, null);
    assert.equal(json.foto, null);
    assert.equal(json.enlacePago, null);

    const falta = await revisionGet(pedidoRevision("no-existe", sesion), contexto("no-existe"));
    assert.equal(falta.status, 404);
    assert.equal(avisoDe(await leer(falta)), "We couldn't find that task.");
  });

  test("POST /api/evidencias guarda la foto, deja el error de la IA y GET la lee", async () => {
    const sesion = await cookieSesionPrueba();
    await duenoZeek(sesion);
    const creada = await evidenciasPost(pedido("http://local/api/evidencias", fotoDe("comida"), sesion));
    assert.equal(creada.status, 201);
    const json = (await leer(creada)) as { evidencia?: { id: string; monto: string | null; fecha: string | null; tareaId: string } };
    const id = json.evidencia?.id ?? "";
    assert.equal(json.evidencia?.monto, null);
    assert.equal(json.evidencia?.fecha, null);
    assert.equal(json.evidencia?.tareaId, "comida");

    const tarea = await consulta<{ estado: string; wallet_cobro: string }>(
      "select estado, wallet_cobro from tareas where id = 'comida'",
    );
    assert.equal(tarea.rows[0]?.estado, "en revisión");
    assert.equal(tarea.rows[0]?.wallet_cobro, CUENTA);

    const lectura = await evidenciaGet(pedirGet(`http://local/api/evidencias/${id}`, sesion), contexto(id));
    assert.equal(lectura.status, 200);
    const leida = (await leer(lectura)) as { evidencia?: { monto: string | null } };
    assert.equal(leida.evidencia?.monto, null);

    await duenoZeek(sesion);
    const foto = await fotoGet(pedirGet(`http://local/api/evidencias/${id}/foto`, sesion), contexto(id));
    assert.equal(foto.status, 200);
    assert.equal(foto.headers.get("content-type"), "image/jpeg");
    assert.equal((await foto.arrayBuffer()).byteLength, 4);

    const revision = await revisionGet(pedidoRevision("comida", sesion), contexto("comida"));
    const vista = (await leer(revision)) as {
      tarea?: { veredicto: string | null; estado: string; frase: string; origen: string; codigo: string | null };
      foto?: string;
    };
    assert.equal(vista.tarea?.veredicto, null);
    assert.equal(vista.tarea?.origen, "error");
    assert.equal(vista.tarea?.codigo, "sin_clave");
    assert.equal(vista.tarea?.estado, "en revisión");
    assert.match(vista.tarea?.frase ?? "", /not configured/);
    assert.equal(vista.foto, `/api/evidencias/${id}/foto`);

    const informe = (await leer(await informeGet(pedirGet("http://local/api/informe", sesion)))) as {
      bandeja?: { id: string; veredicto: string | null; origen: string | null }[];
    };
    assert.equal(informe.bandeja?.some((tarea) => tarea.id === "comida" && tarea.veredicto === null && tarea.origen === "error"), true);
  });

  test("POST /api/revision/:id vuelve a revisar y GET conserva el veredicto guardado", async () => {
    const sesion = await cookieSesionPrueba();
    const voluntario = await cookieSesionPrueba("voluntario");
    await duenoZeek(sesion);
    const creada = await evidenciasPost(
      pedido("http://local/api/evidencias", fotoDe("stand", "image/png", Uint8Array.from([9])), voluntario),
    );
    const id = ((await leer(creada)) as { evidencia?: { id: string } }).evidencia?.id ?? "";
    await consulta(
      "update veredictos set veredicto = 'insuficiente', frase = 'cambiado', origen = 'scout' where evidencia_id = $1",
      [id],
    );

    const lectura = await revisionGet(pedidoRevision("stand", sesion), contexto("stand"));
    const guardado = (await leer(lectura)) as { tarea?: { veredicto: string; frase: string } };
    assert.equal(guardado.tarea?.veredicto, "insuficiente");
    assert.equal(guardado.tarea?.frase, "cambiado");

    const ajena = await revisionPost(pedidoRevision("stand", voluntario, "POST"), contexto("stand"));
    assert.equal(ajena.status, 403);
    assert.equal(avisoDe(await leer(ajena)), "Only the organizer reviews.");

    const forzada = await revisionPost(pedidoRevision("stand", sesion, "POST"), contexto("stand"));
    assert.equal(forzada.status, 200);
    const otra = (await leer(forzada)) as {
      tarea?: { veredicto: string | null; frase: string; origen: string; codigo: string | null };
      enlacePago?: string | null;
    };
    assert.equal(otra.tarea?.veredicto, "insuficiente");
    assert.equal(otra.tarea?.frase, "cambiado");
    assert.equal(otra.tarea?.origen, "scout");
    assert.equal(otra.enlacePago, null);

    await consulta("update veredictos set origen = 'error', frase = 'La IA no está configurada' where evidencia_id = $1", [id]);
    const reintento = await revisionPost(pedidoRevision("stand", sesion, "POST"), contexto("stand"));
    assert.equal(reintento.status, 200);
    const fallida = (await leer(reintento)) as { tarea?: { origen: string; codigo: string | null; frase: string } };
    assert.equal(fallida.tarea?.origen, "error");
    assert.equal(fallida.tarea?.codigo, "sin_clave");
    assert.match(fallida.tarea?.frase ?? "", /not configured/);

    const falta = await revisionPost(pedidoRevision("no-existe", sesion, "POST"), contexto("no-existe"));
    assert.equal(falta.status, 404);
  });

  test("POST /api/evidencias rechaza entrada inválida, tarea ajena y foto enorme", async () => {
    const sesion = await cookieSesionPrueba();
    const noLlego = await evidenciasPost(
      new Request("http://local/api/evidencias", {
        method: "POST",
        body: "hola",
        headers: { "content-type": "text/plain", cookie: sesion },
      }),
    );
    assert.equal(noLlego.status, 400);
    assert.equal(avisoDe(await leer(noLlego)), "The photo did not arrive.");

    const incompleta = new FormData();
    incompleta.set("tareaId", "stand");
    const sinFoto = await evidenciasPost(pedido("http://local/api/evidencias", incompleta, sesion));
    assert.equal(sinFoto.status, 400);
    assert.equal(avisoDe(await leer(sinFoto)), "The task and the photo are missing.");

    const texto = new FormData();
    texto.set("tareaId", "stand");
    texto.set("foto", new Blob(["hola"], { type: "text/plain" }), "nota.txt");
    const noImagen = await evidenciasPost(pedido("http://local/api/evidencias", texto, sesion));
    assert.equal(noImagen.status, 400);
    assert.equal(avisoDe(await leer(noImagen)), "Choose a photo.");

    const ajena = await evidenciasPost(pedido("http://local/api/evidencias", fotoDe("no-existe"), sesion));
    assert.equal(ajena.status, 404);
    assert.equal(avisoDe(await leer(ajena)), "We couldn't find that task.");

    const grande = new FormData();
    grande.set("tareaId", "stand");
    grande.set("foto", new Blob([new Uint8Array(8_000_001)], { type: "image/jpeg" }), "grande.jpg");
    const pesada = await evidenciasPost(pedido("http://local/api/evidencias", grande, sesion));
    assert.equal(pesada.status, 413);
    assert.equal(avisoDe(await leer(pesada)), "The photo is too large.");
  });

  test("GET /api/evidencias/:id y la foto responden 404 si no están", async () => {
    const sesion = await cookieSesionPrueba();
    const evidencia = await evidenciaGet(pedirGet("http://local/api/evidencias/no-existe", sesion), contexto("no-existe"));
    assert.equal(evidencia.status, 404);
    assert.equal(avisoDe(await leer(evidencia)), "We couldn't find that evidence.");

    const foto = await fotoGet(pedirGet("http://local/api/evidencias/no-existe/foto", sesion), contexto("no-existe"));
    assert.equal(foto.status, 404);
  });

  test("las rutas de evidencia sin almacén de fotos responden 503", async () => {
    const sesion = await cookieSesionPrueba();
    usarFotos(() => null);
    const creada = await evidenciasPost(pedido("http://local/api/evidencias", fotoDe("stand"), sesion));
    assert.equal(creada.status, 503);
    assert.equal(avisoDe(await leer(creada)), "Photo storage is not configured.");

    await duenoZeek(sesion);
    const id = "ev-prueba";
    await consulta(
      "insert into evidencias (id, tarea_id, blob_id, creada_en) values ($1, 'stand', 'blob-inexistente', $2)",
      [id, new Date().toISOString()],
    );
    const foto = await fotoGet(pedirGet(`http://local/api/evidencias/${id}/foto`, sesion), contexto(id));
    assert.equal(foto.status, 503);
  });

  test("POST /api/firma y /api/firma/enviar exigen sesión de organizador", async () => {
    const sinFirma = await firmaPost(pedido("http://local/api/firma", {}));
    assert.equal(sinFirma.status, 401);
    assert.equal(avisoDe(await leer(sinFirma)), "Sign in to continue.");

    const sinEnvio = await enviarPost(pedido("http://local/api/firma/enviar", {}));
    assert.equal(sinEnvio.status, 401);

    const ajena = await firmaPost(pedido("http://local/api/firma", {}, "hyto_sesion=token-que-no-existe"));
    assert.equal(ajena.status, 401);

    const voluntario = cookieDe(await entrar("voluntario1@demo.hyto"));
    const prohibida = await firmaPost(pedido("http://local/api/firma", {}, voluntario));
    assert.equal(prohibida.status, 403);
    assert.equal(avisoDe(await leer(prohibida)), "Only the organizer prepares the payment.");
    const envioProhibido = await enviarPost(pedido("http://local/api/firma/enviar", { xdr: "AAAA" }, voluntario));
    assert.equal(envioProhibido.status, 403);

    const organizador = cookieDe(await entrar("organizador@demo.hyto"));
    const token = decodeURIComponent(organizador.slice("hyto_sesion=".length));
    await consulta("update sesiones set expira_en = '2000-01-01T00:00:00.000Z' where token = $1", [token]);
    const vencida = await firmaPost(pedido("http://local/api/firma", {}, organizador));
    assert.equal(vencida.status, 401);
    assert.equal(avisoDe(await leer(vencida)), "Sign in to continue.");
  });

  test("POST /api/firma rechaza el cuerpo y prepara el XDR del organizador sin salir a la red", async () => {
    const cookie = cookieDe(await entrar("organizador@demo.hyto"));
    const noJson = await firmaPost(pedido("http://local/api/firma", "{", cookie));
    assert.equal(noJson.status, 400);
    assert.equal(avisoDe(await leer(noJson)), "The body is not JSON.");

    const accion = await firmaPost(pedido("http://local/api/firma", { accion: "borrar" }, cookie));
    assert.equal(accion.status, 400);
    assert.equal(avisoDe(await leer(accion)), "That action does not prepare a payment.");

    const liberar = await firmaPost(
      pedido("http://local/api/firma", { accion: "liberar", contrato: CONTRATO, firmante: CUENTA, indice: 0 }, cookie),
    );
    assert.equal(liberar.status, 400);
    assert.equal(avisoDe(await leer(liberar)), "In v2, approving already releases the milestone.");

    const grande = await firmaPost(
      pedido("http://local/api/firma", {}, cookie, { "content-length": "200001" }),
    );
    assert.equal(grande.status, 413);
    assert.equal(avisoDe(await leer(grande)), "The body is too large.");

    const sinClave = await firmaPost(
      pedido("http://local/api/firma", { accion: "aprobar", contrato: CONTRATO, firmante: CUENTA, indice: 0 }, cookie),
    );
    assert.equal(sinClave.status, 503);
    assert.equal(avisoDe(await leer(sinClave)), "The Trustless Work key is missing on the server.");

    process.env.TRUSTLESS_API_KEY = "clave-prueba";
    let destino = "";
    try {
      await conFetch(async (input) => {
        destino = String(input);
        if (!destino.startsWith("https://beta.api.trustlesswork.com/")) throw new Error(`fetch inesperado: ${destino}`);
        return Response.json({ unsignedXdr: "XDR-PRUEBA", txHash: "hash-preparado", contractId: CONTRATO });
      }, async () => {
        const lista = await firmaPost(
          pedido("http://local/api/firma", { accion: "aprobar", contrato: CONTRATO, firmante: CUENTA, indice: 0 }, cookie),
        );
        assert.equal(lista.status, 200);
        const json = await leer(lista);
        assert.equal(json.xdr, "XDR-PRUEBA");
        assert.equal(json.hashPreparado, "hash-preparado");
        assert.equal(json.contrato, CONTRATO);
      });
    } finally {
      delete process.env.TRUSTLESS_API_KEY;
    }
    assert.equal(destino, "https://beta.api.trustlesswork.com/escrow/multi-release/v2/approve-and-release-milestones");
  });

  test("POST /api/firma/enviar rechaza el XDR y devuelve el hash simulado", async () => {
    const cookie = cookieDe(await entrar("organizador@demo.hyto"));
    const noJson = await enviarPost(pedido("http://local/api/firma/enviar", "{", cookie));
    assert.equal(noJson.status, 400);
    assert.equal(avisoDe(await leer(noJson)), "The body is not JSON.");

    const falta = await enviarPost(pedido("http://local/api/firma/enviar", { xdr: "   " }, cookie));
    assert.equal(falta.status, 400);
    assert.equal(avisoDe(await leer(falta)), "The signed XDR is missing.");

    const largo = await enviarPost(pedido("http://local/api/firma/enviar", { xdr: "A".repeat(100_001) }, cookie));
    assert.equal(largo.status, 400);
    assert.equal(avisoDe(await leer(largo)), "The signed XDR is too long.");

    process.env.TRUSTLESS_API_KEY = "clave-prueba";
    try {
      await conFetch(async (input) => {
        const destino = String(input);
        if (destino !== "https://beta.api.trustlesswork.com/stellar/send-transaction") {
          throw new Error(`fetch inesperado: ${destino}`);
        }
        return Response.json({ status: "SUCCESS", txHash: HASH, ledger: 42, contractId: CONTRATO });
      }, async () => {
        const enviada = await enviarPost(pedido("http://local/api/firma/enviar", { xdr: "AAAA" }, cookie));
        assert.equal(enviada.status, 200);
        const json = await leer(enviada);
        assert.equal(json.hash, HASH);
        assert.equal(json.ledger, 42);
        assert.equal(json.estado, "SUCCESS");
        assert.equal(json.contrato, CONTRATO);
      });
    } finally {
      delete process.env.TRUSTLESS_API_KEY;
    }

    const pago = await consulta<{ hash_pago: string | null }>("select hash_pago from tareas");
    assert.equal(pago.rows.every((fila) => fila.hash_pago === null), true);
  });

  test("POST /api/firma/enviar corta el exceso de solicitudes", async () => {
    const cookie = cookieDe(await entrar("organizador@demo.hyto"));
    let ultimo = 0;
    for (let i = 0; i < 31; i += 1) {
      const respuesta = await enviarPost(
        pedido("http://local/api/firma/enviar", {}, cookie, { "x-forwarded-for": "203.0.113.9" }),
      );
      ultimo = respuesta.status;
      if (i < 30) assert.equal(respuesta.status, 400);
    }
    assert.equal(ultimo, 429);
  });
});
