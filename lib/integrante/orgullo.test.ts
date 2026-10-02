import assert from "node:assert/strict";
import test from "node:test";
import { armarOrgullo, desplazarMes, insigniasDe, tareasMuestra, type TareaCuenta } from "./orgullo";

const AHORA = new Date("2026-10-15T18:00:00.000Z");

function tarea(parcial: Partial<TareaCuenta> & Pick<TareaCuenta, "id">): TareaCuenta {
  return {
    titulo: parcial.id,
    proyectoId: "zeek",
    proyecto: "ZEEK",
    pagada: true,
    monto: "20",
    pagadoEn: "2026-10-15T18:00:00.000Z",
    ...parcial,
  };
}

test("agrupa lo ganado por mes, con este mes, el anterior y el total", () => {
  const orgullo = armarOrgullo(
    [
      tarea({ id: "booth", monto: "20", pagadoEn: "2026-10-15T18:00:00.000Z" }),
      tarea({ id: "meal", titulo: "Team meal", monto: "12.40", pagadoEn: "2026-10-02T18:00:00.000Z" }),
      tarea({ id: "checkin", monto: "10.10", pagadoEn: "2026-09-20T18:00:00.000Z" }),
      tarea({ id: "cents", monto: "0.20", pagadoEn: "2026-09-02T18:00:00.000Z" }),
      tarea({ id: "enero", monto: "7", pagadoEn: "2026-01-15T18:00:00.000Z" }),
      tarea({ id: "abierta", pagada: false, monto: "100", pagadoEn: null }),
    ],
    AHORA,
  );

  assert.equal(orgullo.vacio, false);
  assert.equal(orgullo.esteMes, "32.40");
  assert.equal(orgullo.mesPasado, "10.30");
  assert.equal(orgullo.total, "49.70");
  assert.equal(orgullo.meses.length, 6);
  assert.deepEqual(
    orgullo.meses.map((mes) => mes.clave),
    ["2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10"],
  );
  assert.equal(orgullo.meses.find((mes) => mes.clave === "2026-08")?.total, "0");
  assert.equal(orgullo.meses.find((mes) => mes.clave === "2026-10")?.total, "32.40");
  assert.equal(orgullo.mejorMes?.clave, "2026-10");
  assert.equal(orgullo.mejorMes?.total, "32.40");
  assert.equal(orgullo.recientes[0]?.id, "booth");
  assert.equal(orgullo.sinFecha, 0);
});

test("un pago del 1 de octubre en UTC sigue en septiembre en Costa Rica", () => {
  const orgullo = armarOrgullo([tarea({ id: "noche", pagadoEn: "2026-10-01T02:00:00.000Z" })], AHORA);
  assert.equal(orgullo.mesPasado, "20");
  assert.equal(orgullo.esteMes, "0");
});

test("el estado vacío no inventa meses, racha ni insignias", () => {
  const orgullo = armarOrgullo([], AHORA);
  assert.equal(orgullo.vacio, true);
  assert.equal(orgullo.esteMes, "0");
  assert.equal(orgullo.mesPasado, "0");
  assert.equal(orgullo.total, "0");
  assert.deepEqual(orgullo.meses, []);
  assert.equal(orgullo.tareasCompletadas, 0);
  assert.equal(orgullo.proyectosCompletados, 0);
  assert.equal(orgullo.racha, 0);
  assert.equal(orgullo.mejorMes, null);
  assert.deepEqual(orgullo.recientes, []);
  assert.equal(orgullo.sinFecha, 0);
  assert.equal(orgullo.insignias.every((insignia) => !insignia.obtenida), true);
});

test("las insignias siguen las cuentas de tareas, proyectos y racha", () => {
  assert.deepEqual(
    insigniasDe({ tareas: 0, proyectos: 0, racha: 0 }).map((insignia) => insignia.obtenida),
    [false, false, false, false, false, false],
  );

  const primera = insigniasDe({ tareas: 1, proyectos: 0, racha: 0 });
  assert.equal(primera.find((insignia) => insignia.id === "primera-tarea")?.obtenida, true);
  assert.equal(primera.find((insignia) => insignia.id === "cinco-tareas")?.obtenida, false);
  assert.equal(primera.find((insignia) => insignia.id === "primer-proyecto")?.obtenida, false);

  const cinco = insigniasDe({ tareas: 5, proyectos: 1, racha: 2 });
  assert.equal(cinco.find((insignia) => insignia.id === "cinco-tareas")?.obtenida, true);
  assert.equal(cinco.find((insignia) => insignia.id === "diez-tareas")?.obtenida, false);
  assert.equal(cinco.find((insignia) => insignia.id === "primer-proyecto")?.obtenida, true);
  assert.equal(cinco.find((insignia) => insignia.id === "tres-proyectos")?.obtenida, false);
  assert.equal(cinco.find((insignia) => insignia.id === "racha-tres")?.obtenida, false);

  const altas = insigniasDe({ tareas: 10, proyectos: 3, racha: 3 });
  assert.equal(altas.every((insignia) => insignia.obtenida), true);
});

test("un proyecto cuenta solo cuando todas sus tareas están pagadas", () => {
  const orgullo = armarOrgullo(
    [
      tarea({ id: "a", proyectoId: "abierto", proyecto: "Open" }),
      tarea({ id: "b", proyectoId: "abierto", proyecto: "Open", pagada: false, monto: "20" }),
      tarea({ id: "c", proyectoId: "cerrado", proyecto: "Closed", monto: "15" }),
    ],
    AHORA,
  );
  assert.equal(orgullo.tareasCompletadas, 2);
  assert.equal(orgullo.proyectosCompletados, 1);
  assert.equal(orgullo.insignias.find((insignia) => insignia.id === "primer-proyecto")?.obtenida, true);
  assert.equal(orgullo.insignias.find((insignia) => insignia.id === "cinco-tareas")?.obtenida, false);
});

test("la racha cruza el año, perdona el mes en curso y se corta en un hueco", () => {
  const enero = new Date("2026-01-15T18:00:00.000Z");
  const seguida = armarOrgullo(
    [
      tarea({ id: "ene", pagadoEn: "2026-01-15T18:00:00.000Z" }),
      tarea({ id: "dic", pagadoEn: "2025-12-15T18:00:00.000Z" }),
      tarea({ id: "nov", pagadoEn: "2025-11-15T18:00:00.000Z" }),
    ],
    enero,
  );
  assert.equal(seguida.racha, 3);
  assert.equal(seguida.meses[0]?.clave, "2025-08");
  assert.equal(desplazarMes("2026-01", -1), "2025-12");

  const gracia = armarOrgullo(
    [
      tarea({ id: "sep", pagadoEn: "2026-09-15T18:00:00.000Z" }),
      tarea({ id: "ago", pagadoEn: "2026-08-15T18:00:00.000Z" }),
    ],
    AHORA,
  );
  assert.equal(gracia.racha, 2);
  assert.equal(gracia.esteMes, "0");

  const hueco = armarOrgullo(
    [
      tarea({ id: "oct", pagadoEn: "2026-10-15T18:00:00.000Z" }),
      tarea({ id: "ago", pagadoEn: "2026-08-15T18:00:00.000Z" }),
    ],
    AHORA,
  );
  assert.equal(hueco.racha, 1);

  const rota = armarOrgullo([tarea({ id: "ago", pagadoEn: "2026-08-15T18:00:00.000Z" })], AHORA);
  assert.equal(rota.racha, 0);
});

test("el empate del mejor mes se queda con el más reciente, y un pago sin fecha solo entra al total", () => {
  const orgullo = armarOrgullo(
    [
      tarea({ id: "sep", monto: "20", pagadoEn: "2026-09-15T18:00:00.000Z" }),
      tarea({ id: "oct", monto: "20", pagadoEn: "2026-10-15T18:00:00.000Z" }),
      tarea({ id: "suelta", monto: "15", pagadoEn: null }),
      tarea({ id: "mala", monto: "no-es-monto", pagadoEn: "2026-10-15T18:00:00.000Z" }),
    ],
    AHORA,
  );
  assert.equal(orgullo.mejorMes?.clave, "2026-10");
  assert.equal(orgullo.total, "55");
  assert.equal(orgullo.esteMes, "20");
  assert.equal(orgullo.sinFecha, 1);
  assert.equal(orgullo.tareasCompletadas, 4);
});

test("la muestra del demo tiene pagos reales de ejemplo en este mes y el anterior", () => {
  const orgullo = armarOrgullo(tareasMuestra(AHORA), AHORA);
  assert.equal(orgullo.vacio, false);
  assert.equal(orgullo.esteMes, "32.40");
  assert.equal(orgullo.mesPasado, "40");
  assert.equal(orgullo.total, "112.40");
  assert.equal(orgullo.tareasCompletadas, 6);
  assert.equal(orgullo.proyectosCompletados, 2);
  assert.equal(orgullo.racha, 4);
  assert.equal(orgullo.insignias.find((insignia) => insignia.id === "cinco-tareas")?.obtenida, true);
  assert.equal(orgullo.insignias.find((insignia) => insignia.id === "diez-tareas")?.obtenida, false);
  assert.equal(orgullo.insignias.find((insignia) => insignia.id === "tres-proyectos")?.obtenida, false);
  assert.equal(orgullo.insignias.find((insignia) => insignia.id === "racha-tres")?.obtenida, true);
});
