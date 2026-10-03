import assert from "node:assert/strict";
import test from "node:test";
import { tareasEjemplo } from "./ejemplos";
import {
  AVISO_ENVIO_FALLIDO,
  AVISO_ENVIO_SIN_CONFIRMAR,
  ErrorDeEnvio,
  ErrorDeSesion,
  leerTarea,
  listarTareas,
  subirEvidencia,
} from "./rutas";
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

  const lista = await listarTareas({ miembroId: "voluntario-1" }, { fetch: fetchImpl, muestra: true });
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
  const tres = await listarTareas({ miembroId: "voluntario-3" }, { fetch: fetchImpl, muestra: true });
  assert.deepEqual(tareasEjemplo().filter((t) => t.miembroId === "voluntario-3").map((t) => t.titulo), [
    "Welcome table",
  ]);
  assert.equal(tres.tareas[0]?.titulo, "Welcome table");

  const organizador = await listarTareas({ miembroId: "organizador" }, { fetch: fetchImpl, muestra: true });
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

test("un 503 con aviso falla con ese aviso y no devuelve evidencia de ejemplo", async () => {
  const comida = tareasEjemplo().find((tarea) => tarea.id === "comida");
  assert.ok(comida);
  const aviso = "Evidence checks need migration 0005_evidencia_antifraude.sql before new files can be saved.";
  const fetchImpl: typeof fetch = async () => json({ aviso }, 503);
  await assert.rejects(
    () => subirEvidencia(comida, new Blob(["foto"]), { fetch: fetchImpl }),
    (error: unknown) => {
      assert.ok(error instanceof ErrorDeEnvio);
      assert.ok(!(error instanceof ErrorDeSesion));
      assert.equal(error.aviso, aviso);
      assert.equal(error.status, 503);
      return true;
    },
  );
});

test("un 500 sin cuerpo, un 409 o una red caída fallan; nunca hay ejemplo", async () => {
  const stand = tareasEjemplo().find((tarea) => tarea.id === "stand");
  assert.ok(stand);

  const sinCuerpo: typeof fetch = async () => new Response("no", { status: 500 });
  await assert.rejects(
    () => subirEvidencia(stand, new Blob(["foto"]), { fetch: sinCuerpo }),
    (error: unknown) => error instanceof ErrorDeEnvio && error.aviso === AVISO_ENVIO_FALLIDO && error.status === 500,
  );

  const repetida: typeof fetch = async () => json({ aviso: "This file was already submitted." }, 409);
  await assert.rejects(
    () => subirEvidencia(stand, new Blob(["foto"]), { fetch: repetida }),
    (error: unknown) => error instanceof ErrorDeEnvio && error.aviso === "This file was already submitted.",
  );

  const red: typeof fetch = async () => {
    throw new TypeError("network");
  };
  await assert.rejects(
    () => subirEvidencia(stand, new Blob(["foto"]), { fetch: red }),
    (error: unknown) => error instanceof ErrorDeEnvio && error.aviso === AVISO_ENVIO_FALLIDO && error.status === null,
  );
});

test("un 201 sin evidencia reconocible no cuenta como enviado", async () => {
  const stand = tareasEjemplo().find((tarea) => tarea.id === "stand");
  assert.ok(stand);
  const vacia: typeof fetch = async () => json({}, 201);
  await assert.rejects(
    () => subirEvidencia(stand, new Blob(["foto"]), { fetch: vacia }),
    (error: unknown) => error instanceof ErrorDeEnvio && error.aviso === AVISO_ENVIO_SIN_CONFIRMAR,
  );

  const html: typeof fetch = async () => new Response("<html></html>", { status: 201, headers: { "content-type": "text/html" } });
  await assert.rejects(
    () => subirEvidencia(stand, new Blob(["foto"]), { fetch: html }),
    (error: unknown) => error instanceof ErrorDeEnvio && error.aviso === AVISO_ENVIO_SIN_CONFIRMAR,
  );
});

test("un 201 con aviso de cuenta de cobro devuelve el aviso", async () => {
  const stand = tareasEjemplo().find((tarea) => tarea.id === "stand");
  assert.ok(stand);
  const aviso = "This sign-in has no payout account. Sign in again and open the task so we know where to pay.";
  const fetchImpl: typeof fetch = async (input) => {
    if (String(input).endsWith("/api/evidencias")) {
      return json({ evidencia: { id: "ev-9", tareaId: "stand", blobId: "blob-9", monto: null, fecha: null }, aviso }, 201);
    }
    return json({ id: "ev-9", tareaId: "stand", blobId: "blob-9", monto: null, fecha: null });
  };
  const enviada = await subirEvidencia(stand, new Blob(["foto"]), { fetch: fetchImpl });
  assert.equal(enviada.evidencia.id, "ev-9");
  assert.equal(enviada.aviso, aviso);
});

test("un 401 no se guarda como evidencia de ejemplo", async () => {
  const comida = tareasEjemplo().find((tarea) => tarea.id === "comida");
  assert.ok(comida);
  const fetchImpl: typeof fetch = async () => json({ aviso: "Sign in to continue." }, 401);
  await assert.rejects(
    () => subirEvidencia(comida, new Blob(["foto"]), { fetch: fetchImpl }),
    (error: unknown) => {
      assert.ok(error instanceof ErrorDeSesion);
      assert.equal(error.aviso, "Sign in to continue.");
      assert.equal(error.message, "Sign in to continue.");
      return true;
    },
  );

  const sinCuerpo: typeof fetch = async () => new Response("no", { status: 401 });
  await assert.rejects(
    () => subirEvidencia(comida, new Blob(["foto"]), { fetch: sinCuerpo }),
    (error: unknown) => error instanceof ErrorDeSesion && error.aviso === "Sign in to continue.",
  );
});

test("un 403 no se guarda como evidencia de ejemplo", async () => {
  const comida = tareasEjemplo().find((tarea) => tarea.id === "comida");
  assert.ok(comida);
  const aviso = "Only the person assigned to the task can submit evidence.";
  const fetchImpl: typeof fetch = async () => json({ aviso }, 403);
  await assert.rejects(
    () => subirEvidencia(comida, new Blob(["foto"]), { fetch: fetchImpl }),
    (error: unknown) => {
      assert.ok(error instanceof ErrorDeSesion);
      assert.equal(error.aviso, aviso);
      assert.equal(error.message, aviso);
      return true;
    },
  );

  const sinCuerpo: typeof fetch = async () => new Response("no", { status: 403 });
  await assert.rejects(
    () => subirEvidencia(comida, new Blob(["foto"]), { fetch: sinCuerpo }),
    (error: unknown) => error instanceof ErrorDeSesion && error.aviso === "Sign in to continue.",
  );
});

test("la subida no manda la cuenta de cobro de la tarea", async () => {
  const stand = tareasEjemplo().find((tarea) => tarea.id === "stand");
  assert.ok(stand);
  let wallet: FormDataEntryValue | null = "faltaba";
  const fetchImpl: typeof fetch = async (input, init) => {
    if (String(input).endsWith("/api/evidencias")) {
      const cuerpo = init?.body;
      wallet = cuerpo instanceof FormData ? cuerpo.get("wallet") : "sin-formulario";
    }
    return json({ evidencia: { id: "ev-1", tareaId: "stand", blobId: "blob-1", monto: null, fecha: null } });
  };
  const enviada = await subirEvidencia({ ...stand, walletCobro: "G" + "C".repeat(55) }, new Blob(["foto"]), { fetch: fetchImpl });
  assert.equal(enviada.aviso, null);
  assert.equal(wallet, null);
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
  assert.equal(enviada.evidencia.monto, "9.5");
  assert.equal(enviada.evidencia.fecha, "2026-09-28");
});

test("la evidencia de ejemplo no abre la tarea de otro integrante", async () => {
  const fetchImpl: typeof fetch = async () => {
    throw new Error("red");
  };
  const ajena = await leerTarea("stand", { miembroId: "voluntario-2" }, { fetch: fetchImpl, muestra: true });
  assert.equal(ajena.tarea, null);

  const propia = await leerTarea(
    "stand",
    { miembroId: "voluntario-1" },
    { fetch: fetchImpl, estados: { stand: "en revisión" }, muestra: true },
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
  const lista = await listarTareas({ miembroId: "voluntario-1" }, { fetch: fetchImpl, muestra: true });
  assert.equal(lista.ejemplo, false);
  assert.equal(lista.tareas[0]?.monto, "");
});

test("el estado local de ejemplo pisa el pendiente", async () => {
  const fetchImpl: typeof fetch = async () => {
    throw new Error("red");
  };
  const lista = await listarTareas(
    { miembroId: "voluntario-1" },
    { fetch: fetchImpl, estados: { stand: "en revisión" }, muestra: true },
  );
  assert.equal(lista.tareas.find((tarea) => tarea.id === "stand")?.estado, "en revisión");
  assert.equal(lista.tareas.find((tarea) => tarea.id === "comida")?.estado, "pendiente");
});
