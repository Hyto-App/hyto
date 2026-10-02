import assert from "node:assert/strict";
import test from "node:test";
import { crearMemoria } from "../db/memoria";
import { asegurarSemilla } from "../db/semilla";
import { armarInforme, tareaAdmin, tareaEnBandeja } from "./informe";
import { marcasDeProyecto } from "./novedades";
import { pedirOtraFotoHttp } from "./pedir";
import { leerProyectoHttp } from "./proyectos";
import { leerRevisionHttp } from "./revision";

const ORGANIZADOR = { usuarioId: "organizador", demo: false };

async function zeekConFotoReal() {
  const almacen = crearMemoria();
  await asegurarSemilla(almacen);
  await almacen.asignarOrganizador("zeek", "organizador");
  await almacen.crearEvidencia({
    id: "ev-real",
    tareaId: "bienvenida",
    blobId: "blob-real",
    monto: null,
    montoConfirmado: null,
    fecha: null,
    creadaEn: "2026-10-02T08:00:00.000Z",
  });
  await almacen.guardarVeredicto({
    id: "ev-real",
    evidenciaId: "ev-real",
    tareaId: "bienvenida",
    veredicto: "parcial",
    frase: "Half of the table is set up.",
    textoScout: "Half of the table is set up.",
    choice: "trabajo",
    noul: "si",
    score: "64",
    origen: "scout",
  });
  await almacen.actualizarTarea("bienvenida", { estado: "en revisión" });
  return almacen;
}

async function pendientesDelEvento(almacen: ReturnType<typeof crearMemoria>): Promise<number | undefined> {
  const respuesta = await leerProyectoHttp(almacen, ORGANIZADOR, { id: "zeek" });
  const cuerpo = (await respuesta.json()) as { proyectos: { id: string; pendientes?: number }[] };
  return cuerpo.proyectos.find((proyecto) => proyecto.id === "zeek")?.pendientes;
}

test("the event card count and the inbox list use the same rule", async () => {
  const almacen = await zeekConFotoReal();
  const informe = await armarInforme(almacen, ORGANIZADOR);
  assert.deepEqual(informe.bandeja.map((tarea) => tarea.id).sort(), ["bienvenida", "comida", "registro", "stand"]);
  assert.equal(await pendientesDelEvento(almacen), informe.bandeja.length);
});

test("asking for another photo hides the old verdict until a new file arrives", async () => {
  const almacen = await zeekConFotoReal();
  assert.equal((await pedirOtraFotoHttp(almacen, "organizador", "bienvenida")).status, 200);

  const tarea = await almacen.leerTarea("bienvenida");
  assert.ok(tarea);
  const vista = await tareaAdmin(almacen, tarea);
  assert.equal(vista.estado, "pendiente");
  assert.equal(vista.veredicto, null);
  assert.equal(vista.nota, null);
  assert.equal(vista.frase, null);
  assert.equal(vista.origen, null);
  assert.deepEqual(vista.etiquetas, []);
  assert.equal(await tareaEnBandeja(almacen, tarea), false);

  const revision = (await (await leerRevisionHttp(almacen, null, "bienvenida")).json()) as {
    tarea: { veredicto: string | null; nota: number | null };
  };
  assert.equal(revision.tarea.veredicto, null);
  assert.equal(revision.tarea.nota, null);

  const marca = (await marcasDeProyecto(almacen, "zeek")).find((item) => item.tareaId === "bienvenida");
  assert.equal(marca?.veredicto, null);
  assert.equal(marca?.origen, null);

  const informe = await armarInforme(almacen, ORGANIZADOR);
  assert.equal(informe.bandeja.some((item) => item.id === "bienvenida"), false);
  assert.equal(await pendientesDelEvento(almacen), informe.bandeja.length);
});

test("a new upload after asking for another photo shows its own verdict", async () => {
  const almacen = await zeekConFotoReal();
  await pedirOtraFotoHttp(almacen, "organizador", "bienvenida");
  await almacen.crearEvidencia({
    id: "ev-nueva",
    tareaId: "bienvenida",
    blobId: "blob-nueva",
    monto: null,
    montoConfirmado: null,
    fecha: null,
    creadaEn: "2026-10-02T09:00:00.000Z",
  });
  await almacen.guardarVeredicto({
    id: "ev-nueva",
    evidenciaId: "ev-nueva",
    tareaId: "bienvenida",
    veredicto: "cumplió",
    frase: "Table set up at the entrance.",
    textoScout: "Table set up at the entrance.",
    choice: "trabajo",
    noul: "si",
    score: "92",
    origen: "scout",
  });
  await almacen.actualizarTarea("bienvenida", { estado: "en revisión" });
  const tarea = await almacen.leerTarea("bienvenida");
  assert.ok(tarea);
  const vista = await tareaAdmin(almacen, tarea);
  assert.equal(vista.veredicto, "cumplió");
  assert.equal(vista.nota, 92);
  assert.equal(await tareaEnBandeja(almacen, tarea), true);
});

test("seeded sample tasks keep their sample verdict while pending", async () => {
  const almacen = crearMemoria();
  await asegurarSemilla(almacen);
  const stand = await almacen.leerTarea("stand");
  assert.ok(stand);
  assert.equal(stand.estado, "pendiente");
  const vista = await tareaAdmin(almacen, stand);
  assert.equal(vista.veredicto, "cumplió");
  assert.equal(await tareaEnBandeja(almacen, stand), true);
});
