import assert from "node:assert/strict";
import test from "node:test";
import { crearMemoria } from "../db/memoria";
import type { Almacen } from "../db/almacen";
import type { TareaFila } from "../db/tipos";
import { usuarioDemo } from "../sesion/demo";
import { cambioDeMiembro, cuentaDeCobro, faltaCobroDe, guardarCobroPropio } from "./cobro";

const CREADO = "2026-10-08T00:00:00.000Z";
const VIEJA = "G" + "A".repeat(55);
const NUEVA = "G" + "B".repeat(55);
const AJENA = "G" + "C".repeat(55);
const CONTRATO = "C" + "D".repeat(55);

function tarea(id: string, parcial: Partial<TareaFila> = {}): TareaFila {
  return {
    id,
    proyectoId: "evt",
    titulo: `Task ${id}`,
    tipo: "trabajo",
    monto: "20",
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
    ...parcial,
  };
}

function correo(usuarioId: string): string {
  return `${usuarioId}@hyto.test`;
}

async function escenario(tareas: TareaFila[]): Promise<Almacen> {
  const almacen = crearMemoria();
  for (const id of ["org", "vol", "otra"]) {
    await almacen.insertarUsuario({ id, email: correo(id), nombre: id, rol: "voluntario" });
  }
  await almacen.crearProyecto({ id: "evt", nombre: "Event", creadoEn: CREADO, organizadorId: "org" }, tareas);
  return almacen;
}

async function sesion(almacen: Almacen, token: string, usuarioId: string, wallet: string, expiraEn = CREADO, email = correo(usuarioId)) {
  await almacen.crearSesion({ token, email, usuarioId, rol: "voluntario", expiraEn, wallet });
}

async function foto(almacen: Almacen, tareaId: string, creadaEn: string) {
  await almacen.crearEvidencia({ id: `foto-${tareaId}`, tareaId, blobId: "blob", monto: null, montoConfirmado: null, fecha: null, creadaEn });
}

test("la cuenta guardada en la tarea gana, y sin persona asignada no hay a quién pagar", async () => {
  const almacen = await escenario([tarea("guardada", { walletCobro: ` ${VIEJA} ` }), tarea("libre", { miembroId: "" })]);
  await sesion(almacen, "s1", "vol", NUEVA);
  assert.equal(await cuentaDeCobro(almacen, tarea("guardada", { walletCobro: ` ${VIEJA} ` })), VIEJA);
  assert.equal(await cuentaDeCobro(almacen, tarea("libre", { miembroId: "" })), null);
});

test("sin foto usa la sesión más nueva de la persona asignada, nunca la de otra persona ni una demo", async () => {
  const nueva = tarea("nueva");
  const almacen = await escenario([nueva]);
  await sesion(almacen, "ajena", "otra", AJENA, "2026-10-09T00:00:00.000Z");
  await sesion(almacen, "demo", "vol", AJENA, "2026-10-10T00:00:00.000Z", usuarioDemo("voluntario").email);
  assert.equal(await cuentaDeCobro(almacen, nueva), null);
  await sesion(almacen, "vieja", "vol", VIEJA, "2026-10-08T01:00:00.000Z");
  await sesion(almacen, "reciente", "vol", NUEVA, "2026-10-08T05:00:00.000Z");
  assert.equal(await cuentaDeCobro(almacen, nueva), NUEVA);
});

test("si la persona cerró sesión, usa la cuenta de sus otras tareas y, con varias, la de la foto más nueva", async () => {
  const nueva = tarea("nueva");
  const almacen = await escenario([
    nueva,
    tarea("pagada", { estado: "pagado", hashPago: "ab".repeat(32), contratoEscrow: CONTRATO, walletCobro: VIEJA }),
    tarea("ajena", { miembroId: "otra", walletCobro: AJENA }),
  ]);
  assert.equal(await cuentaDeCobro(almacen, nueva), VIEJA);

  await almacen.crearProyecto({ id: "evt2", nombre: "Event 2", creadoEn: CREADO, organizadorId: "org" }, [
    tarea("revisada", { proyectoId: "evt2", estado: "en revisión", walletCobro: NUEVA }),
  ]);
  await foto(almacen, "pagada", "2026-10-01T00:00:00.000Z");
  await foto(almacen, "revisada", "2026-10-07T00:00:00.000Z");
  assert.equal(await cuentaDeCobro(almacen, nueva), NUEVA);
});

test("el chequeo previo distingue sin asignar, sin cuenta, y ya bloqueada o pagada", async () => {
  const almacen = await escenario([]);
  assert.equal(await faltaCobroDe(almacen, tarea("libre", { miembroId: "" })), "asignar");
  assert.equal(await faltaCobroDe(almacen, tarea("sola")), "cuenta");
  assert.equal(await faltaCobroDe(almacen, tarea("bloqueada", { contratoEscrow: CONTRATO })), null);
  assert.equal(await faltaCobroDe(almacen, tarea("pagada", { estado: "pagado" })), null);
  assert.equal(await faltaCobroDe(almacen, tarea("enviada", { hashPago: "ab".repeat(32) })), null);
  await sesion(almacen, "s1", "vol", NUEVA);
  assert.equal(await faltaCobroDe(almacen, tarea("sola")), null);
});

test("abrir las tareas guarda la cuenta solo en las propias abiertas que no tenían una", async () => {
  const filas = [
    tarea("abierta"),
    tarea("con-cuenta", { walletCobro: VIEJA }),
    tarea("bloqueada", { contratoEscrow: CONTRATO }),
    tarea("pagada", { estado: "pagado" }),
    tarea("de-otra", { miembroId: "otra" }),
  ];
  const almacen = await escenario(filas);
  const salida = await guardarCobroPropio(almacen, filas, "vol", ` ${NUEVA} `);
  assert.equal((await almacen.leerTarea("abierta"))?.walletCobro, NUEVA);
  assert.equal(salida.find((fila) => fila.id === "abierta")?.walletCobro, NUEVA);
  assert.equal((await almacen.leerTarea("con-cuenta"))?.walletCobro, VIEJA);
  assert.equal((await almacen.leerTarea("bloqueada"))?.walletCobro, "");
  assert.equal((await almacen.leerTarea("pagada"))?.walletCobro, "");
  assert.equal((await almacen.leerTarea("de-otra"))?.walletCobro, "");

  const sinCuenta = await escenario([tarea("abierta")]);
  await guardarCobroPropio(sinCuenta, [tarea("abierta")], "vol", "no-es-cuenta");
  assert.equal((await sinCuenta.leerTarea("abierta"))?.walletCobro, "");
});

test("la cuenta guardada se queda con la misma persona y se borra si la tarea pasa a otra", () => {
  assert.deepEqual(cambioDeMiembro({ miembroId: "vol" }, "vol"), { miembroId: "vol" });
  assert.deepEqual(cambioDeMiembro({ miembroId: "vol" }, "otra"), { miembroId: "otra", walletCobro: "" });
  assert.deepEqual(cambioDeMiembro({ miembroId: "vol" }, ""), { miembroId: "", walletCobro: "" });
});
