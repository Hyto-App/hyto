import assert from "node:assert/strict";
import test from "node:test";
import { crearMemoria } from "../db/memoria";
import type { Almacen } from "../db/almacen";
import { agregarTareaHttp } from "./proyectos";

const WALLET = `G${"A".repeat(55)}`;
const CON_SALDO = { wallet: WALLET, leerSaldo: async () => ({ saldo: "100" }) };

async function preparar(): Promise<Almacen> {
  const almacen = crearMemoria();
  await almacen.insertarUsuario({ id: "org", email: "org@hyto.dev", nombre: "Org", rol: "voluntario" });
  await almacen.insertarUsuario({ id: "ana", email: "ana@hyto.dev", nombre: "Ana", rol: "voluntario" });
  await almacen.crearProyecto(
    { id: "evt", nombre: "Feria", creadoEn: "2026-10-01T00:00:00.000Z", organizadorId: "org" },
    [
      {
        id: "stand",
        proyectoId: "evt",
        titulo: "Booth",
        tipo: "trabajo",
        monto: "20",
        tope: null,
        condicion: "",
        miembroId: "",
        walletCobro: "",
        estado: "pendiente",
        hashPago: null,
        contratoEscrow: null,
        credencialUrl: null,
        prioridad: "normal",
        dificultad: null,
      },
    ],
  );
  return almacen;
}

function pedido(tarea: unknown): Request {
  return new Request("http://local/api/eventos/evt/tareas", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ tarea }),
  });
}

test("quien organiza agrega una tarea a un proyecto que ya existe, asignada por correo", async () => {
  const almacen = await preparar();
  const respuesta = await agregarTareaHttp(
    pedido({ titulo: "Team meal", tipo: "reembolso", monto: "15", condicion: "Receipt", asignado: "ana@hyto.dev" }),
    almacen,
    "evt",
    "org",
    CON_SALDO,
  );
  assert.equal(respuesta.status, 201);
  const cuerpo = (await respuesta.json()) as { tarea: { id: string; titulo: string; tipo: string; tope: string | null; miembroId: string } };
  assert.equal(cuerpo.tarea.titulo, "Team meal");
  assert.equal(cuerpo.tarea.tipo, "reembolso");
  assert.equal(cuerpo.tarea.tope, "15");
  assert.equal(cuerpo.tarea.miembroId, "ana");
  const delEvento = (await almacen.listarTareas()).filter((tarea) => tarea.proyectoId === "evt");
  assert.deepEqual(delEvento.map((tarea) => tarea.id).sort(), [cuerpo.tarea.id, "stand"].sort());
  // The project keeps its name and the organizer stays organizer.
  assert.equal((await almacen.leerProyecto("evt"))?.nombre, "Feria");
  const miembros = await almacen.listarMiembros("evt");
  assert.equal(miembros.find((miembro) => miembro.usuarioId === "org")?.rol, "organizer");
  assert.equal(miembros.find((miembro) => miembro.usuarioId === "ana")?.rol, "volunteer");
});

test("solo quien organiza agrega tareas; un proyecto que no existe da 404", async () => {
  const almacen = await preparar();
  const ajena = await agregarTareaHttp(pedido({ titulo: "X", tipo: "trabajo", monto: "5" }), almacen, "evt", "ana", CON_SALDO);
  assert.equal(ajena.status, 403);
  const falta = await agregarTareaHttp(pedido({ titulo: "X", tipo: "trabajo", monto: "5" }), almacen, "otro", "org", CON_SALDO);
  assert.equal(falta.status, 404);
  assert.equal((await almacen.listarTareas()).length, 1);
});

test("la tarea nueva se valida como al crear el proyecto y el saldo cubre la tarea más la reserva", async () => {
  const almacen = await preparar();
  const sinTitulo = await agregarTareaHttp(pedido({ titulo: " ", tipo: "trabajo", monto: "5" }), almacen, "evt", "org", CON_SALDO);
  assert.equal(sinTitulo.status, 400);
  const sinMonto = await agregarTareaHttp(pedido({ titulo: "X", tipo: "trabajo" }), almacen, "evt", "org", CON_SALDO);
  assert.equal(sinMonto.status, 400);
  const corto = await agregarTareaHttp(pedido({ titulo: "X", tipo: "trabajo", monto: "10" }), almacen, "evt", "org", {
    wallet: WALLET,
    leerSaldo: async () => ({ saldo: "10" }),
  });
  assert.equal(corto.status, 400);
  assert.equal((await almacen.listarTareas()).length, 1);
});
