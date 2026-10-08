import assert from "node:assert/strict";
import test from "node:test";
import { leerCuentaHttp } from "@/lib/api/cuenta";
import { crearMemoria } from "@/lib/db/memoria";
import type { EvidenciaFila, Proyecto, SesionFila, TareaFila } from "@/lib/db/tipos";
import { montoRecibido } from "@/lib/escrow/recibido";
import type { LectorSaldo } from "@/lib/escrow/saldo";
import { usuarioDemo } from "@/lib/sesion/demo";
import { armarVistaCuenta } from "./panel-cuenta";

const AHORA = new Date("2026-10-15T18:00:00.000Z");
const WALLET = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";

function proyecto(id: string, nombre: string): Proyecto {
  return { id, nombre, creadoEn: "2026-09-01T12:00:00.000Z", organizadorId: "org" };
}

function tarea(parcial: Partial<TareaFila> & Pick<TareaFila, "id" | "proyectoId" | "miembroId">): TareaFila {
  return {
    titulo: parcial.id,
    tipo: "trabajo",
    monto: "20",
    tope: null,
    condicion: "",
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

function evidencia(tareaId: string, creadaEn: string, montoConfirmado: string | null = null): EvidenciaFila {
  return {
    id: `ev-${tareaId}`,
    tareaId,
    blobId: `blob-${tareaId}`,
    monto: montoConfirmado,
    montoConfirmado,
    fecha: null,
    creadaEn,
  };
}

function sesion(parcial: Partial<SesionFila> = {}): SesionFila {
  return {
    token: "token",
    email: "ana@hyto.test",
    usuarioId: "ana",
    rol: "voluntario",
    expiraEn: "2099-01-01T00:00:00.000Z",
    wallet: WALLET,
    ...parcial,
  };
}

test("solo suma los hitos liberados de la persona que inició sesión", async () => {
  const almacen = crearMemoria();
  await almacen.crearProyecto(proyecto("zeek", "ZEEK"), [
    tarea({ id: "mia", proyectoId: "zeek", miembroId: "ana", titulo: "Booth", estado: "pagado", hashPago: "a".repeat(64) }),
    tarea({ id: "ajena", proyectoId: "zeek", miembroId: "otro", titulo: "List", estado: "pagado", hashPago: "b".repeat(64), monto: "100" }),
    tarea({ id: "sin-hash", proyectoId: "zeek", miembroId: "ana", estado: "pagado", hashPago: null, monto: "50" }),
    tarea({ id: "pendiente", proyectoId: "zeek", miembroId: "ana", estado: "en revisión" }),
  ]);
  await almacen.crearEvidencia(evidencia("mia", "2026-10-10T18:00:00.000Z"));
  await almacen.crearEvidencia(evidencia("ajena", "2026-10-10T18:00:00.000Z"));

  let lecturas = 0;
  const leerSaldo: LectorSaldo = async (direccion) => {
    lecturas += 1;
    assert.equal(direccion, WALLET);
    return { saldo: "18.5000000" };
  };
  const vista = await armarVistaCuenta({
    almacen,
    usuarioId: "ana",
    email: "ana@hyto.test",
    wallet: WALLET,
    demo: false,
    ahora: AHORA,
    leerSaldo,
  });

  assert.equal(vista.muestra, false);
  assert.equal(vista.walletMuestra, false);
  assert.equal(vista.saldo, "18.5000000");
  assert.equal(vista.saldoEstado, "ok");
  assert.equal(vista.orgullo.total, montoRecibido("20"));
  assert.equal(vista.orgullo.tareasCompletadas, 1);
  assert.equal(vista.orgullo.proyectosCompletados, 0);
  assert.equal(vista.orgullo.recientes[0]?.titulo, "Booth");
  assert.equal(vista.orgullo.recientes[0]?.proyecto, "ZEEK");
  assert.equal(lecturas, 1);
  assert.equal(JSON.stringify(vista).includes("secret"), false);
});

test("el reembolso usa el monto confirmado y no el tope", async () => {
  const almacen = crearMemoria();
  await almacen.crearProyecto(proyecto("zeek", "ZEEK"), [
    tarea({
      id: "comida",
      proyectoId: "zeek",
      miembroId: "ana",
      titulo: "Team meal",
      tipo: "reembolso",
      monto: "15",
      tope: "15",
      estado: "pagado",
      hashPago: "c".repeat(64),
    }),
    tarea({
      id: "otra",
      proyectoId: "zeek",
      miembroId: "ana",
      titulo: "Late meal",
      tipo: "reembolso",
      monto: "15",
      tope: "15",
      estado: "pagado",
      hashPago: "d".repeat(64),
    }),
  ]);
  await almacen.crearEvidencia(evidencia("comida", "2026-09-20T18:00:00.000Z", "12.40"));
  await almacen.crearEvidencia(evidencia("otra", "2026-09-21T18:00:00.000Z", "16"));

  const vista = await armarVistaCuenta({
    almacen,
    usuarioId: "ana",
    email: "ana@hyto.test",
    wallet: "",
    demo: false,
    ahora: AHORA,
    leerSaldo: async () => {
      throw new Error("no debía leer");
    },
  });

  assert.equal(vista.saldoEstado, "sin-wallet");
  assert.equal(vista.wallet, null);
  assert.equal(vista.orgullo.total, montoRecibido("12.40"));
  assert.notEqual(vista.orgullo.total, "15");
  assert.notEqual(vista.orgullo.total, "12.40");
  assert.equal(vista.orgullo.tareasCompletadas, 2);
  assert.equal(vista.orgullo.mesPasado, montoRecibido("12.40"));
});

test("el demo sin pagos usa las tareas reales y no llama a Horizon sin billetera", async () => {
  const almacen = crearMemoria();
  const voluntario = usuarioDemo("voluntario");
  let lecturas = 0;
  const vista = await armarVistaCuenta({
    almacen,
    usuarioId: voluntario.id,
    email: voluntario.email,
    wallet: "",
    demo: true,
    ahora: AHORA,
    leerSaldo: async () => {
      lecturas += 1;
      return { saldo: "1" };
    },
  });

  assert.equal(vista.demo, true);
  assert.equal(vista.muestra, false);
  assert.equal(vista.walletMuestra, false);
  assert.equal(vista.wallet, null);
  assert.equal(vista.saldo, null);
  assert.equal(vista.saldoEstado, "sin-wallet");
  assert.equal(vista.orgullo.tareasCompletadas, 0);
  assert.equal(vista.orgullo.total, "0");
  assert.equal(vista.orgullo.vacio, true);
  assert.equal(lecturas, 0);
});

test("si Horizon falla, el panel igual devuelve lo ganado", async () => {
  const almacen = crearMemoria();
  await almacen.crearProyecto(proyecto("zeek", "ZEEK"), [
    tarea({ id: "mia", proyectoId: "zeek", miembroId: "ana", estado: "pagado", hashPago: "e".repeat(64) }),
  ]);
  await almacen.crearEvidencia(evidencia("mia", "2026-10-10T18:00:00.000Z"));
  const vista = await armarVistaCuenta({
    almacen,
    usuarioId: "ana",
    email: "ana@hyto.test",
    wallet: WALLET,
    demo: false,
    ahora: AHORA,
    leerSaldo: async () => {
      throw new Error("red");
    },
  });
  assert.equal(vista.saldoEstado, "error");
  assert.equal(vista.saldo, null);
  assert.equal(vista.orgullo.total, montoRecibido("20"));

  const ausente = await armarVistaCuenta({
    almacen,
    usuarioId: "ana",
    email: "ana@hyto.test",
    wallet: WALLET,
    demo: false,
    ahora: AHORA,
    leerSaldo: async () => ({ saldo: null }),
  });
  assert.equal(ausente.saldoEstado, "ausente");

  const sinLinea = await armarVistaCuenta({
    almacen,
    usuarioId: "ana",
    email: "ana@hyto.test",
    wallet: WALLET,
    demo: false,
    ahora: AHORA,
    leerSaldo: async () => ({ saldo: "0", puedeRecibir: false }),
  });
  assert.equal(sinLinea.saldoEstado, "ausente");
  assert.equal(sinLinea.saldo, null);

  const enCero = await armarVistaCuenta({
    almacen,
    usuarioId: "ana",
    email: "ana@hyto.test",
    wallet: WALLET,
    demo: false,
    ahora: AHORA,
    leerSaldo: async () => ({ saldo: "0.0000000", puedeRecibir: true }),
  });
  assert.equal(enCero.saldoEstado, "ok");
  assert.equal(enCero.saldo, "0.0000000");
});

test("Settings suma el neto recibido, no el monto apartado", async () => {
  const almacen = crearMemoria();
  await almacen.crearProyecto(proyecto("zeek", "ZEEK"), [
    tarea({ id: "stand", proyectoId: "zeek", miembroId: "ana", titulo: "Booth", monto: "2", estado: "pagado", hashPago: "a".repeat(64) }),
    tarea({
      id: "comida",
      proyectoId: "zeek",
      miembroId: "ana",
      titulo: "Meal",
      tipo: "reembolso",
      monto: "15",
      tope: "15",
      estado: "pagado",
      hashPago: "b".repeat(64),
    }),
  ]);
  await almacen.crearEvidencia(evidencia("stand", "2026-10-02T18:00:00.000Z"));
  await almacen.crearEvidencia(evidencia("comida", "2026-10-03T18:00:00.000Z", "12.48"));

  const vista = await armarVistaCuenta({
    almacen,
    usuarioId: "ana",
    email: "ana@hyto.test",
    wallet: WALLET,
    demo: false,
    ahora: AHORA,
    leerSaldo: async () => ({ saldo: "14.43656", puedeRecibir: true }),
  });

  assert.equal(vista.saldo, "14.43656");
  assert.equal(vista.orgullo.total, "14.43656");
  assert.notEqual(vista.orgullo.total, "14.48");
  assert.deepEqual(
    vista.orgullo.recientes.map((item) => item.monto).sort(),
    ["1.994", "12.44256"],
  );
});

test("la ruta de cuenta es de solo lectura y no mezcla a otra persona", async () => {
  const almacen = crearMemoria();
  await almacen.crearProyecto(proyecto("zeek", "ZEEK"), [
    tarea({ id: "mia", proyectoId: "zeek", miembroId: "ana", estado: "pagado", hashPago: "f".repeat(64) }),
  ]);
  await almacen.crearEvidencia(evidencia("mia", "2026-10-10T18:00:00.000Z"));
  const respuesta = await leerCuentaHttp(sesion(), almacen, {
    ahora: AHORA,
    leerSaldo: async () => ({ saldo: "3" }),
  });
  assert.equal(respuesta.status, 200);
  assert.equal(respuesta.headers.get("cache-control"), "no-store");
  const json = (await respuesta.json()) as { orgullo: { total: string }; wallet: string };
  assert.equal(json.orgullo.total, montoRecibido("20"));
  assert.equal(json.wallet, WALLET);

  const rota = await leerCuentaHttp(sesion(), {
    ...almacen,
    async listarTareas() {
      throw new Error("db");
    },
  });
  assert.equal(rota.status, 503);
});
