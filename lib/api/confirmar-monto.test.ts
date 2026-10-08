import assert from "node:assert/strict";
import test from "node:test";
import { crearMemoria } from "../db/memoria";
import { asegurarSemilla } from "../db/semilla";
import { AVISO_MONTO_INVALIDO, AVISO_MONTO_TARDE } from "../escrow/monto";
import { confirmarMontoHttp } from "./confirmar-monto";

test("confirmar un reembolso guarda el monto aparte de la lectura", async () => {
  const almacen = crearMemoria();
  await asegurarSemilla(almacen);
  await almacen.actualizarEvidencia("ejemplo-comida", { monto: "20" });

  const vacio = await confirmarMontoHttp(almacen, "comida", {});
  assert.equal(vacio.status, 400);
  assert.equal(((await vacio.json()) as { aviso: string }).aviso, AVISO_MONTO_INVALIDO);

  const alto = await confirmarMontoHttp(almacen, "comida", { monto: "15.74" });
  assert.equal(alto.status, 200);
  assert.equal(((await alto.json()) as { montoConfirmado: string }).montoConfirmado, "15");
  assert.equal((await almacen.leerEvidencia("ejemplo-comida"))?.montoConfirmado, "15");
  assert.equal((await almacen.leerEvidencia("ejemplo-comida"))?.monto, "20");

  const listo = await confirmarMontoHttp(almacen, "comida", { monto: "12,40" });
  assert.equal(listo.status, 200);
  assert.equal(((await listo.json()) as { montoConfirmado: string }).montoConfirmado, "12.40");
  const evidencia = await almacen.leerEvidencia("ejemplo-comida");
  assert.equal(evidencia?.montoConfirmado, "12.40");
  assert.equal(evidencia?.monto, "20");

  await almacen.actualizarTarea("comida", { contratoEscrow: "C" + "A".repeat(55) });
  const tarde = await confirmarMontoHttp(almacen, "comida", { monto: "10" });
  assert.equal(tarde.status, 409);
  assert.equal(((await tarde.json()) as { aviso: string }).aviso, AVISO_MONTO_TARDE);
  assert.equal((await almacen.leerEvidencia("ejemplo-comida"))?.montoConfirmado, "12.40");
});

test("una tarea de trabajo no pide confirmación de monto", async () => {
  const almacen = crearMemoria();
  await asegurarSemilla(almacen);
  const respuesta = await confirmarMontoHttp(almacen, "stand", { monto: "10" });
  assert.equal(respuesta.status, 400);
  assert.equal(((await respuesta.json()) as { aviso: string }).aviso, "This task has a fixed amount.");
});
