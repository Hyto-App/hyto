import assert from "node:assert/strict";
import test from "node:test";
import type { TareaAdmin } from "../admin/tipos";
import { bandejaDe } from "../admin/vista";
import { crearMemoria } from "../db/memoria";
import { asegurarSemilla } from "../db/semilla";
import { armarInforme } from "./informe";
import { pedirOtraFotoHttp } from "./pedir";
import { leerProyectoHttp } from "./proyectos";
import { leerRevisionHttp } from "./revision";

// Mailbox #026 point 2: the event card said "4 pending" and the inbox listed 3 tasks.
// The card count (`GET /api/proyectos`) and the inbox rows must come from the same rule.

type Memoria = ReturnType<typeof crearMemoria>;
type VisorPrueba = { usuarioId: string | null; demo: boolean };

const ORGANIZADOR: VisorPrueba = { usuarioId: "organizador", demo: false };

async function pendientesDelEvento(almacen: Memoria, visor: VisorPrueba, id: string): Promise<number | undefined> {
  const respuesta = await leerProyectoHttp(almacen, visor, { id });
  const cuerpo = (await respuesta.json()) as { proyectos: { id: string; pendientes?: number }[] };
  return cuerpo.proyectos.find((proyecto) => proyecto.id === id)?.pendientes;
}

/** The review screen builds the inbox from one `GET /api/revision/:id` per task, then applies `bandejaDe`. */
async function bandejaQueListaLaPantalla(almacen: Memoria, visor: VisorPrueba): Promise<string[]> {
  const informe = await armarInforme(almacen, visor);
  assert.equal(informe.tareas.length > 0, true);
  const filas: TareaAdmin[] = [];
  for (const tarea of informe.tareas) {
    const cuerpo = (await (await leerRevisionHttp(almacen, null, tarea.id)).json()) as { tarea: TareaAdmin };
    filas.push(cuerpo.tarea);
  }
  return bandejaDe(filas).map((tarea) => tarea.id).sort();
}

async function subirFoto(almacen: Memoria, tareaId: string, origen: "scout" | "error"): Promise<void> {
  const id = `ev-${tareaId}`;
  await almacen.crearEvidencia({
    id,
    tareaId,
    blobId: `blob-${tareaId}`,
    monto: null,
    montoConfirmado: null,
    fecha: null,
    creadaEn: "2026-10-02T08:00:00.000Z",
  });
  await almacen.guardarVeredicto({
    id,
    evidenciaId: id,
    tareaId,
    veredicto: origen === "error" ? "insuficiente" : "parcial",
    frase: origen === "error" ? "AI review is not configured." : "Half of the table is set up.",
    textoScout: origen === "error" ? "" : "Half of the table is set up.",
    choice: origen === "error" ? "sin_clave" : "trabajo",
    noul: "si",
    score: origen === "error" ? "0" : "64",
    origen,
  });
  await almacen.actualizarTarea(tareaId, { estado: "en revisión" });
}

test("the event card count equals the rows the inbox lists, whatever state each task is in", async () => {
  const almacen = crearMemoria();
  await asegurarSemilla(almacen);
  await almacen.asignarOrganizador("zeek", "organizador");
  // Two real photos in review: one with a verdict, one whose AI review failed (no verdict to show).
  await subirFoto(almacen, "bienvenida", "scout");
  await subirFoto(almacen, "registro", "error");
  // Paid work leaves the inbox. The pending sample task "stand" keeps its sample verdict and never enters it.
  await almacen.actualizarTarea("comida", { estado: "pagado" });

  const informe = await armarInforme(almacen, ORGANIZADOR);
  const ids = informe.bandeja.map((tarea) => tarea.id).sort();
  assert.deepEqual(ids, ["bienvenida", "registro"]);
  assert.equal(informe.tareas.find((tarea) => tarea.id === "stand")?.veredicto, "cumplió");
  assert.equal(await pendientesDelEvento(almacen, ORGANIZADOR, "zeek"), ids.length);
  assert.deepEqual(await bandejaQueListaLaPantalla(almacen, ORGANIZADOR), ids);

  // Asking for another photo drops that task from the count and the list together.
  assert.equal((await pedirOtraFotoHttp(almacen, "organizador", "registro")).status, 200);
  assert.equal(await pendientesDelEvento(almacen, ORGANIZADOR, "zeek"), 1);
  assert.deepEqual(await bandejaQueListaLaPantalla(almacen, ORGANIZADOR), ["bienvenida"]);
});

test("the demo event counts one waiting and lists one, and pending sample verdicts do not inflate it", async () => {
  const anterior = process.env.HYTO_DEMO_LOGIN;
  process.env.HYTO_DEMO_LOGIN = "1";
  try {
    const almacen = crearMemoria();
    await asegurarSemilla(almacen);
    for (const visor of [
      { usuarioId: "demo-organizador", demo: true },
      { usuarioId: null, demo: true },
    ]) {
      const informe = await armarInforme(almacen, visor);
      // Pending demo tasks still carry sample verdicts. Those are not photos waiting for the organizer.
      assert.equal(informe.tareas.some((tarea) => tarea.estado === "pendiente" && tarea.veredicto !== null), true);
      assert.deepEqual(informe.bandeja.map((tarea) => tarea.id), ["demo-stand"]);
      assert.equal(await pendientesDelEvento(almacen, visor, "demo"), informe.bandeja.length);
      assert.deepEqual(await bandejaQueListaLaPantalla(almacen, visor), ["demo-stand"]);
    }
  } finally {
    if (anterior === undefined) delete process.env.HYTO_DEMO_LOGIN;
    else process.env.HYTO_DEMO_LOGIN = anterior;
  }
});
