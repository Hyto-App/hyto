import assert from "node:assert/strict";
import test from "node:test";
import { crearMemoria } from "../db/memoria";
import type { TareaFila, VeredictoFila } from "../db/tipos";
import { intentosAnteriores } from "./informe";

const TAREA: TareaFila = {
  id: "t1",
  proyectoId: "p1",
  titulo: "Buy supplies",
  tipo: "reembolso",
  monto: "10",
  tope: "10",
  condicion: "A receipt",
  miembroId: "",
  walletCobro: "",
  estado: "en revisión",
  hashPago: null,
  credencialUrl: null,
  contratoEscrow: null,
  prioridad: "normal",
  dificultad: null,
};

function veredicto(evidenciaId: string, frase: string, score: string, origen: VeredictoFila["origen"] = "scout"): VeredictoFila {
  return { id: `v-${evidenciaId}`, evidenciaId, tareaId: "t1", veredicto: "parcial", frase, textoScout: "", choice: "x", noul: "no", score, origen };
}

async function conDosIntentos() {
  const almacen = crearMemoria();
  await almacen.crearProyecto({ id: "p1", nombre: "Event", creadoEn: "2026-10-01T00:00:00Z", organizadorId: null }, [TAREA]);
  for (const [id, creadaEn] of [["e1", "2026-10-01T10:00:00Z"], ["e2", "2026-10-01T11:00:00Z"]] as const) {
    await almacen.crearEvidencia({ id, tareaId: "t1", blobId: `blob-${id}`, monto: null, montoConfirmado: null, fecha: null, creadaEn });
  }
  await almacen.guardarVeredicto(veredicto("e1", "First explanation", "40"));
  await almacen.guardarVeredicto(veredicto("e2", "Second explanation", "79"));
  return almacen;
}

test("con una segunda foto, la explicación de la primera sigue disponible", async () => {
  const almacen = await conDosIntentos();
  const ultima = await almacen.ultimaEvidencia("t1");
  const previos = await intentosAnteriores(almacen, TAREA, ultima, true);
  assert.deepEqual(previos.map((intento) => intento.numero), [1]);
  assert.match(previos[0]?.frase ?? "", /First explanation/);
});

test("si el veredicto vigente está oculto, también cuenta la última foto", async () => {
  const almacen = await conDosIntentos();
  const ultima = await almacen.ultimaEvidencia("t1");
  const previos = await intentosAnteriores(almacen, TAREA, ultima, false);
  assert.deepEqual(previos.map((intento) => intento.numero), [1, 2]);
});

test("una revisión fallida no deja una explicación vacía", async () => {
  const almacen = await conDosIntentos();
  await almacen.guardarVeredicto(veredicto("e1", "", "0", "error"));
  const previos = await intentosAnteriores(almacen, TAREA, await almacen.ultimaEvidencia("t1"), true);
  assert.deepEqual(previos, []);
});
