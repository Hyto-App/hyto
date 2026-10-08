import assert from "node:assert/strict";
import test from "node:test";
import { crearMemoria } from "../db/memoria";
import type { Almacen } from "../db/almacen";
import type { EvidenciaFila, TareaFila } from "../db/tipos";
import { asignarTareaHttp } from "./asignar";
import { AVISO_CON_FOTO, AVISO_CON_PAGO, AVISO_MONTO_BLOQUEADO, AVISO_SOLO_ORGANIZADOR, editarTareaHttp } from "./editar-tarea";
import { estadoConFoto } from "../ui/etiquetas";

const CREADO = "2026-10-02T00:00:00.000Z";

const trabajo: TareaFila = {
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

const reembolso: TareaFila = {
  ...trabajo,
  id: "t2",
  titulo: "Meal",
  tipo: "reembolso",
  monto: "15",
  tope: "15",
  condicion: "Receipt",
};

function pedido(body: unknown): Request {
  return new Request("http://local/api/tareas/t1", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function escenario(): Promise<Almacen> {
  const almacen = crearMemoria();
  await almacen.insertarUsuario({ id: "org", email: "org@hyto.app", nombre: "Org", rol: "organizador" });
  await almacen.insertarUsuario({ id: "vol", email: "vol@hyto.app", nombre: "Vol", rol: "voluntario" });
  await almacen.insertarUsuario({ id: "team", email: "team@hyto.app", nombre: "Team", rol: "voluntario" });
  await almacen.crearProyecto({ id: "evt", nombre: "Event", creadoEn: CREADO, organizadorId: "org" }, [trabajo, reembolso]);
  await almacen.guardarMiembro({ proyectoId: "evt", usuarioId: "vol", rol: "volunteer", estado: "active", creadoEn: CREADO });
  await almacen.guardarMiembro({ proyectoId: "evt", usuarioId: "team", rol: "team", estado: "active", creadoEn: CREADO });
  return almacen;
}

function evidencia(tareaId: string): EvidenciaFila {
  return {
    id: `foto-${tareaId}`,
    tareaId,
    blobId: "blob",
    monto: null,
    montoConfirmado: null,
    fecha: null,
    creadaEn: CREADO,
  };
}

test("sin evidencia el organizador puede editar título, condición, monto, tope y asignado", async () => {
  const almacen = await escenario();
  const respuesta = await editarTareaHttp(
    pedido({ titulo: "  Booth  ", condicion: "Table set", monto: "12.5", miembroId: "vol" }),
    almacen,
    "t1",
    "org",
  );
  assert.equal(respuesta.status, 200);
  const fila = await almacen.leerTarea("t1");
  assert.equal(fila?.titulo, "Booth");
  assert.equal(fila?.condicion, "Table set");
  assert.equal(fila?.monto, "12.50");
  assert.equal(fila?.miembroId, "vol");
  assert.equal(fila?.estado, "pendiente");
  assert.equal(fila?.contratoEscrow, null);

  const tope = await editarTareaHttp(
    pedido({ titulo: "Lunch", condicion: "Receipt photo", monto: "12", tope: "14", miembroId: "" }),
    almacen,
    "t2",
    "org",
  );
  assert.equal(tope.status, 200);
  const comida = await almacen.leerTarea("t2");
  assert.equal(comida?.monto, "12");
  assert.equal(comida?.tope, "14");
  assert.equal(comida?.miembroId, "");
});

test("cambiar a la persona asignada borra la cuenta de cobro de la anterior; mantenerla la conserva", async () => {
  const almacen = await escenario();
  const cuenta = "G" + "A".repeat(55);
  await almacen.actualizarTarea("t1", { miembroId: "vol", walletCobro: cuenta });
  const misma = await editarTareaHttp(pedido({ titulo: "Booth", miembroId: "vol" }), almacen, "t1", "org");
  assert.equal(misma.status, 200);
  assert.equal((await almacen.leerTarea("t1"))?.walletCobro, cuenta);
  const otra = await editarTareaHttp(pedido({ miembroId: "team" }), almacen, "t1", "org");
  assert.equal(otra.status, 200);
  const fila = await almacen.leerTarea("t1");
  assert.equal(fila?.miembroId, "team");
  assert.equal(fila?.walletCobro, "");
});

test("con evidencia la edición y la asignación quedan bloqueadas", async () => {
  const almacen = await escenario();
  await almacen.crearEvidencia(evidencia("t1"));
  const respuesta = await editarTareaHttp(pedido({ titulo: "Other", monto: "99" }), almacen, "t1", "org");
  assert.equal(respuesta.status, 409);
  assert.equal(((await respuesta.json()) as { aviso: string }).aviso, AVISO_CON_FOTO);
  assert.equal((await almacen.leerTarea("t1"))?.titulo, "Stand");
  assert.equal((await almacen.leerTarea("t1"))?.monto, "10");

  const asignada = await asignarTareaHttp(pedido({ usuarioId: "vol" }), almacen, "t1", "org");
  assert.equal(asignada.status, 409);
  assert.equal(((await asignada.json()) as { aviso: string }).aviso, AVISO_CON_FOTO);
  assert.equal((await almacen.leerTarea("t1"))?.miembroId, "");
});

test("un voluntario o un miembro de equipo no puede editar", async () => {
  const almacen = await escenario();
  for (const quien of ["vol", "team"]) {
    const respuesta = await editarTareaHttp(pedido({ titulo: "Nope", monto: "3" }), almacen, "t1", quien);
    assert.equal(respuesta.status, 403);
    assert.equal(((await respuesta.json()) as { aviso: string }).aviso, AVISO_SOLO_ORGANIZADOR);
  }
  assert.equal((await almacen.leerTarea("t1"))?.titulo, "Stand");
  assert.equal((await almacen.leerTarea("t1"))?.monto, "10");
});

test("un monto ya guardado en el contrato no se puede cambiar", async () => {
  const almacen = await escenario();
  await almacen.actualizarTarea("t1", { contratoEscrow: "C" + "A".repeat(55) });
  const respuesta = await editarTareaHttp(pedido({ titulo: "Other", monto: "40" }), almacen, "t1", "org");
  assert.equal(respuesta.status, 409);
  assert.equal(((await respuesta.json()) as { aviso: string }).aviso, AVISO_MONTO_BLOQUEADO);
  const fila = await almacen.leerTarea("t1");
  assert.equal(fila?.titulo, "Stand");
  assert.equal(fila?.monto, "10");
});

test("una tarea pagada no se puede editar", async () => {
  const almacen = await escenario();
  await almacen.actualizarTarea("t1", { estado: "pagado", hashPago: "a".repeat(64) });
  const respuesta = await editarTareaHttp(pedido({ monto: "1" }), almacen, "t1", "org");
  assert.equal(respuesta.status, 409);
  assert.equal(((await respuesta.json()) as { aviso: string }).aviso, AVISO_CON_PAGO);
  assert.equal((await almacen.leerTarea("t1"))?.monto, "10");
});

test("el cuerpo no puede cambiar el estado ni el contrato", async () => {
  const almacen = await escenario();
  const respuesta = await editarTareaHttp(
    pedido({ titulo: "Booth", estado: "pagado", contratoEscrow: "C" + "B".repeat(55), walletCobro: "G" + "C".repeat(55) }),
    almacen,
    "t1",
    "org",
  );
  assert.equal(respuesta.status, 200);
  const fila = await almacen.leerTarea("t1");
  assert.equal(fila?.titulo, "Booth");
  assert.equal(fila?.estado, "pendiente");
  assert.equal(fila?.contratoEscrow, null);
  assert.equal(fila?.walletCobro, "");
});

test("subir el tope por encima del saldo avisa con dos decimales y no guarda", async () => {
  const almacen = await escenario();
  const wallet = "G".padEnd(56, "A");
  const respuesta = await editarTareaHttp(
    pedido({ titulo: "Lunch", condicion: "Receipt photo", monto: "15", tope: "50" }),
    almacen,
    "t2",
    "org",
    { wallet, leerSaldo: async () => ({ saldo: "1.30" }) },
  );
  assert.equal(respuesta.status, 400);
  const aviso = ((await respuesta.json()) as { aviso: string }).aviso;
  assert.match(aviso, /US\$51\.00/);
  assert.match(aviso, /US\$1\.00 reserve/);
  assert.match(aviso, /You are short US\$49\.70/);
  assert.equal(/US\$51(?!\.00)/.test(aviso), false);
  assert.equal(/US\$49\.7(?!0)/.test(aviso), false);
  assert.equal((await almacen.leerTarea("t2"))?.tope, "15");
});

test("bajar el tope o editar el título sigue guardando aunque el saldo no cubra el monto anterior", async () => {
  const almacen = await escenario();
  const wallet = "G".padEnd(56, "A");
  const titulo = await editarTareaHttp(
    pedido({ titulo: "Lunch note", monto: "15", tope: "15" }),
    almacen,
    "t2",
    "org",
    { wallet, leerSaldo: async () => ({ saldo: "1.30" }) },
  );
  assert.equal(titulo.status, 200);
  const baja = await editarTareaHttp(
    pedido({ titulo: "Lunch note", monto: "2", tope: "2" }),
    almacen,
    "t2",
    "org",
    { wallet, leerSaldo: async () => ({ saldo: "1.30" }) },
  );
  assert.equal(baja.status, 200);
  assert.equal((await almacen.leerTarea("t2"))?.tope, "2");
});

test("un tope que el saldo sí cubre se guarda", async () => {
  const almacen = await escenario();
  const respuesta = await editarTareaHttp(
    pedido({ titulo: "Lunch", monto: "12", tope: "14" }),
    almacen,
    "t2",
    "org",
    { wallet: "G".padEnd(56, "A"), leerSaldo: async () => ({ saldo: "100.00" }) },
  );
  assert.equal(respuesta.status, 200);
  assert.equal((await almacen.leerTarea("t2"))?.tope, "14");
});

test("estadoConFoto keeps a pending task pending when a photo exists", () => {
  assert.equal(estadoConFoto("pendiente", true), "pendiente");
  assert.equal(estadoConFoto("pendiente", false), "pendiente");
  assert.equal(estadoConFoto("en revisión", true), "en revisión");
  assert.equal(estadoConFoto("pagado", true), "pagado");
});
