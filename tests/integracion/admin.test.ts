import "./aplicar-guardia";
import { desmontar, escribir, limpiarPantalla, montar, pulsar, texto } from "./montar";
import assert from "node:assert/strict";
import { afterEach, before, beforeEach, describe, test } from "node:test";
import { createElement } from "react";
import { Bandeja } from "../../components/admin/Bandeja";
import { CrearProyecto } from "../../components/admin/CrearProyecto";
import { ProveedorModoDemo } from "../../components/sesion/InsigniaDemo";
import { Informe } from "../../components/admin/Informe";
import { Marco } from "../../components/admin/Marco";
import { Revision } from "../../components/admin/Revision";
import { guardarDecision, guardarProyecto, leerMemoriaAdmin } from "../../lib/admin/memoria";
import { POST as evidenciasPost } from "../../app/api/evidencias/route";
import { GET as informeGet } from "../../app/api/informe/route";
import { GET as proyectosGet, POST as proyectosPost } from "../../app/api/proyectos/route";
import { GET as revisionGet } from "../../app/api/revision/[id]/route";
import { motivoSuiteSync } from "./guardia";
import { prepararSuite, soltar, tomar } from "./postgres";
import { usarLectorSaldo } from "../../lib/escrow/saldo";
import { cookieSesionPrueba } from "./sesion-prueba";

const motivo = motivoSuiteSync();

describe("admin", { concurrency: false }, () => {
describe("pantallas de admin", { concurrency: false }, () => {
  beforeEach(() => {
    limpiarPantalla();
  });

  afterEach(async () => {
    await desmontar();
    limpiarPantalla();
  });

  test("la bandeja de ejemplo muestra ZEEK y solo lo que está en revisión", async () => {
    await montar(createElement(Bandeja), { ruta: "/" });
    const plano = texto();
    assert.match(plano, /ZEEK/);
    assert.match(plano, /To approve/);
    assert.match(plano, /Set up the booth/);
    assert.match(plano, /Check-in list/);
    assert.match(plano, /Team meal/);
    assert.equal(plano.includes("Welcome table"), false);
    assert.equal(plano.includes("Back to the ZEEK example"), false);
    assert.match(plano, /Sample event, until live tasks load/);
  });

  test("crear proyecto avisa si faltan el nombre o el monto y no navega", async () => {
    const idas: string[] = [];
    await montar(createElement(CrearProyecto), { push: (href) => idas.push(href) });
    await pulsar("Create event");
    assert.match(texto(), /Enter a name and at least one task with an amount/);
    assert.deepEqual(idas, []);

    await escribir("#nombre-proyecto", "Feria");
    await escribir("#titulo-1", "Cajas");
    await escribir("#monto-1", "0");
    await pulsar("Create event");
    assert.match(texto(), /Enter a name and at least one task with an amount/);
    assert.equal(leerMemoriaAdmin().proyecto, null);
    assert.deepEqual(idas, []);
  });

  test("en modo demo no se crea el proyecto y se muestra el aviso", async () => {
    const idas: string[] = [];
    await montar(
      createElement(ProveedorModoDemo, { activo: true, rol: "organizador", children: createElement(CrearProyecto) }),
      { push: (href) => idas.push(href) },
    );
    assert.match(texto(), /Demo mode cannot create events/);
    const fondear = [...document.querySelectorAll("button")].find((boton) => boton.textContent?.includes("Create event"));
    assert.equal(fondear instanceof HTMLButtonElement && fondear.disabled, true);
    await escribir("#nombre-proyecto", "Feria");
    await escribir("#titulo-1", "Cajas");
    await escribir("#monto-1", "8");
    await pulsar("Create event");
    assert.equal(leerMemoriaAdmin().proyecto, null);
    assert.deepEqual(idas, []);
  });

  test("crear proyecto guarda el nombre y la tarea y vuelve a la bandeja", async () => {
    const idas: string[] = [];
    const original = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ proyecto: { id: "evt-1", nombre: "Feria" } }), {
        status: 201,
        headers: { "content-type": "application/json" },
      });
    try {
      await montar(createElement(CrearProyecto), { push: (href) => idas.push(href) });
      await escribir("#nombre-proyecto", "Feria");
      await escribir("#titulo-1", "Cajas");
      await escribir("#monto-1", "8");
      await pulsar("Create event");
      assert.deepEqual(idas, ["/eventos/evt-1"]);
      assert.equal(leerMemoriaAdmin().proyecto, null);
    } finally {
      globalThis.fetch = original;
    }
  });

  test("un proyecto propio sale de la bandeja al volver al ejemplo", async () => {
    guardarProyecto({
      nombre: "Feria",
      tareas: [{ id: "nueva-1", titulo: "Cajas", tipo: "trabajo", monto: "8" }],
    });
    await montar(createElement(Bandeja), { ruta: "/" });
    assert.match(texto(), /Feria/);
    assert.match(texto(), /Nothing to approve/);
    assert.match(texto(), /Back to the ZEEK example/);
    await pulsar("Back to the ZEEK example");
    assert.match(texto(), /ZEEK/);
    assert.match(texto(), /Set up the booth/);
    assert.equal(leerMemoriaAdmin().proyecto, null);
  });

  test("la revisión avisa si la tarea no existe", async () => {
    await montar(createElement(Revision, { tareaId: "no-existe" }));
    assert.match(texto(), /We couldn't find that task/);
    assert.match(texto(), /Back to the inbox/);
  });

  test("aprobar deja la tarea pagada en la revisión y en la memoria", async () => {
    await montar(createElement(Revision, { tareaId: "stand" }));
    assert.match(texto(), /Approve/);
    assert.match(texto(), /Met/);
    await pulsar("Approve");
    const plano = texto();
    assert.match(plano, /Paid/);
    assert.match(plano, /This is a sample. A live payment adds a link to the blockchain/);
    assert.equal(leerMemoriaAdmin().decisiones.stand, "pagado");
  });

  test("pedir otra foto saca la tarea de la revisión", async () => {
    await montar(createElement(Revision, { tareaId: "registro" }));
    assert.match(texto(), /Ask for another photo/);
    assert.match(texto(), /Partial/);
    await pulsar("Ask for another photo");
    const plano = texto();
    assert.equal(plano.includes("Ask for another photo"), false);
    assert.equal(plano.includes("Approve"), false);
    assert.equal(leerMemoriaAdmin().decisiones.registro, "pendiente");
  });

  test("el informe muestra el presupuesto por persona y puede imprimir", async () => {
    await montar(createElement(Informe));
    const plano = texto();
    assert.match(plano, /Budget against spend/);
    assert.match(plano, /US\$75/);
    assert.match(plano, /US\$0/);
    assert.match(plano, /Volunteer 1/);
    assert.match(plano, /Volunteer 2/);
    assert.match(plano, /Volunteer 3/);
    let impreso = false;
    Object.defineProperty(window, "print", { configurable: true, value: () => { impreso = true; } });
    await pulsar("Print");
    assert.equal(impreso, true);
  });

  test("el informe usa el monto revisado cuando la comida y el stand están pagados", async () => {
    guardarDecision("stand", "pagado");
    guardarDecision("comida", "pagado");
    await montar(createElement(Informe));
    const plano = texto();
    assert.match(plano, /US\$32\.40/);
    assert.match(plano, /US\$42\.60/);
    assert.match(plano, /US\$12\.40/);
  });

  test("el marco enlaza la bandeja, el informe, crear proyecto y mis tareas", async () => {
    await montar(createElement(Marco, null, createElement("p", null, "contenido")), { ruta: "/eventos" });
    const plano = texto();
    assert.match(plano, /contenido/);
    const hrefs = [...document.querySelectorAll("a")].map((enlace) => enlace.getAttribute("href"));
    assert.deepEqual(hrefs, ["/eventos", "/mis-tareas", "/cuentas"]);
    assert.match(document.querySelector('a[href="/eventos"]')?.className ?? "", /font-semibold/);
    assert.match(document.querySelector('a[href="/mis-tareas"]')?.className ?? "", /suave/);
  });
});

describe("flujo de admin en la base", { concurrency: false, skip: motivo }, () => {
  before(async () => {
    await prepararSuite();
  });

  beforeEach(async () => {
    await tomar();
  });

  afterEach(async () => {
    await soltar();
  });

  test("crear un proyecto, subir evidencia y verla en la revisión y el informe", async () => {
    const sesion = await cookieSesionPrueba("organizador", "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");
    usarLectorSaldo(async () => ({ saldo: "1000" }));
    const creado = await proyectosPost(
      new Request("http://local/api/proyectos", {
        method: "POST",
        headers: { "content-type": "application/json", cookie: sesion },
        body: JSON.stringify({
          nombre: "Feria",
          tareas: [{ titulo: "Cajas", tipo: "trabajo", monto: "8", condicion: "Cajas cerradas", miembroId: "voluntario-2" }],
        }),
      }),
    );
    assert.equal(creado.status, 201);
    const alta = (await creado.json()) as { tareas: { id: string; titulo: string }[] };
    const tareaId = alta.tareas[0]?.id ?? "";
    assert.equal(alta.tareas[0]?.titulo, "Cajas");

    const proyecto = (await (await proyectosGet(new Request("http://local/api/proyectos", { headers: { cookie: sesion } }))).json()) as {
      proyecto: { nombre: string };
    };
    assert.equal(proyecto.proyecto.nombre, "Feria");

    const antes = (await (await informeGet(new Request("http://local/api/informe", { headers: { cookie: sesion } }))).json()) as {
      nombre: string;
      bandeja: unknown[];
    };
    assert.equal(antes.nombre, "Feria");
    assert.equal(antes.bandeja.length, 0);

    const datos = new FormData();
    datos.set("tareaId", tareaId);
    datos.set("foto", new Blob([Uint8Array.from([4, 5, 6])], { type: "image/jpeg" }), "cajas.jpg");
    const evidencia = await evidenciasPost(
      new Request("http://local/api/evidencias", { method: "POST", body: datos, headers: { cookie: sesion } }),
    );
    assert.equal(evidencia.status, 201);

    const revision = await revisionGet(new Request(`http://local/api/revision/${tareaId}`, { headers: { cookie: sesion } }), {
      params: Promise.resolve({ id: tareaId }),
    });
    assert.equal(revision.status, 200);
    const vista = (await revision.json()) as {
      tarea: { titulo: string; estado: string; veredicto: string | null; origen: string };
      foto: string | null;
      enlacePago: string | null;
    };
    assert.equal(vista.tarea.titulo, "Cajas");
    assert.equal(vista.tarea.estado, "en revisión");
    assert.equal(vista.tarea.veredicto, null);
    assert.equal(vista.tarea.origen, "error");
    assert.match(vista.foto ?? "", /^\/api\/evidencias\/.+\/foto$/);
    assert.equal(vista.enlacePago, null);

    const informe = (await (await informeGet(new Request("http://local/api/informe", { headers: { cookie: sesion } }))).json()) as {
      nombre: string;
      bandeja: { id: string; veredicto: string | null; origen: string | null }[];
    };
    assert.equal(informe.nombre, "Feria");
    assert.equal(informe.bandeja.length, 1);
    assert.equal(informe.bandeja[0]?.id, tareaId);
    assert.equal(informe.bandeja[0]?.veredicto, null);
    assert.equal(informe.bandeja[0]?.origen, "error");
    usarLectorSaldo(null);
  });
});
});
