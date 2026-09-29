import { desmontar, escribir, limpiarPantalla, montar, pulsar, texto } from "./montar";
import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";
import { createElement } from "react";
import { Bandeja } from "../../components/admin/Bandeja";
import { CrearProyecto } from "../../components/admin/CrearProyecto";
import { Informe } from "../../components/admin/Informe";
import { Marco } from "../../components/admin/Marco";
import { Revision } from "../../components/admin/Revision";
import { guardarDecision, guardarProyecto, leerMemoriaAdmin } from "../../lib/admin/memoria";
import { POST as evidenciasPost } from "../../app/api/evidencias/route";
import { GET as informeGet } from "../../app/api/informe/route";
import { GET as proyectosGet, POST as proyectosPost } from "../../app/api/proyectos/route";
import { GET as revisionGet } from "../../app/api/revision/[id]/route";
import { baseLista, prepararBase, soltar, tomar } from "./postgres";

const hayBase = await prepararBase();

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
    assert.match(plano, /Por aprobar/);
    assert.match(plano, /Montar el stand/);
    assert.match(plano, /Registro de asistentes/);
    assert.match(plano, /Comida del equipo/);
    assert.equal(plano.includes("Mesa de bienvenida"), false);
    assert.equal(plano.includes("Volver al ejemplo"), false);
    assert.match(plano, /Vista de ejemplo, hasta que las rutas respondan/);
  });

  test("crear proyecto avisa si faltan el nombre o el monto y no navega", async () => {
    const idas: string[] = [];
    await montar(createElement(CrearProyecto), { push: (href) => idas.push(href) });
    await pulsar("Fondear");
    assert.match(texto(), /Escribe el nombre y al menos una tarea con monto/);
    assert.deepEqual(idas, []);

    await escribir("#nombre-proyecto", "Feria");
    await escribir("#titulo-1", "Cajas");
    await escribir("#monto-1", "0");
    await pulsar("Fondear");
    assert.match(texto(), /Escribe el nombre y al menos una tarea con monto/);
    assert.equal(leerMemoriaAdmin().proyecto, null);
    assert.deepEqual(idas, []);
  });

  test("crear proyecto guarda el nombre y la tarea y vuelve a la bandeja", async () => {
    const idas: string[] = [];
    await montar(createElement(CrearProyecto), { push: (href) => idas.push(href) });
    await escribir("#nombre-proyecto", "Feria");
    await escribir("#titulo-1", "Cajas");
    await escribir("#monto-1", "8");
    await pulsar("Fondear");
    assert.deepEqual(idas, ["/"]);
    const proyecto = leerMemoriaAdmin().proyecto;
    assert.equal(proyecto?.nombre, "Feria");
    assert.equal(proyecto?.tareas[0]?.titulo, "Cajas");
    assert.equal(proyecto?.tareas[0]?.tipo, "trabajo");
    assert.equal(proyecto?.tareas[0]?.monto, "8");
  });

  test("un proyecto propio sale de la bandeja al volver al ejemplo", async () => {
    guardarProyecto({
      nombre: "Feria",
      tareas: [{ id: "nueva-1", titulo: "Cajas", tipo: "trabajo", monto: "8" }],
    });
    await montar(createElement(Bandeja), { ruta: "/" });
    assert.match(texto(), /Feria/);
    assert.match(texto(), /Nada por aprobar/);
    assert.match(texto(), /Volver al ejemplo de ZEEK/);
    await pulsar("Volver al ejemplo de ZEEK");
    assert.match(texto(), /ZEEK/);
    assert.match(texto(), /Montar el stand/);
    assert.equal(leerMemoriaAdmin().proyecto, null);
  });

  test("la revisión avisa si la tarea no existe", async () => {
    await montar(createElement(Revision, { tareaId: "no-existe" }));
    assert.match(texto(), /No encontramos esa tarea/);
    assert.match(texto(), /Volver a la bandeja/);
  });

  test("aprobar deja la tarea pagada en la revisión y en la memoria", async () => {
    await montar(createElement(Revision, { tareaId: "stand" }));
    assert.match(texto(), /Aprobar/);
    assert.match(texto(), /cumplió/);
    await pulsar("Aprobar");
    const plano = texto();
    assert.match(plano, /Pagado/);
    assert.match(plano, /Vista de ejemplo, hasta que el pago esté conectado/);
    assert.equal(leerMemoriaAdmin().decisiones.stand, "pagado");
  });

  test("pedir otra foto saca la tarea de la revisión", async () => {
    await montar(createElement(Revision, { tareaId: "registro" }));
    assert.match(texto(), /Pedir otra foto/);
    assert.match(texto(), /parcial/);
    await pulsar("Pedir otra foto");
    const plano = texto();
    assert.equal(plano.includes("Pedir otra foto"), false);
    assert.equal(plano.includes("Aprobar"), false);
    assert.equal(leerMemoriaAdmin().decisiones.registro, "pendiente");
  });

  test("el informe muestra el presupuesto por persona y puede imprimir", async () => {
    await montar(createElement(Informe));
    const plano = texto();
    assert.match(plano, /Presupuesto contra gasto/);
    assert.match(plano, /US\$75/);
    assert.match(plano, /US\$0/);
    assert.match(plano, /Voluntario 1/);
    assert.match(plano, /Voluntario 2/);
    assert.match(plano, /Voluntario 3/);
    let impreso = false;
    Object.defineProperty(window, "print", { configurable: true, value: () => { impreso = true; } });
    await pulsar("Imprimir");
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
    await montar(createElement(Marco, null, createElement("p", null, "contenido")), { ruta: "/informe" });
    const plano = texto();
    assert.match(plano, /contenido/);
    assert.match(plano, /Entrar/);
    const hrefs = [...document.querySelectorAll("a")].map((enlace) => enlace.getAttribute("href"));
    assert.deepEqual(hrefs, ["/", "/informe", "/proyectos/nuevo", "/mis-tareas"]);
    assert.match(document.querySelector('a[href="/informe"]')?.className ?? "", /font-semibold/);
    assert.match(document.querySelector('a[href="/"]')?.className ?? "", /suave/);
  });
});

describe("flujo de admin en la base", { skip: hayBase && baseLista() ? false : "no hay base local", concurrency: false }, () => {
  beforeEach(async () => {
    await tomar();
  });

  afterEach(async () => {
    await soltar();
  });

  test("crear un proyecto, subir evidencia y verla en la revisión y el informe", async () => {
    const creado = await proyectosPost(
      new Request("http://local/api/proyectos", {
        method: "POST",
        headers: { "content-type": "application/json" },
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

    const proyecto = (await (await proyectosGet()).json()) as { proyecto: { nombre: string } };
    assert.equal(proyecto.proyecto.nombre, "Feria");

    const antes = (await (await informeGet()).json()) as { nombre: string; bandeja: unknown[] };
    assert.equal(antes.nombre, "Feria");
    assert.equal(antes.bandeja.length, 0);

    const datos = new FormData();
    datos.set("tareaId", tareaId);
    datos.set("foto", new Blob([Uint8Array.from([4, 5, 6])], { type: "image/jpeg" }), "cajas.jpg");
    const evidencia = await evidenciasPost(new Request("http://local/api/evidencias", { method: "POST", body: datos }));
    assert.equal(evidencia.status, 201);

    const revision = await revisionGet(new Request(`http://local/api/revision/${tareaId}`), {
      params: Promise.resolve({ id: tareaId }),
    });
    assert.equal(revision.status, 200);
    const vista = (await revision.json()) as {
      tarea: { titulo: string; estado: string; veredicto: string };
      foto: string | null;
      enlacePago: string | null;
    };
    assert.equal(vista.tarea.titulo, "Cajas");
    assert.equal(vista.tarea.estado, "en revisión");
    assert.equal(vista.tarea.veredicto, "parcial");
    assert.match(vista.foto ?? "", /^\/api\/evidencias\/.+\/foto$/);
    assert.equal(vista.enlacePago, null);

    const informe = (await (await informeGet()).json()) as {
      nombre: string;
      bandeja: { id: string; veredicto: string }[];
    };
    assert.equal(informe.nombre, "Feria");
    assert.equal(informe.bandeja.length, 1);
    assert.equal(informe.bandeja[0]?.id, tareaId);
    assert.equal(informe.bandeja[0]?.veredicto, "parcial");
  });
});
});
