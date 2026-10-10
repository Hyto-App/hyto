import assert from "node:assert/strict";
import test from "node:test";
import { crearMemoria } from "../db/memoria";
import type { TareaFila } from "../db/tipos";
import { asignarTareaHttp } from "./asignar";

const tarea: TareaFila = {
  id: "t1",
  proyectoId: "evt",
  titulo: "Stand",
  tipo: "trabajo",
  monto: "10",
  tope: null,
  condicion: "",
  miembroId: "vol",
  walletCobro: "",
  estado: "pendiente",
  hashPago: null,
  credencialUrl: null,
  contratoEscrow: null,
  prioridad: "normal",
  dificultad: null,
};

test("el organizador puede dejar una tarea sin asignar", async () => {
  const almacen = crearMemoria();
  await almacen.insertarUsuario({ id: "org", email: "org@hyto.app", nombre: "Org", rol: "organizador" });
  await almacen.crearProyecto({ id: "evt", nombre: "Event", creadoEn: "2026-01-01T00:00:00.000Z", organizadorId: "org" }, [tarea]);
  const respuesta = await asignarTareaHttp(
    new Request("http://local/api/tareas/t1/asignar", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ usuarioId: "" }),
    }),
    almacen,
    "t1",
    "org",
  );
  assert.equal(respuesta.status, 200);
  assert.equal((await almacen.leerTarea("t1"))?.miembroId, "");
});

test("reasignar una tarea sin foto borra la cuenta de cobro de la persona anterior", async () => {
  const cuenta = "G" + "A".repeat(55);
  const almacen = crearMemoria();
  await almacen.insertarUsuario({ id: "org", email: "org@hyto.app", nombre: "Org", rol: "organizador" });
  await almacen.crearProyecto({ id: "evt", nombre: "Event", creadoEn: "2026-01-01T00:00:00.000Z", organizadorId: "org" }, [
    { ...tarea, walletCobro: cuenta },
  ]);
  for (const usuarioId of ["vol", "vol2"]) {
    await almacen.guardarMiembro({ proyectoId: "evt", usuarioId, rol: "volunteer", estado: "active", creadoEn: "2026-01-01T00:00:00.000Z" });
  }
  const asignar = (usuarioId: string) =>
    asignarTareaHttp(
      new Request("http://local/api/tareas/t1/asignar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ usuarioId }),
      }),
      almacen,
      "t1",
      "org",
    );

  assert.equal((await asignar("vol")).status, 200);
  assert.equal((await almacen.leerTarea("t1"))?.walletCobro, cuenta);
  assert.equal((await asignar("vol2")).status, 200);
  const fila = await almacen.leerTarea("t1");
  assert.equal(fila?.miembroId, "vol2");
  assert.equal(fila?.walletCobro, "");

  await almacen.actualizarTarea("t1", { walletCobro: cuenta });
  assert.equal((await asignar("")).status, 200);
  assert.equal((await almacen.leerTarea("t1"))?.walletCobro, "");
});
