import assert from "node:assert/strict";
import test from "node:test";
import { GET as leerEscrowHttp } from "../../app/api/escrow/[contrato]/route";
import { POST as crearProyecto } from "../../app/api/proyectos/route";
import { GET as leerRevision, POST as forzarRevision } from "../../app/api/revision/[id]/route";
import { POST as prepararFirma } from "../../app/api/firma/route";
import type { Almacen } from "../db/almacen";
import { crearFotosMemoria } from "../blob/fotos";
import { crearMemoria } from "../db/memoria";
import { asegurarSemilla } from "../db/semilla";
import { reiniciarLimite } from "../escrow/limite";
import { usarLectorSaldo } from "../escrow/saldo";
import { AVISO_PROYECTO_DEMO } from "../sesion/demo";
import { INTENTOS_REVISION } from "../revision/reintento";
import { reiniciarCandadosRevision } from "./revision";
import { crearProyectoHttp } from "./proyectos";

const CONTRATO = "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

type Gancho = () => Promise<Almacen | null>;

function gancho(): Gancho | undefined {
  return (globalThis as typeof globalThis & { __HYTO_ALMACEN_PRUEBA?: Gancho }).__HYTO_ALMACEN_PRUEBA;
}

function usar(almacen: Almacen): void {
  (globalThis as typeof globalThis & { __HYTO_ALMACEN_PRUEBA?: Gancho }).__HYTO_ALMACEN_PRUEBA = async () => almacen;
}

function cookie(token: string): string {
  return `hyto_sesion=${token}`;
}

test("POST /api/proyectos rechaza el demo y la petición sin sesión", async () => {
  const almacen = crearMemoria();
  const expiraEn = new Date(Date.now() + 60_000).toISOString();
  await almacen.crearSesion({
    token: "demo-org",
    email: "demo-organizador@hyto.demo",
    usuarioId: "demo-organizador",
    rol: "organizador",
    expiraEn,
    wallet: "",
  });
  await almacen.crearSesion({
    token: "demo-vol",
    email: "persona@ejemplo.com",
    usuarioId: "demo-voluntario",
    rol: "voluntario",
    expiraEn,
    wallet: "",
  });
  await almacen.crearSesion({
    token: "demo-correo",
    email: "demo-voluntario@hyto.demo",
    usuarioId: "otra-persona",
    rol: "voluntario",
    expiraEn,
    wallet: "",
  });
  await almacen.crearSesion({
    token: "real",
    email: "ana@hyto.app",
    usuarioId: "ana",
    rol: "voluntario",
    expiraEn,
    wallet: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
  });
  const anterior = gancho();
  usarLectorSaldo(async () => ({ saldo: "1000" }));
  usar(almacen);
  const cuerpo = JSON.stringify({ nombre: "Basura", tareas: [{ titulo: "Nada", tipo: "trabajo", monto: "1" }] });
  function pedido(token?: string): Request {
    return new Request("http://local/api/proyectos", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(token ? { cookie: cookie(token) } : {}),
      },
      body: cuerpo,
    });
  }
  try {
    const sinSesion = await crearProyecto(pedido());
    assert.equal(sinSesion.status, 401);
    assert.equal(((await sinSesion.json()) as { aviso: string }).aviso, "Sign in to continue.");

    for (const token of ["demo-org", "demo-vol", "demo-correo"]) {
      const demo = await crearProyecto(pedido(token));
      assert.equal(demo.status, 403);
      assert.equal(((await demo.json()) as { aviso: string }).aviso, AVISO_PROYECTO_DEMO);
    }
    assert.equal((await almacen.listarProyectos()).some((proyecto) => proyecto.nombre === "Basura"), false);

    const real = await crearProyecto(pedido("real"));
    assert.equal(real.status, 201);
    assert.equal((await almacen.listarProyectos()).find((proyecto) => proyecto.nombre === "Basura")?.organizadorId, "ana");
  } finally {
    usarLectorSaldo(null);
    (globalThis as typeof globalThis & { __HYTO_ALMACEN_PRUEBA?: Gancho }).__HYTO_ALMACEN_PRUEBA = anterior;
  }
});

test("quien crea el proyecto es su organizador aunque su rol sea voluntario", async () => {
  const almacen = crearMemoria();
  const respuesta = await crearProyectoHttp(
    new Request("http://local/api/proyectos", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        nombre: "Feria",
        tareas: [{ titulo: "Cajas", tipo: "trabajo", monto: "8" }],
      }),
    }),
    almacen,
    "voluntario-1",
  );
  assert.equal(respuesta.status, 201);
  const proyecto = await almacen.ultimoProyecto();
  assert.equal(proyecto?.organizadorId, "voluntario-1");
  assert.equal(proyecto?.nombre, "Feria");
  const tareas = (await almacen.listarTareas()).filter((tarea) => tarea.proyectoId === proyecto?.id);
  assert.equal(tareas.length, 1);
  assert.equal(await almacen.leerProyecto("zeek"), null);
});

test("quien no organiza el proyecto recibe 403 en escrow, revisión y firma", async () => {
  reiniciarLimite();
  const almacen = crearMemoria();
  await asegurarSemilla(almacen);
  await almacen.asignarOrganizador("zeek", "organizador");
  await almacen.actualizarTarea("stand", { contratoEscrow: CONTRATO });
  const expiraEn = new Date(Date.now() + 60_000).toISOString();
  await almacen.crearSesion({
    token: "dueño",
    email: "voluntario1@demo.hyto",
    usuarioId: "voluntario-1",
    rol: "voluntario",
    expiraEn,
    wallet: "",
  });
  await almacen.crearSesion({
    token: "ajeno",
    email: "voluntario2@demo.hyto",
    usuarioId: "voluntario-2",
    rol: "voluntario",
    expiraEn,
    wallet: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
  });
  await almacen.crearSesion({
    token: "global",
    email: "organizador@demo.hyto",
    usuarioId: "organizador",
    rol: "organizador",
    expiraEn,
    wallet: "",
  });
  const creado = await crearProyectoHttp(
    new Request("http://local/api/proyectos", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ nombre: "Feria", tareas: [{ titulo: "Cajas", tipo: "trabajo", monto: "8" }] }),
    }),
    almacen,
    "voluntario-1",
  );
  const tareaId = ((await creado.json()) as { tareas: { id: string }[] }).tareas[0]?.id ?? "";
  const anterior = gancho();
  const clave = process.env.TRUSTLESS_API_KEY;
  process.env.TRUSTLESS_API_KEY = "clave-de-prueba";
  usar(almacen);
  usarLectorSaldo(async () => ({ saldo: "1000" }));
  let llamadas = 0;
  const original = globalThis.fetch;
  globalThis.fetch = async () => {
    llamadas += 1;
    return new Response(JSON.stringify({ contractId: CONTRATO, balance: 0 }), { status: 200 });
  };
  try {
    const contexto = { params: Promise.resolve({ id: tareaId }) };
    const revisionAjena = await leerRevision(new Request("http://local/api/revision/" + tareaId, { headers: { cookie: cookie("ajeno") } }), contexto);
    assert.equal(revisionAjena.status, 403);
    const forzada = await forzarRevision(
      new Request("http://local/api/revision/" + tareaId, { method: "POST", headers: { cookie: cookie("ajeno") } }),
      contexto,
    );
    assert.equal(forzada.status, 403);
    const propia = await leerRevision(new Request("http://local/api/revision/" + tareaId, { headers: { cookie: cookie("dueño") } }), contexto);
    assert.equal(propia.status, 200);

    const stand = { params: Promise.resolve({ id: "stand" }) };
    const zeekAjeno = await leerRevision(new Request("http://local/api/revision/stand", { headers: { cookie: cookie("dueño") } }), stand);
    assert.equal(zeekAjeno.status, 403);
    assert.equal(llamadas, 0);
    const zeekGlobal = await leerRevision(new Request("http://local/api/revision/stand", { headers: { cookie: cookie("global") } }), stand);
    assert.equal(zeekGlobal.status, 200);
    // The organizer's read checks the stored escrow once for a release that landed without a saved hash.
    assert.equal(llamadas, 1);
    llamadas = 0;
    const fantasma = await leerRevision(
      new Request("http://local/api/revision/hyto-sin-tarea", { headers: { cookie: cookie("global") } }),
      { params: Promise.resolve({ id: "hyto-sin-tarea" }) },
    );
    assert.equal(fantasma.status, 404);
    const fantasmaAjeno = await leerRevision(
      new Request("http://local/api/revision/hyto-sin-tarea", { headers: { cookie: cookie("ajeno") } }),
      { params: Promise.resolve({ id: "hyto-sin-tarea" }) },
    );
    assert.equal(fantasmaAjeno.status, 403);

    const escrowAjeno = await leerEscrowHttp(new Request(`http://local/api/escrow/${CONTRATO}`, { headers: { cookie: cookie("ajeno") } }), {
      params: Promise.resolve({ contrato: CONTRATO }),
    });
    assert.equal(escrowAjeno.status, 403);
    assert.equal(llamadas, 0);
    const escrowPropio = await leerEscrowHttp(new Request(`http://local/api/escrow/${CONTRATO}`, { headers: { cookie: cookie("global") } }), {
      params: Promise.resolve({ contrato: CONTRATO }),
    });
    assert.equal(escrowPropio.status, 200);
    assert.equal(llamadas, 1);

    const firmaAjena = await prepararFirma(
      new Request("http://local/api/firma", {
        method: "POST",
        headers: { cookie: cookie("ajeno"), "content-type": "application/json" },
        body: JSON.stringify({ accion: "desplegar", tareaId }),
      }),
    );
    assert.equal(firmaAjena.status, 403);
    const firmaFondeo = await prepararFirma(
      new Request("http://local/api/firma", {
        method: "POST",
        headers: { cookie: cookie("dueño"), "content-type": "application/json" },
        body: JSON.stringify({
          accion: "fondear",
          contrato: CONTRATO,
          firmante: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
          monto: 1,
        }),
      }),
    );
    assert.equal(firmaFondeo.status, 403);
    const alta = await crearProyecto(
      new Request("http://local/api/proyectos", {
        method: "POST",
        headers: { cookie: cookie("ajeno"), "content-type": "application/json" },
        body: JSON.stringify({ nombre: "Otra", tareas: [{ titulo: "Mesas", tipo: "trabajo", monto: "4" }] }),
      }),
    );
    assert.equal(alta.status, 201);
    assert.equal((await almacen.listarProyectos()).find((proyecto) => proyecto.nombre === "Otra")?.organizadorId, "voluntario-2");
  } finally {
    usarLectorSaldo(null);
    globalThis.fetch = original;
    (globalThis as typeof globalThis & { __HYTO_ALMACEN_PRUEBA?: Gancho }).__HYTO_ALMACEN_PRUEBA = anterior;
    if (clave === undefined) delete process.env.TRUSTLESS_API_KEY;
    else process.env.TRUSTLESS_API_KEY = clave;
    reiniciarLimite();
  }
});

test("el reintento solo corre si quien llama organiza ese proyecto", async () => {
  reiniciarCandadosRevision();
  const almacen = crearMemoria();
  await asegurarSemilla(almacen);
  await almacen.asignarOrganizador("zeek", "organizador");
  const fotos = crearFotosMemoria();
  const blobId = await fotos.guardar("evidencia.jpg", new Blob([Uint8Array.from([1])], { type: "image/jpeg" }));
  const evidenciaId = "foto-stand";
  await almacen.crearEvidencia({
    id: evidenciaId,
    tareaId: "stand",
    blobId,
    monto: null,
    montoConfirmado: null,
    fecha: null,
    creadaEn: "2099-01-01T00:00:00.000Z",
  });
  await almacen.actualizarTarea("stand", { estado: "en revisión" });
  await almacen.guardarVeredicto({
    id: evidenciaId,
    evidenciaId,
    tareaId: "stand",
    veredicto: "insuficiente",
    frase: "La IA no respondió a tiempo",
    textoScout: "La IA no respondió a tiempo",
    choice: "tiempo",
    noul: "no",
    score: "error",
    origen: "error",
  });
  const expiraEn = new Date(Date.now() + 60_000).toISOString();
  await almacen.crearSesion({
    token: "ajeno",
    email: "voluntario2@demo.hyto",
    usuarioId: "voluntario-2",
    rol: "voluntario",
    expiraEn,
    wallet: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
  });
  await almacen.crearSesion({
    token: "global",
    email: "organizador@demo.hyto",
    usuarioId: "organizador",
    rol: "organizador",
    expiraEn,
    wallet: "",
  });
  const anterior = gancho();
  const tabla = globalThis as typeof globalThis & { __HYTO_FOTOS_PRUEBA?: () => ReturnType<typeof crearFotosMemoria> | null };
  const fotosPrevias = tabla.__HYTO_FOTOS_PRUEBA;
  tabla.__HYTO_FOTOS_PRUEBA = () => fotos;
  usar(almacen);
  const clave = process.env.GROQ_API_KEY;
  const laya = process.env.LAYA_URL;
  process.env.GROQ_API_KEY = "clave-de-prueba";
  delete process.env.LAYA_URL;
  let llamadas = 0;
  const original = globalThis.fetch;
  const previo = console.error;
  console.error = () => undefined;
  globalThis.fetch = async () => {
    llamadas += 1;
    return new Response("no", { status: 500 });
  };
  try {
    const stand = { params: Promise.resolve({ id: "stand" }) };
    const pedir = (token: string) =>
      new Request("http://local/api/revision/stand", { method: "POST", headers: { cookie: cookie(token) } });
    const ajeno = await forzarRevision(pedir("ajeno"), stand);
    assert.equal(ajeno.status, 403);
    assert.equal(((await ajeno.json()) as { aviso: string }).aviso, "Only the organizer reviews.");
    assert.equal(llamadas, 0);
    assert.equal((await almacen.veredictoDe(evidenciaId))?.frase, "La IA no respondió a tiempo");

    const propio = await forzarRevision(pedir("global"), stand);
    assert.equal(propio.status, 200);
    assert.equal(llamadas, INTENTOS_REVISION);
    const vista = (await propio.json()) as { tarea: { origen: string; codigo: string | null } };
    assert.equal(vista.tarea.origen, "error");
    assert.equal(vista.tarea.codigo, "proveedor");
  } finally {
    console.error = previo;
    globalThis.fetch = original;
    tabla.__HYTO_FOTOS_PRUEBA = fotosPrevias;
    (globalThis as typeof globalThis & { __HYTO_ALMACEN_PRUEBA?: Gancho }).__HYTO_ALMACEN_PRUEBA = anterior;
    if (clave === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = clave;
    if (laya === undefined) delete process.env.LAYA_URL;
    else process.env.LAYA_URL = laya;
    reiniciarCandadosRevision();
  }
});
