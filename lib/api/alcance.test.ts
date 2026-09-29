import assert from "node:assert/strict";
import test from "node:test";
import { GET as evidenciaGet } from "../../app/api/evidencias/[id]/route";
import { GET as fotoGet } from "../../app/api/evidencias/[id]/foto/route";
import { GET as informeGet } from "../../app/api/informe/route";
import { GET as proyectosGet } from "../../app/api/proyectos/route";
import { GET as tareasGet } from "../../app/api/tareas/route";
import type { Almacen } from "../db/almacen";
import { crearMemoria } from "../db/memoria";
import { asegurarSemilla } from "../db/semilla";
import { crearProyectoHttp } from "./proyectos";
import { leerFotoHttp, publicarEvidenciaHttp } from "./evidencias";
import { crearFotosMemoria } from "../blob/fotos";

type Gancho = () => Promise<Almacen | null>;

function usar(almacen: Almacen | null): Gancho | undefined {
  const tabla = globalThis as typeof globalThis & { __HYTO_ALMACEN_PRUEBA?: Gancho };
  const anterior = tabla.__HYTO_ALMACEN_PRUEBA;
  tabla.__HYTO_ALMACEN_PRUEBA = async () => almacen;
  return anterior;
}

function restaurar(anterior: Gancho | undefined): void {
  const tabla = globalThis as typeof globalThis & { __HYTO_ALMACEN_PRUEBA?: Gancho };
  tabla.__HYTO_ALMACEN_PRUEBA = anterior;
}

function cookie(token: string): string {
  return `hyto_sesion=${token}`;
}

function pedir(url: string, token?: string): Request {
  return new Request(url, { headers: token ? { cookie: cookie(token) } : {} });
}

async function sesion(almacen: Almacen, token: string, usuarioId: string, rol: "organizador" | "voluntario" = "voluntario"): Promise<void> {
  await almacen.crearSesion({
    token,
    email: `${usuarioId}@demo.hyto`,
    usuarioId,
    rol,
    expiraEn: new Date(Date.now() + 60_000).toISOString(),
    wallet: "",
  });
}

test("sin sesión los listados privados responden 401 y no eligen el proyecto más nuevo", async () => {
  const almacen = crearMemoria();
  await asegurarSemilla(almacen);
  await crearProyectoHttp(
    new Request("http://local/api/proyectos", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ nombre: "Feria nueva", tareas: [{ titulo: "Cajas", tipo: "trabajo", monto: "8" }] }),
    }),
    almacen,
    "voluntario-2",
  );
  const anterior = usar(almacen);
  const demo = process.env.HYTO_DEMO_LOGIN;
  delete process.env.HYTO_DEMO_LOGIN;
  try {
    assert.equal((await proyectosGet(pedir("http://local/api/proyectos"))).status, 401);
    assert.equal((await tareasGet(pedir("http://local/api/tareas"))).status, 401);
    assert.equal((await informeGet(pedir("http://local/api/informe"))).status, 401);
    assert.equal((await evidenciaGet(pedir("http://local/api/evidencias/ejemplo-stand"), { params: Promise.resolve({ id: "ejemplo-stand" }) })).status, 401);
    assert.equal((await fotoGet(pedir("http://local/api/evidencias/ejemplo-stand/foto"), { params: Promise.resolve({ id: "ejemplo-stand" }) })).status, 401);
    assert.equal((await almacen.ultimoProyecto())?.nombre, "Feria nueva");
  } finally {
    restaurar(anterior);
    if (demo === undefined) delete process.env.HYTO_DEMO_LOGIN;
    else process.env.HYTO_DEMO_LOGIN = demo;
  }
});

test("cada sesión ve los proyectos que organiza o en los que es voluntario", async () => {
  const almacen = crearMemoria();
  await asegurarSemilla(almacen);
  await almacen.asignarOrganizador("zeek", "ana");
  await crearProyectoHttp(
    new Request("http://local/api/proyectos", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        nombre: "Feria nueva",
        tareas: [{ titulo: "Cajas", tipo: "trabajo", monto: "9", miembroId: "voluntario-2" }],
      }),
    }),
    almacen,
    "voluntario-9",
  );
  await sesion(almacen, "ana", "ana", "organizador");
  await sesion(almacen, "v1", "voluntario-1");
  await sesion(almacen, "v2", "voluntario-2");
  await sesion(almacen, "ajeno", "nadie");
  const anterior = usar(almacen);
  const demo = process.env.HYTO_DEMO_LOGIN;
  delete process.env.HYTO_DEMO_LOGIN;
  try {
    const deAna = (await (await proyectosGet(pedir("http://local/api/proyectos", "ana"))).json()) as {
      proyecto: { nombre: string };
      tareas: { id: string }[];
    };
    assert.equal(deAna.proyecto.nombre, "ZEEK");
    assert.deepEqual(
      deAna.tareas.map((tarea) => tarea.id).sort(),
      ["bienvenida", "comida", "registro", "stand"],
    );

    const deV1 = (await (await proyectosGet(pedir("http://local/api/proyectos", "v1"))).json()) as {
      proyecto: { nombre: string };
      tareas: { id: string }[];
    };
    assert.equal(deV1.proyecto.nombre, "ZEEK");
    assert.deepEqual(deV1.tareas.map((tarea) => tarea.id).sort(), ["comida", "stand"]);

    const deV2 = (await (await proyectosGet(pedir("http://local/api/proyectos", "v2"))).json()) as {
      proyecto: { nombre: string };
      proyectos: { nombre: string }[];
    };
    assert.equal(deV2.proyecto.nombre, "Feria nueva");
    assert.deepEqual(deV2.proyectos.map((proyecto) => proyecto.nombre).sort(), ["Feria nueva", "ZEEK"]);

    const tareasAna = (await (await tareasGet(pedir("http://local/api/tareas", "ana"))).json()) as {
      tareas: { id: string; titulo: string }[];
    };
    assert.equal(tareasAna.tareas.some((tarea) => tarea.id === "stand"), true);
    assert.equal(tareasAna.tareas.some((tarea) => tarea.titulo === "Cajas"), false);

    const informeV1 = (await (await informeGet(pedir("http://local/api/informe", "v1"))).json()) as {
      nombre: string;
      tareas: { id: string }[];
      resumen: { presupuesto: string };
    };
    assert.equal(informeV1.nombre, "ZEEK");
    assert.deepEqual(informeV1.tareas.map((tarea) => tarea.id).sort(), ["comida", "stand"]);
    assert.equal(informeV1.resumen.presupuesto, "35");

    const fotos = crearFotosMemoria();
    const cuerpo = new FormData();
    cuerpo.set("tareaId", "stand");
    cuerpo.set("foto", new Blob([Uint8Array.from([7])], { type: "image/jpeg" }), "evidencia.jpg");
    const creada = await publicarEvidenciaHttp(new Request("http://local/api/evidencias", { method: "POST", body: cuerpo }), {
      almacen,
      fotos,
    });
    const id = ((await creada.json()) as { evidencia: { id: string } }).evidencia.id;
    const contexto = { params: Promise.resolve({ id }) };

    assert.equal((await evidenciaGet(pedir(`http://local/api/evidencias/${id}`, "v1"), contexto)).status, 200);
    assert.equal((await leerFotoHttp(almacen, fotos, id, { usuarioId: "ana", demo: false })).status, 200);
    assert.equal((await fotoGet(pedir(`http://local/api/evidencias/${id}/foto`, "ana"), contexto)).status, 503);
    const ajena = await evidenciaGet(pedir(`http://local/api/evidencias/${id}`, "v2"), contexto);
    assert.equal(ajena.status, 403);
    assert.equal((await fotoGet(pedir(`http://local/api/evidencias/${id}/foto`, "ajeno"), contexto)).status, 403);
    assert.equal((await evidenciaGet(pedir("http://local/api/evidencias/no-existe", "ana"), { params: Promise.resolve({ id: "no-existe" }) })).status, 404);

    const sinProyecto = await proyectosGet(pedir("http://local/api/proyectos", "ajeno"));
    assert.equal(sinProyecto.status, 404);
  } finally {
    restaurar(anterior);
    if (demo === undefined) delete process.env.HYTO_DEMO_LOGIN;
    else process.env.HYTO_DEMO_LOGIN = demo;
  }
});

test("en demo, sin sesión, solo el ejemplo es público y demo-organizador revisa ZEEK", async () => {
  const almacen = crearMemoria();
  const anterior = usar(almacen);
  const demo = process.env.HYTO_DEMO_LOGIN;
  process.env.HYTO_DEMO_LOGIN = "1";
  try {
    await asegurarSemilla(almacen);
    assert.equal((await almacen.leerProyecto("zeek"))?.organizadorId, "demo-organizador");
    await crearProyectoHttp(
      new Request("http://local/api/proyectos", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ nombre: "Privado", tareas: [{ titulo: "Secreto", tipo: "trabajo", monto: "3", miembroId: "voluntario-1" }] }),
      }),
      almacen,
      "voluntario-1",
    );
    const fotos = crearFotosMemoria();
    const cuerpo = new FormData();
    cuerpo.set("tareaId", "stand");
    cuerpo.set("foto", new Blob([Uint8Array.from([8])], { type: "image/jpeg" }), "evidencia.jpg");
    const creada = await publicarEvidenciaHttp(new Request("http://local/api/evidencias", { method: "POST", body: cuerpo }), {
      almacen,
      fotos,
    });
    const privada = ((await creada.json()) as { evidencia: { id: string } }).evidencia.id;

    const proyectos = (await (await proyectosGet(pedir("http://local/api/proyectos"))).json()) as {
      proyecto: { nombre: string };
      proyectos: { nombre: string }[];
    };
    assert.equal(proyectos.proyecto.nombre, "ZEEK");
    assert.deepEqual(proyectos.proyectos.map((proyecto) => proyecto.nombre), ["ZEEK"]);

    const tareas = (await (await tareasGet(pedir("http://local/api/tareas"))).json()) as { tareas: { id: string; titulo: string }[] };
    assert.deepEqual(tareas.tareas.map((tarea) => tarea.id).sort(), ["bienvenida", "comida", "registro", "stand"]);
    assert.equal(tareas.tareas.some((tarea) => tarea.titulo === "Secreto"), false);

    const informe = (await (await informeGet(pedir("http://local/api/informe"))).json()) as { nombre: string; resumen: { presupuesto: string } };
    assert.equal(informe.nombre, "ZEEK");
    assert.equal(informe.resumen.presupuesto, "75");

    const ejemplo = { params: Promise.resolve({ id: "ejemplo-stand" }) };
    assert.equal((await evidenciaGet(pedir("http://local/api/evidencias/ejemplo-stand"), ejemplo)).status, 200);
    assert.match((await fotoGet(pedir("http://local/api/evidencias/ejemplo-stand/foto"), ejemplo)).headers.get("content-type") ?? "", /svg/);
    assert.equal((await evidenciaGet(pedir(`http://local/api/evidencias/${privada}`), { params: Promise.resolve({ id: privada }) })).status, 401);

    await sesion(almacen, "demo-org", "demo-organizador", "organizador");
    const propias = (await (await tareasGet(pedir("http://local/api/tareas", "demo-org"))).json()) as {
      tareas: { id: string; titulo: string }[];
    };
    assert.equal(propias.tareas.some((tarea) => tarea.id === "stand"), true);
    assert.equal(propias.tareas.some((tarea) => tarea.titulo === "Secreto"), false);
  } finally {
    restaurar(anterior);
    if (demo === undefined) delete process.env.HYTO_DEMO_LOGIN;
    else process.env.HYTO_DEMO_LOGIN = demo;
  }
});
