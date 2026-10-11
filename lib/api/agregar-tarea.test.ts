import assert from "node:assert/strict";
import test from "node:test";
import { crearMemoria } from "../db/memoria";
import type { Almacen } from "../db/almacen";
import type { TareaFila } from "../db/tipos";
import { AVISO_SOLO_ORGANIZADOR_AGREGAR, agregarTareaHttp } from "./proyectos";

const CREADO = "2026-10-02T00:00:00.000Z";
const WALLET = `G${"A".repeat(55)}`;

const existente: TareaFila = {
  id: "t1",
  proyectoId: "evt",
  titulo: "Stand",
  tipo: "trabajo",
  monto: "10",
  tope: null,
  condicion: "Banner visible",
  miembroId: "",
  walletCobro: "",
  estado: "pendiente",
  hashPago: null,
  credencialUrl: null,
  contratoEscrow: null,
  prioridad: "normal",
  dificultad: null,
};

function pedido(body: unknown): Request {
  return new Request("http://local/api/eventos/evt/tareas", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function escenario(): Promise<Almacen> {
  const almacen = crearMemoria();
  await almacen.insertarUsuario({ id: "org", email: "org@hyto.app", nombre: "Org", rol: "organizador" });
  await almacen.insertarUsuario({ id: "vol", email: "vol@hyto.app", nombre: "Vol", rol: "voluntario" });
  await almacen.crearProyecto({ id: "evt", nombre: "Event", creadoEn: CREADO, organizadorId: "org" }, [existente]);
  await almacen.guardarMiembro({ proyectoId: "evt", usuarioId: "vol", rol: "volunteer", estado: "active", creadoEn: CREADO });
  return almacen;
}

test("el organizador agrega una tarea a un proyecto existente con los campos del asistente", async () => {
  const almacen = await escenario();
  const respuesta = await agregarTareaHttp(
    pedido({ titulo: "  Lunch  ", tipo: "reembolso", monto: "12.5", condicion: "Receipt", asignado: "VOL@hyto.app" }),
    almacen,
    "evt",
    "org",
    { wallet: WALLET, leerSaldo: async () => ({ saldo: "20" }) },
  );
  assert.equal(respuesta.status, 201);
  const { tarea } = (await respuesta.json()) as { tarea: { id: string; titulo: string; tipo: string; monto: string; tope: string; miembroId: string; estado: string } };
  assert.equal(tarea.titulo, "Lunch");
  assert.equal(tarea.tipo, "reembolso");
  assert.equal(tarea.monto, "12.50");
  assert.equal(tarea.tope, "12.50");
  assert.equal(tarea.miembroId, "vol");
  assert.equal(tarea.estado, "pendiente");
  const tareas = (await almacen.listarTareas()).filter((fila) => fila.proyectoId === "evt");
  assert.deepEqual(tareas.map((fila) => fila.titulo).sort(), ["Lunch", "Stand"]);
  // The project row is not touched.
  assert.equal((await almacen.leerProyecto("evt"))?.nombre, "Event");
});

test("solo el organizador puede agregar, y el proyecto tiene que existir", async () => {
  const almacen = await escenario();
  const voluntario = await agregarTareaHttp(pedido({ titulo: "Nope", tipo: "trabajo", monto: "3" }), almacen, "evt", "vol");
  assert.equal(voluntario.status, 403);
  assert.equal(((await voluntario.json()) as { aviso: string }).aviso, AVISO_SOLO_ORGANIZADOR_AGREGAR);
  const otro = await agregarTareaHttp(pedido({ titulo: "Nope", tipo: "trabajo", monto: "3" }), almacen, "nada", "org");
  assert.equal(otro.status, 404);
  assert.equal((await almacen.listarTareas()).length, 1);
});

test("sin título o sin monto no se agrega, ni cuando el saldo no cubre la tarea más la reserva", async () => {
  const almacen = await escenario();
  const sinTitulo = await agregarTareaHttp(pedido({ titulo: " ", tipo: "trabajo", monto: "3" }), almacen, "evt", "org");
  assert.equal(sinTitulo.status, 400);
  const sinMonto = await agregarTareaHttp(pedido({ titulo: "Booth", tipo: "trabajo", monto: "" }), almacen, "evt", "org");
  assert.equal(sinMonto.status, 400);
  const sinSaldo = await agregarTareaHttp(pedido({ titulo: "Booth", tipo: "trabajo", monto: "20" }), almacen, "evt", "org", {
    wallet: WALLET,
    leerSaldo: async () => ({ saldo: "20" }),
  });
  assert.equal(sinSaldo.status, 400);
  assert.equal((await almacen.listarTareas()).length, 1);
});
