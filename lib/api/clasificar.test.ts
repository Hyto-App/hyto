import assert from "node:assert/strict";
import test from "node:test";
import { crearMemoria } from "@/lib/db/memoria";
import { clasificarTareaHttp } from "./clasificar";
import { crearProyectoHttp } from "./proyectos";

function pedido(tareas: unknown[]): Request {
  return new Request("http://local/api/proyectos", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ nombre: "Feria", tareas }),
  });
}

async function tareaCreada(almacen: Awaited<ReturnType<typeof crearMemoria>>, titulo: string) {
  return (await almacen.listarTareas()).find((tarea) => tarea.titulo === titulo) ?? null;
}

test("una tarea nueva queda en prioridad normal y dificultad sin definir", async () => {
  const almacen = crearMemoria();
  const respuesta = await crearProyectoHttp(pedido([{ titulo: "Cajas", tipo: "trabajo", monto: "8" }]), almacen, "ana");
  assert.equal(respuesta.status, 201);
  const tarea = await tareaCreada(almacen, "Cajas");
  assert.equal(tarea?.prioridad, "normal");
  assert.equal(tarea?.dificultad, null);
});

test("el organizador elige prioridad alta y dificultad al crear el evento", async () => {
  const almacen = crearMemoria();
  const respuesta = await crearProyectoHttp(
    pedido([{ titulo: "Cajas", tipo: "trabajo", monto: "8", prioridad: "high", dificultad: "hard" }]),
    almacen,
    "ana",
  );
  assert.equal(respuesta.status, 201);
  const cuerpo = (await respuesta.json()) as { tareas: { prioridad: string; dificultad: string | null }[] };
  assert.equal(cuerpo.tareas[0]?.prioridad, "high");
  assert.equal(cuerpo.tareas[0]?.dificultad, "hard");
  const tarea = await tareaCreada(almacen, "Cajas");
  assert.equal(tarea?.prioridad, "high");
  assert.equal(tarea?.dificultad, "hard");
});

test("una prioridad o dificultad desconocida no crea el evento", async () => {
  const almacen = crearMemoria();
  const prioridad = await crearProyectoHttp(
    pedido([{ titulo: "Cajas", tipo: "trabajo", monto: "8", prioridad: "urgent" }]),
    almacen,
    "ana",
  );
  assert.equal(prioridad.status, 400);
  assert.match(((await prioridad.json()) as { aviso: string }).aviso, /Normal or High/);

  const dificultad = await crearProyectoHttp(
    pedido([{ titulo: "Cajas", tipo: "trabajo", monto: "8", dificultad: "extreme" }]),
    almacen,
    "ana",
  );
  assert.equal(dificultad.status, 400);
  assert.equal((await almacen.listarTareas()).length, 0);
});

test("solo el organizador cambia la prioridad y la dificultad de una tarea", async () => {
  const almacen = crearMemoria();
  const creada = await crearProyectoHttp(pedido([{ titulo: "Cajas", tipo: "trabajo", monto: "8" }]), almacen, "ana");
  assert.equal(creada.status, 201);
  const tarea = await tareaCreada(almacen, "Cajas");
  assert.ok(tarea);

  const ajena = await clasificarTareaHttp(
    new Request("http://local/api/tareas/x/clasificar", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prioridad: "high" }),
    }),
    almacen,
    tarea.id,
    "otra",
  );
  assert.equal(ajena.status, 403);
  assert.equal((await almacen.leerTarea(tarea.id))?.prioridad, "normal");

  const guardada = await clasificarTareaHttp(
    new Request("http://local/api/tareas/x/clasificar", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prioridad: "high", dificultad: "medium" }),
    }),
    almacen,
    tarea.id,
    "ana",
  );
  assert.equal(guardada.status, 200);
  const cuerpo = (await guardada.json()) as { tarea: { prioridad: string; dificultad: string | null } };
  assert.equal(cuerpo.tarea.prioridad, "high");
  assert.equal(cuerpo.tarea.dificultad, "medium");

  const vacia = await clasificarTareaHttp(
    new Request("http://local/api/tareas/x/clasificar", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ dificultad: "" }),
    }),
    almacen,
    tarea.id,
    "ana",
  );
  assert.equal(vacia.status, 200);
  assert.equal((await almacen.leerTarea(tarea.id))?.prioridad, "high");
  assert.equal((await almacen.leerTarea(tarea.id))?.dificultad, null);

  const mala = await clasificarTareaHttp(
    new Request("http://local/api/tareas/x/clasificar", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ dificultad: "extreme" }),
    }),
    almacen,
    tarea.id,
    "ana",
  );
  assert.equal(mala.status, 400);
  assert.equal((await almacen.leerTarea(tarea.id))?.dificultad, null);
});
