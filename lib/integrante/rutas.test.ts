import assert from "node:assert/strict";
import test from "node:test";
import { evidenciaEjemplo, tareasEjemplo } from "./ejemplos";
import { AvisoSesion, leerTarea, listarTareas, subirEvidencia } from "./rutas";
import type { Tarea } from "./tipos";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

test("sin rutas, Mis tareas usa el ejemplo de ZEEK del miembro", async () => {
  const fetchImpl: typeof fetch = async () => {
    throw new Error("red");
  };

  const lista = await listarTareas({ miembroId: "voluntario-1" }, { fetch: fetchImpl });
  assert.equal(lista.ejemplo, true);
  assert.deepEqual(
    lista.tareas.map((tarea) => tarea.id),
    ["stand", "comida"],
  );
  assert.equal(lista.tareas[0]?.monto, "20");
  assert.equal(lista.tareas[0]?.estado, "pendiente");
  assert.equal(lista.tareas[1]?.tipo, "reembolso");
  assert.equal(lista.tareas[1]?.tope, "15");
});

test("el voluntario 3 solo ve su tarea y el organizador no tiene tareas de ejemplo", async () => {
  const fetchImpl: typeof fetch = async () => json({ tareas: [] }, 404);
  const tres = await listarTareas({ miembroId: "voluntario-3" }, { fetch: fetchImpl });
  assert.deepEqual(tareasEjemplo().filter((t) => t.miembroId === "voluntario-3").map((t) => t.titulo), [
    "Mesa de bienvenida",
  ]);
  assert.equal(tres.tareas[0]?.titulo, "Mesa de bienvenida");

  const organizador = await listarTareas({ miembroId: "organizador" }, { fetch: fetchImpl });
  assert.deepEqual(organizador.tareas, []);
});

test("si la ruta responde, no se rellenan los ejemplos", async () => {
  const remota: Tarea = {
    id: "real",
    proyectoId: "zeek",
    titulo: "Tarea real",
    tipo: "trabajo",
    monto: "8",
    tope: null,
    condicion: "Hecho",
    miembroId: "voluntario-2",
    walletCobro: "GREAL",
    estado: "pagado",
  };
  const fetchImpl: typeof fetch = async () =>
    json({ tareas: [remota, { ...remota, id: "otra", miembroId: "voluntario-1", walletCobro: "GOTRA" }] });

  const lista = await listarTareas({ miembroId: "voluntario-2", wallet: "GREAL" }, { fetch: fetchImpl });
  assert.equal(lista.ejemplo, false);
  assert.deepEqual(
    lista.tareas.map((tarea) => tarea.id),
    ["real"],
  );
  assert.equal(lista.tareas[0]?.estado, "pagado");
});

test("un reembolso de ejemplo trae monto y fecha; un trabajo no", async () => {
  const fetchImpl: typeof fetch = async () => json("no", 500);
  const comida = tareasEjemplo().find((tarea) => tarea.id === "comida");
  const stand = tareasEjemplo().find((tarea) => tarea.id === "stand");
  assert.ok(comida && stand);

  const reembolso = await subirEvidencia(comida, new Blob(["foto"]), { fetch: fetchImpl });
  assert.equal(reembolso.ejemplo, true);
  assert.equal(reembolso.evidencia.monto, "12.40");
  assert.equal(reembolso.evidencia.fecha, "2026-09-27");

  const trabajo = await subirEvidencia(stand, new Blob(["foto"]), { fetch: fetchImpl });
  assert.equal(trabajo.evidencia.monto, null);
  assert.equal(trabajo.evidencia.fecha, null);
  assert.deepEqual(trabajo.evidencia, evidenciaEjemplo(stand));
});

test("un 401 al subir muestra el aviso y no guarda el ejemplo", async () => {
  const comida = tareasEjemplo().find((tarea) => tarea.id === "comida");
  assert.ok(comida);
  const fetchImpl: typeof fetch = async () => json({ aviso: "Entra para continuar." }, 401);
  await assert.rejects(
    () => subirEvidencia(comida, new Blob(["foto"]), { fetch: fetchImpl }),
    (error: unknown) => error instanceof AvisoSesion && error.message === "Entra para continuar.",
  );
});

test("la evidencia real no inventa monto ni fecha", async () => {
  const comida = tareasEjemplo().find((tarea) => tarea.id === "comida");
  assert.ok(comida);
  const fetchImpl: typeof fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/api/evidencias")) {
      return json({ id: "ev-1", tareaId: "comida", blobId: "blob-1", monto: null, fecha: null });
    }
    return json({ id: "ev-1", tareaId: "comida", blobId: "blob-1", monto: null, fecha: null });
  };

  const enviada = await subirEvidencia(comida, new Blob(["foto"]), { fetch: fetchImpl });
  assert.equal(enviada.ejemplo, false);
  assert.equal(enviada.evidencia.monto, null);
  assert.equal(enviada.evidencia.fecha, null);
});

test("si la lectura trae monto y fecha, la pantalla puede mostrarlos", async () => {
  const comida = tareasEjemplo().find((tarea) => tarea.id === "comida");
  assert.ok(comida);
  const fetchImpl: typeof fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/api/evidencias")) {
      return json({ id: "ev-2", tareaId: "comida", blobId: "blob-2" });
    }
    return json({ id: "ev-2", tareaId: "comida", blobId: "blob-2", monto: "9.5", fecha: "2026-09-28" });
  };

  const enviada = await subirEvidencia(comida, new Blob(["foto"]), { fetch: fetchImpl });
  assert.equal(enviada.ejemplo, false);
  assert.equal(enviada.evidencia.monto, "9.5");
  assert.equal(enviada.evidencia.fecha, "2026-09-28");
});

test("la evidencia de ejemplo no abre la tarea de otro integrante", async () => {
  const fetchImpl: typeof fetch = async () => {
    throw new Error("red");
  };
  const ajena = await leerTarea("stand", { miembroId: "voluntario-2" }, { fetch: fetchImpl });
  assert.equal(ajena.tarea, null);

  const propia = await leerTarea(
    "stand",
    { miembroId: "voluntario-1" },
    { fetch: fetchImpl, estados: { stand: "en revisión" } },
  );
  assert.equal(propia.ejemplo, true);
  assert.equal(propia.tarea?.id, "stand");
  assert.equal(propia.tarea?.estado, "en revisión");
});

test("un monto que no viene no se inventa como cero", async () => {
  const fetchImpl: typeof fetch = async () =>
    json({
      tareas: [{ id: "sin-monto", titulo: "Sin monto", tipo: "trabajo", miembroId: "voluntario-1" }],
    });
  const lista = await listarTareas({ miembroId: "voluntario-1" }, { fetch: fetchImpl });
  assert.equal(lista.ejemplo, false);
  assert.equal(lista.tareas[0]?.monto, "");
});

test("el estado local de ejemplo pisa el pendiente", async () => {
  const fetchImpl: typeof fetch = async () => {
    throw new Error("red");
  };
  const lista = await listarTareas(
    { miembroId: "voluntario-1" },
    { fetch: fetchImpl, estados: { stand: "en revisión" } },
  );
  assert.equal(lista.tareas.find((tarea) => tarea.id === "stand")?.estado, "en revisión");
  assert.equal(lista.tareas.find((tarea) => tarea.id === "comida")?.estado, "pendiente");
});
