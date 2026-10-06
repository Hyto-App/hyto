import assert from "node:assert/strict";
import test from "node:test";
import { sugerirRequisitosHttp } from "./sugerir-requisitos";

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
