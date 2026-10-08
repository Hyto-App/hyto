import assert from "node:assert/strict";
import test from "node:test";
import { crearMemoria } from "@/lib/db/memoria";
import { asegurarSemilla } from "@/lib/db/semilla";
import { listarTareasHttp } from "./tareas";

test("una tarea pagada informa lo liberado, no el tope", async () => {
  const almacen = crearMemoria();
  await asegurarSemilla(almacen);
  await almacen.actualizarEvidencia("ejemplo-comida", { montoConfirmado: "12.48" });
  await almacen.actualizarTarea("comida", { estado: "pagado", hashPago: "ab".repeat(32) });
  await almacen.actualizarTarea("stand", { estado: "pagado", hashPago: "cd".repeat(32) });

  const respuesta = await listarTareasHttp(almacen, { usuarioId: "voluntario-1", demo: false }, "mias");
  assert.equal(respuesta.status, 200);
  const cuerpo = (await respuesta.json()) as {
    tareas: { id: string; tope: string | null; monto: string; montoPagado: string | null; montoConfirmado: string | null }[];
  };
  const comida = cuerpo.tareas.find((tarea) => tarea.id === "comida");
  const stand = cuerpo.tareas.find((tarea) => tarea.id === "stand");
  assert.equal(comida?.tope, "15");
  assert.equal(comida?.montoConfirmado, "12.48");
  assert.equal(comida?.montoPagado, "12.44256");
  assert.equal(stand?.monto, "20");
  assert.equal(stand?.montoPagado, "19.94");
});

test("un reembolso pagado sin monto confirmado no inventa el tope", async () => {
  const almacen = crearMemoria();
  await asegurarSemilla(almacen);
  await almacen.actualizarTarea("comida", { estado: "pagado", hashPago: "ab".repeat(32) });
  const respuesta = await listarTareasHttp(almacen, { usuarioId: "voluntario-1", demo: false }, "mias");
  const cuerpo = (await respuesta.json()) as { tareas: { id: string; montoPagado: string | null }[] };
  assert.equal(cuerpo.tareas.find((tarea) => tarea.id === "comida")?.montoPagado, null);
});
