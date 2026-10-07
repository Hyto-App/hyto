import assert from "node:assert/strict";
import test from "node:test";
import { calcularEstadoTarea } from "./estado-tarea";

test("un archivo en pendiente no rechaza ni pasa a revisión", () => {
  const calculo = calcularEstadoTarea({
    estado: "pendiente",
    evidencia: { blobId: "blob/real" },
    veredicto: { origen: "scout" },
  });
  assert.equal(calculo.estado, "pendiente");
  assert.equal(calculo.rechazada, false);
  assert.equal(calculo.enBandeja, false);
  assert.equal(calculo.etapa, null);
  assert.equal(calculo.pagoPendiente, false);
});

test("el rechazo solo existe cuando quedó guardado", () => {
  const calculo = calcularEstadoTarea({
    estado: "pendiente",
    evidencia: { blobId: "blob/real" },
    rechazoExplicito: true,
  });
  assert.equal(calculo.rechazada, true);
  assert.equal(calculo.etapa, "rechazada");
  assert.equal(calculo.estado, "pendiente");
});

test("un hash sin pago no se muestra como aprobado", () => {
  const calculo = calcularEstadoTarea({
    estado: "en revisión",
    hashPago: "ab".repeat(32),
    evidencia: { blobId: "blob/real" },
    veredicto: { origen: "scout" },
  });
  assert.equal(calculo.estado, "en revisión");
  assert.equal(calculo.pagoPendiente, true);
  assert.equal(calculo.etapa, "enviada_organizador");
  assert.equal(calculo.enBandeja, true);

  const pagada = calcularEstadoTarea({ estado: "pagado", hashPago: "ab".repeat(32) });
  assert.equal(pagada.etapa, "aprobada");
  assert.equal(pagada.pagoPendiente, false);
  assert.equal(pagada.enBandeja, false);
});

test("la bandeja solo cuenta una tarea en revisión", () => {
  assert.equal(calcularEstadoTarea({ estado: "pendiente", veredicto: { origen: "guion" } }).enBandeja, false);
  assert.equal(calcularEstadoTarea({ estado: "en revisión" }).enBandeja, true);
  assert.equal(calcularEstadoTarea({ estado: "pagado" }).enBandeja, false);
});
