import assert from "node:assert/strict";
import test from "node:test";
import { crearMemoria } from "@/lib/db/memoria";
import type { TareaFila } from "@/lib/db/tipos";
import { listarTareasHttp } from "./tareas";

const CREADO = "2026-10-08T00:00:00.000Z";
const CORREO = "ana@hyto.app";

function tarea(proyectoId: string): TareaFila {
  return {
    id: "stand",
    proyectoId,
    titulo: "Booth",
    tipo: "trabajo",
    monto: "10",
    tope: null,
    condicion: "Banner visible",
    miembroId: "luis",
    walletCobro: "",
    estado: "pendiente",
    hashPago: null,
    credencialUrl: null,
    contratoEscrow: null,
    prioridad: "normal",
    dificultad: null,
  };
}

test("quien cobra no ve el pedazo del correo: usa el evento y, si no hay, nadie", async () => {
  const almacen = crearMemoria();
  await almacen.insertarUsuario({ id: "ana", email: CORREO, nombre: "ana", rol: "voluntario" });
  await almacen.insertarUsuario({ id: "luis", email: "luis@hyto.app", nombre: "Luis", rol: "voluntario" });
  await almacen.crearProyecto({ id: "feria", nombre: "Feria", creadoEn: CREADO, organizadorId: "ana" }, [tarea("feria")]);
  const suelta = { ...tarea("vacio"), id: "suelta" };
  await almacen.crearProyecto({ id: "vacio", nombre: " ", creadoEn: CREADO, organizadorId: "ana" }, [suelta]);

  const lista = await listarTareasHttp(almacen, { usuarioId: "luis", demo: false }, "mias");
  const cuerpo = (await lista.json()) as { tareas: { id: string; organizador: { nombre: string } | null }[] };
  const feria = cuerpo.tareas.find((item) => item.id === "stand");
  const sinEvento = cuerpo.tareas.find((item) => item.id === "suelta");
  assert.equal(feria?.organizador?.nombre, "Feria");
  assert.equal(sinEvento?.organizador, null);
  assert.equal(JSON.stringify(cuerpo).includes("ana@"), false);
  assert.equal(JSON.stringify(cuerpo).includes("@"), false);

  await almacen.guardarUsuario({ id: "ana", email: CORREO, nombre: "Ana Rojas", rol: "voluntario" });
  const conNombre = await listarTareasHttp(almacen, { usuarioId: "luis", demo: false }, "mias");
  const nombrado = (await conNombre.json()) as { tareas: { id: string; organizador: { nombre: string } | null }[] };
  assert.equal(nombrado.tareas.find((item) => item.id === "stand")?.organizador?.nombre, "Ana Rojas");
});
