import assert from "node:assert/strict";
import test from "node:test";
import { GET as evidenciaGet } from "../../app/api/evidencias/[id]/route";
import { GET as fotoGet } from "../../app/api/evidencias/[id]/foto/route";
import { GET as informeGet } from "../../app/api/informe/route";
import { GET as proyectosGet } from "../../app/api/proyectos/route";
import { GET as revisionGet, POST as revisionPost } from "../../app/api/revision/[id]/route";
import { GET as tareasGet } from "../../app/api/tareas/route";
import type { Almacen } from "../db/almacen";
import { crearMemoria } from "../db/memoria";
import { asegurarSemilla } from "../db/semilla";
import { crearProyectoHttp } from "./proyectos";
import { leerFotoHttp, publicarEvidenciaHttp } from "./evidencias";
import { jpegDePrueba, PDF_MINIMO, tokenDePrueba } from "../evidencia/muestras";
import { reiniciarTokensEvidencia } from "../evidencia/token";
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
    reiniciarTokensEvidencia();
    const cuerpo = new FormData();
    cuerpo.set("tareaId", "stand");
    cuerpo.set("foto", new Blob([await jpegDePrueba()], { type: "image/jpeg" }), "evidencia.jpg");
    cuerpo.set("token", tokenDePrueba("ana", "stand"));
    cuerpo.set("capturadaEn", new Date().toISOString());
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

test("en demo, sin sesión solo se ve el proyecto demo y no ZEEK", async () => {
  const almacen = crearMemoria();
  const anterior = usar(almacen);
  const demo = process.env.HYTO_DEMO_LOGIN;
  process.env.HYTO_DEMO_LOGIN = "1";
  try {
    await asegurarSemilla(almacen);
    await almacen.asignarOrganizador("zeek", "demo-organizador");
    await almacen.actualizarTarea("stand", { walletCobro: "WALLET-ZEEK", contratoEscrow: "C" + "A".repeat(55) });
    const guardado = await almacen.veredictoDe("ejemplo-stand");
    assert.ok(guardado);
    await almacen.guardarVeredicto({ ...guardado, frase: "SECRETO-ZEEK", textoScout: "SECRETO-ZEEK" });

    const proyectos = (await (await proyectosGet(pedir("http://local/api/proyectos"))).json()) as {
      proyecto: { id: string; nombre: string };
      proyectos: { id: string; pendientes?: number }[];
    };
    assert.equal(proyectos.proyecto.id, "demo");
    assert.deepEqual(proyectos.proyectos.map((proyecto) => proyecto.id), ["demo"]);
    assert.equal(proyectos.proyectos[0]?.pendientes, 3);

    const tareas = (await (await tareasGet(pedir("http://local/api/tareas"))).json()) as {
      tareas: { id: string; walletCobro: string; contratoEscrow: string | null }[];
    };
    assert.deepEqual(tareas.tareas.map((tarea) => tarea.id).sort(), ["demo-bienvenida", "demo-comida", "demo-registro", "demo-stand"]);
    assert.equal(tareas.tareas.some((tarea) => tarea.walletCobro === "WALLET-ZEEK" || tarea.contratoEscrow), false);

    const informe = (await (await informeGet(pedir("http://local/api/informe"))).json()) as {
      nombre: string;
      tareas: { id: string; frase: string | null }[];
    };
    assert.equal(informe.nombre, "Demo");
    assert.equal(informe.tareas.some((tarea) => tarea.id === "stand" || tarea.frase === "SECRETO-ZEEK"), false);

    assert.equal((await evidenciaGet(pedir("http://local/api/evidencias/ejemplo-stand"), { params: Promise.resolve({ id: "ejemplo-stand" }) })).status, 401);
    const fotoDemo = await fotoGet(pedir("http://local/api/evidencias/ejemplo-demo-stand/foto"), {
      params: Promise.resolve({ id: "ejemplo-demo-stand" }),
    });
    assert.equal(fotoDemo.status, 200);
    assert.match(fotoDemo.headers.get("content-type") ?? "", /svg/);
  } finally {
    restaurar(anterior);
    if (demo === undefined) delete process.env.HYTO_DEMO_LOGIN;
    else process.env.HYTO_DEMO_LOGIN = demo;
  }
});

test("una sesión demo no lee ZEEK y el dueño real sí", async () => {
  const almacen = crearMemoria();
  const anterior = usar(almacen);
  const demo = process.env.HYTO_DEMO_LOGIN;
  process.env.HYTO_DEMO_LOGIN = "1";
  try {
    await asegurarSemilla(almacen);
    await almacen.asignarOrganizador("zeek", "ana");
    await almacen.actualizarTarea("stand", { walletCobro: "WALLET-ZEEK" });
    const guardado = await almacen.veredictoDe("ejemplo-stand");
    assert.ok(guardado);
    await almacen.guardarVeredicto({ ...guardado, frase: "SECRETO-ZEEK", textoScout: "SECRETO-ZEEK" });
    await sesion(almacen, "demo-org", "demo-organizador", "organizador");
    await sesion(almacen, "ana", "ana", "organizador");

    const deDemo = (await (await tareasGet(pedir("http://local/api/tareas", "demo-org"))).json()) as {
      tareas: { id: string; walletCobro: string }[];
    };
    assert.equal(deDemo.tareas.some((tarea) => tarea.id === "stand" || tarea.walletCobro === "WALLET-ZEEK"), false);
    assert.equal(deDemo.tareas.some((tarea) => tarea.id === "demo-stand"), true);
    assert.equal(
      (await evidenciaGet(pedir("http://local/api/evidencias/ejemplo-stand", "demo-org"), { params: Promise.resolve({ id: "ejemplo-stand" }) })).status,
      403,
    );
    const informeDemo = (await (await informeGet(pedir("http://local/api/informe", "demo-org"))).json()) as { nombre: string };
    assert.equal(informeDemo.nombre, "Demo");
    assert.equal(
      (await revisionGet(pedir("http://local/api/revision/stand", "demo-org"), { params: Promise.resolve({ id: "stand" }) })).status,
      403,
    );
    assert.equal(
      (await revisionPost(pedir("http://local/api/revision/stand", "demo-org"), { params: Promise.resolve({ id: "stand" }) })).status,
      403,
    );
    assert.equal(
      (await revisionGet(pedir("http://local/api/revision/demo-stand", "demo-org"), { params: Promise.resolve({ id: "demo-stand" }) })).status,
      200,
    );

    const deAna = (await (await tareasGet(pedir("http://local/api/tareas", "ana"))).json()) as {
      tareas: { id: string; walletCobro: string }[];
    };
    assert.equal(deAna.tareas.some((tarea) => tarea.id === "stand" && tarea.walletCobro === "WALLET-ZEEK"), true);
    assert.equal(deAna.tareas.some((tarea) => tarea.id === "demo-stand"), false);
    const informeAna = (await (await informeGet(pedir("http://local/api/informe", "ana"))).json()) as {
      nombre: string;
      tareas: { frase: string | null }[];
    };
    assert.equal(informeAna.nombre, "ZEEK");
    assert.equal(informeAna.tareas.some((tarea) => tarea.frase === "SECRETO-ZEEK"), true);
    assert.equal(
      (await evidenciaGet(pedir("http://local/api/evidencias/ejemplo-stand", "ana"), { params: Promise.resolve({ id: "ejemplo-stand" }) })).status,
      200,
    );
  } finally {
    restaurar(anterior);
    if (demo === undefined) delete process.env.HYTO_DEMO_LOGIN;
    else process.env.HYTO_DEMO_LOGIN = demo;
  }
});

test("la sesión demo sube evidencia a una tarea demo, sin fijar cobro, y no a ZEEK", async () => {
  const almacen = crearMemoria();
  const fotos = crearFotosMemoria();
  const demo = process.env.HYTO_DEMO_LOGIN;
  process.env.HYTO_DEMO_LOGIN = "1";
  try {
    await asegurarSemilla(almacen);
    const actor = { usuarioId: "demo-voluntario", rol: "voluntario" as const, demo: true };
    reiniciarTokensEvidencia();
    const jpeg = await jpegDePrueba();
    const subir = (tareaId: string) => {
      const cuerpo = new FormData();
      cuerpo.set("tareaId", tareaId);
      cuerpo.set("wallet", "G" + "A".repeat(55));
      if (tareaId.includes("stand") || tareaId === "demo-registro") {
        cuerpo.set("foto", new Blob([jpeg], { type: "image/jpeg" }), "evidencia.jpg");
        cuerpo.set("token", tokenDePrueba(actor.usuarioId, tareaId));
        cuerpo.set("capturadaEn", new Date().toISOString());
      } else {
        cuerpo.set("foto", new Blob([PDF_MINIMO], { type: "application/pdf" }), "factura.pdf");
      }
      return publicarEvidenciaHttp(new Request("http://local/api/evidencias", { method: "POST", body: cuerpo }), {
        almacen,
        fotos,
        actor,
      });
    };
    const creada = await subir("demo-comida");
    assert.equal(creada.status, 201);
    assert.ok(await almacen.ultimaEvidencia("demo-comida"));
    assert.equal((await almacen.leerTarea("demo-comida"))?.walletCobro, "");
    assert.equal((await subir("comida")).status, 403);
    assert.equal((await subir("demo-stand")).status, 201);
    const ajeno = await publicarEvidenciaHttp(
      (() => {
        const cuerpo = new FormData();
        cuerpo.set("tareaId", "demo-registro");
        cuerpo.set("foto", new Blob([jpeg], { type: "image/jpeg" }), "evidencia.jpg");
        cuerpo.set("token", tokenDePrueba("voluntario-1", "demo-registro"));
        cuerpo.set("capturadaEn", new Date().toISOString());
        return new Request("http://local/api/evidencias", { method: "POST", body: cuerpo });
      })(),
      { almacen, fotos, actor: { usuarioId: "voluntario-1", rol: "voluntario", demo: false } },
    );
    assert.equal(ajeno.status, 403);
  } finally {
    if (demo === undefined) delete process.env.HYTO_DEMO_LOGIN;
    else process.env.HYTO_DEMO_LOGIN = demo;
  }
});
