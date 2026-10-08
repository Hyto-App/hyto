import assert from "node:assert/strict";
import test from "node:test";
import { asignarTareaHttp } from "@/lib/api/asignar";
import { crearComunidadHttp } from "@/lib/api/comunidades";
import { crearProyectoHttp } from "@/lib/api/proyectos";
import { listarTablonHttp, tomarTareaHttp } from "@/lib/api/tablon";
import { crearMemoria } from "@/lib/db/memoria";
import type { Almacen } from "@/lib/db/almacen";
import { texto } from "@/lib/ui/diccionario";
import { tablonActivo } from "@/lib/tablon/bandera";
import { avisarCompletada } from "@/lib/tablon/publicar";

function conInterruptores(trabajo: () => Promise<void>): Promise<void> {
  const previoComunidades = process.env.HYTO_COMUNIDADES;
  const previoTablon = process.env.HYTO_TABLON;
  process.env.HYTO_COMUNIDADES = "on";
  process.env.HYTO_TABLON = "on";
  return trabajo().finally(() => {
    if (previoComunidades === undefined) delete process.env.HYTO_COMUNIDADES;
    else process.env.HYTO_COMUNIDADES = previoComunidades;
    if (previoTablon === undefined) delete process.env.HYTO_TABLON;
    else process.env.HYTO_TABLON = previoTablon;
  });
}

test("el tablón solo se enciende con on", () => {
  assert.equal(tablonActivo({}), false);
  assert.equal(tablonActivo({ HYTO_TABLON: "" }), false);
  assert.equal(tablonActivo({ HYTO_TABLON: "off" }), false);
  assert.equal(tablonActivo({ HYTO_TABLON: "true" }), false);
  assert.equal(tablonActivo({ HYTO_TABLON: "ON" }), true);
  assert.equal(tablonActivo({ HYTO_TABLON: " on " }), true);
});

test("apagado no escribe avisos ni deja tomar una tarea", async () => {
  const previoComunidades = process.env.HYTO_COMUNIDADES;
  const previoTablon = process.env.HYTO_TABLON;
  process.env.HYTO_COMUNIDADES = "on";
  delete process.env.HYTO_TABLON;
  try {
    const almacen = crearMemoria();
    let avisos = 0;
    almacen.crearAvisoComunidad = async () => {
      avisos += 1;
    };
    almacen.listarAvisosComunidad = async () => {
      avisos += 1;
      return [];
    };
    await sembrar(almacen);
    const comunidadId = await comunidad(almacen);
    const creado = await crearProyectoHttp(pedidoEvento(comunidadId, ""), almacen, "ana");
    assert.equal(creado.status, 201);
    const tareaId = ((await creado.json()) as { tareas: { id: string }[] }).tareas[0]!.id;
    const lista = await listarTablonHttp(almacen, "ana", comunidadId);
    assert.equal(lista.status, 404);
    const toma = await tomarTareaHttp(almacen, "leo", tareaId);
    assert.equal(toma.status, 404);
    assert.equal((await almacen.leerTarea(tareaId))?.miembroId, "");
    assert.equal(avisos, 0);
  } finally {
    if (previoComunidades === undefined) delete process.env.HYTO_COMUNIDADES;
    else process.env.HYTO_COMUNIDADES = previoComunidades;
    if (previoTablon === undefined) delete process.env.HYTO_TABLON;
    else process.env.HYTO_TABLON = previoTablon;
  }
});

test("un aviso sale al crear, al asignar y al completar, y el primero que toma se queda con la tarea", async () => {
  await conInterruptores(async () => {
    const almacen = crearMemoria();
    await sembrar(almacen);
    const comunidadId = await comunidad(almacen);
    await almacen.guardarMiembroComunidad({
      comunidadId,
      usuarioId: "leo",
      rol: "miembro",
      creadoEn: "2026-10-08T00:00:00.000Z",
    });
    await almacen.guardarMiembroComunidad({
      comunidadId,
      usuarioId: "sol",
      rol: "miembro",
      creadoEn: "2026-10-08T00:00:00.000Z",
    });
    const creado = await crearProyectoHttp(pedidoEvento(comunidadId, ""), almacen, "ana");
    assert.equal(creado.status, 201);
    const cuerpo = (await creado.json()) as { proyecto: { id: string }; tareas: { id: string; titulo: string }[] };
    const tareaId = cuerpo.tareas[0]!.id;
    const libres = await listarTablonHttp(almacen, "leo", comunidadId);
    const avisoLibre = ((await libres.json()) as { avisos: { tipo: string; titulo: string; libre: boolean }[] }).avisos[0];
    assert.equal(avisoLibre?.tipo, "disponible");
    assert.equal(avisoLibre?.libre, true);
    assert.equal(texto("es", "tablon.disponible", { titulo: avisoLibre!.titulo }), "Nueva tarea disponible: Montar, la toma el primero que pueda");

    const ajena = await tomarTareaHttp(almacen, "nadie", tareaId);
    assert.equal(ajena.status, 403);
    const primera = await tomarTareaHttp(almacen, "leo", tareaId);
    assert.equal(primera.status, 200);
    const segunda = await tomarTareaHttp(almacen, "sol", tareaId);
    assert.equal(segunda.status, 409);
    assert.equal((await almacen.leerTarea(tareaId))?.miembroId, "leo");
    const miembros = await almacen.listarMiembros(cuerpo.proyecto.id);
    assert.equal(miembros.find((miembro) => miembro.usuarioId === "ana")?.rol, "organizer");
    assert.equal(miembros.find((miembro) => miembro.usuarioId === "leo")?.rol, "volunteer");

    const asignada = await listarTablonHttp(almacen, "ana", comunidadId);
    const avisos = ((await asignada.json()) as { avisos: { tipo: string; titulo: string; nombre: string | null; libre: boolean }[] }).avisos;
    const tomada = avisos.find((aviso) => aviso.tipo === "asignada");
    assert.equal(tomada?.nombre, "Leo");
    assert.equal(texto("es", "tablon.asignada", { titulo: "Montar", nombre: "Leo" }), "La tarea Montar se le asignó a Leo");
    assert.equal(avisos.some((aviso) => aviso.tipo === "disponible" && aviso.libre), false);

    await almacen.actualizarTarea(tareaId, { estado: "pagado" });
    await avisarCompletada(almacen, tareaId);
    await avisarCompletada(almacen, tareaId);
    const final = ((await (await listarTablonHttp(almacen, "ana", comunidadId)).json()) as { avisos: { tipo: string }[] }).avisos;
    assert.equal(final.filter((aviso) => aviso.tipo === "completada").length, 1);
    assert.equal(texto("es", "tablon.completada", { titulo: "Montar" }), "Tarea completada: Montar");
  });
});

test("quien organiza puede tomar una tarea libre y sigue siendo organizador del evento", async () => {
  await conInterruptores(async () => {
    const almacen = crearMemoria();
    await sembrar(almacen);
    const comunidadId = await comunidad(almacen);
    const creado = await crearProyectoHttp(pedidoEvento(comunidadId, "leo"), almacen, "ana");
    const cuerpo = (await creado.json()) as { proyecto: { id: string }; tareas: { id: string }[] };
    const asignadas = await listarTablonHttp(almacen, "ana", comunidadId);
    const aviso = ((await asignadas.json()) as { avisos: { tipo: string; nombre: string | null }[] }).avisos[0];
    assert.equal(aviso?.tipo, "asignada");
    assert.equal(aviso?.nombre, "Leo");
    const pedido = new Request("http://local/api/tareas", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ usuarioId: "" }),
    });
    const suelta = await asignarTareaHttp(pedido, almacen, cuerpo.tareas[0]!.id, "ana");
    assert.equal(suelta.status, 200);
    const toma = await tomarTareaHttp(almacen, "ana", cuerpo.tareas[0]!.id);
    assert.equal(toma.status, 200);
    assert.equal((await almacen.leerTarea(cuerpo.tareas[0]!.id))?.miembroId, "ana");
    assert.equal((await almacen.listarMiembros(cuerpo.proyecto.id)).find((miembro) => miembro.usuarioId === "ana")?.rol, "organizer");
    assert.equal((await almacen.listarMiembros(cuerpo.proyecto.id)).find((miembro) => miembro.usuarioId === "leo")?.rol, "volunteer");
  });
});

async function sembrar(almacen: Almacen) {
  await almacen.insertarUsuario({ id: "ana", email: "ana@hyto.test", nombre: "Ana", rol: "organizador" });
  await almacen.insertarUsuario({ id: "leo", email: "leo@hyto.test", nombre: "Leo", rol: "voluntario" });
  await almacen.insertarUsuario({ id: "sol", email: "sol@hyto.test", nombre: "Sol", rol: "voluntario" });
}

async function comunidad(almacen: Almacen): Promise<string> {
  const creada = await crearComunidadHttp(almacen, "ana", { nombre: "Norte", visibilidad: "publica" });
  return ((await creada.json()) as { comunidad: { id: string } }).comunidad.id;
}

function pedidoEvento(comunidadId: string, miembroId: string): Request {
  return new Request("http://local/api/proyectos", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      nombre: "Feria",
      comunidadId,
      tareas: [{ titulo: "Montar", tipo: "trabajo", monto: "20", condicion: "Foto del stand", miembroId }],
    }),
  });
}
