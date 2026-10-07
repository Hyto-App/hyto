import assert from "node:assert/strict";
import test from "node:test";
import { reiniciarLimite } from "../escrow/limite";
import { sugerirRequisitosHttp, TOPE_SUGERIR_POR_MINUTO } from "./sugerir-requisitos";

test("sugerir requisitos pide título y devuelve como máximo tres líneas", async () => {
  const falta = await sugerirRequisitosHttp(new Request("http://local/api/tareas/sugerir-requisitos", { method: "POST", body: "{}" }));
  assert.equal(falta.status, 400);

  const bien = await sugerirRequisitosHttp(
    new Request("http://local/api/tareas/sugerir-requisitos", {
      method: "POST",
      body: JSON.stringify({ titulo: "Puesto", descripcion: "Arma la mesa" }),
    }),
    async () => ["Banner de frente", "Mesa armada", "Cajas visibles", "Extra"],
  );
  assert.equal(bien.status, 200);
  assert.deepEqual(await bien.json(), { requisitos: ["Banner de frente", "Mesa armada", "Cajas visibles"] });

  const caido = await sugerirRequisitosHttp(
    new Request("http://local/api/tareas/sugerir-requisitos", {
      method: "POST",
      body: JSON.stringify({ titulo: "Puesto", descripcion: "" }),
    }),
    async () => [],
  );
  assert.equal(caido.status, 200);
  assert.deepEqual(await caido.json(), { requisitos: [] });
});

test("sugerir requisitos corta a quien pide demasiadas en un minuto", async () => {
  reiniciarLimite();
  const pedir = async () => ["The banner is visible"];
  const pedido = () =>
    new Request("http://local/api/tareas/sugerir-requisitos", { method: "POST", body: JSON.stringify({ titulo: "Booth" }) });
  for (let i = 0; i < TOPE_SUGERIR_POR_MINUTO; i++) {
    assert.equal((await sugerirRequisitosHttp(pedido(), pedir, "u-limite")).status, 200);
  }
  assert.equal((await sugerirRequisitosHttp(pedido(), pedir, "u-limite")).status, 429);
  assert.equal((await sugerirRequisitosHttp(pedido(), pedir, "u-otra")).status, 200);
  reiniciarLimite();
});
