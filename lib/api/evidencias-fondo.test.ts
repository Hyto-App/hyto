import assert from "node:assert/strict";
import test from "node:test";
import { crearMemoria } from "../db/memoria";
import { desdeGuion } from "../revision/armar";
import { cerrarRevisionEnFondo, TOPE_REVISION_FONDO_MS } from "./evidencias";

test("the background review waits 25 s, then always stores a verdict", () => {
  assert.equal(TOPE_REVISION_FONDO_MS, 25_000);
});

test("a hanging review still stores an error verdict", async () => {
  const previo = console.error;
  console.error = () => undefined;
  try {
    const almacen = crearMemoria();
    await cerrarRevisionEnFondo(almacen, "ev-cuelga", "stand", new Promise(() => undefined), 20);
    const fila = await almacen.veredictoDe("ev-cuelga");
    assert.ok(fila);
    assert.equal(fila.id, "ev-cuelga");
    assert.equal(fila.evidenciaId, "ev-cuelga");
    assert.equal(fila.tareaId, "stand");
    assert.equal(fila.origen, "error");
    assert.equal(fila.choice, "tiempo");
    assert.equal(fila.score, "error");
    assert.equal(fila.veredicto, "insuficiente");
  } finally {
    console.error = previo;
  }
});

test("a review that throws still stores an error verdict", async () => {
  const previo = console.error;
  console.error = () => undefined;
  try {
    const almacen = crearMemoria();
    await cerrarRevisionEnFondo(almacen, "ev-falla", "stand", Promise.reject(new Error("groq dropped")), 5_000);
    const fila = await almacen.veredictoDe("ev-falla");
    assert.equal(fila?.origen, "error");
    assert.equal(fila?.choice, "proveedor");
    assert.match(fila?.frase ?? "", /could not finish/i);
  } finally {
    console.error = previo;
  }
});

test("a failure while saving the review still stores an error verdict", async () => {
  const previo = console.error;
  console.error = () => undefined;
  try {
    const almacen = crearMemoria();
    let intentos = 0;
    const flaky = {
      ...almacen,
      async guardarVeredicto(veredicto: Parameters<typeof almacen.guardarVeredicto>[0]) {
        intentos += 1;
        if (intentos === 1) throw new Error("neon dropped");
        return almacen.guardarVeredicto(veredicto);
      },
    };
    await cerrarRevisionEnFondo(flaky, "ev-guarda", "stand", Promise.resolve(desdeGuion("trabajo", null)), 5_000);
    const fila = await almacen.veredictoDe("ev-guarda");
    assert.equal(intentos, 2);
    assert.equal(fila?.origen, "error");
    assert.equal(fila?.choice, "proveedor");
  } finally {
    console.error = previo;
  }
});

test("a review that finishes stores that verdict", async () => {
  const almacen = crearMemoria();
  await cerrarRevisionEnFondo(almacen, "ev-lista", "stand", Promise.resolve(desdeGuion("trabajo", null)), 5_000);
  const fila = await almacen.veredictoDe("ev-lista");
  assert.equal(fila?.origen, "guion");
  assert.equal(fila?.score, "65");
});
