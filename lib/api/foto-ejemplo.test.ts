import assert from "node:assert/strict";
import test from "node:test";
import { crearFotosMemoria } from "../blob/fotos";
import { crearMemoria } from "../db/memoria";
import { asegurarSemilla } from "../db/semilla";
import { leerFotoHttp } from "./evidencias";
import { leerRevisionHttp } from "./revision";

// Mailbox #026 point 5: the review screen showed an empty photo box.
// Every evidence the review route points at must answer with a real image or a clear JSON error.

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

async function esPng(respuesta: Response): Promise<void> {
  assert.equal(respuesta.status, 200);
  assert.equal(respuesta.headers.get("content-type"), "image/png");
  assert.equal(respuesta.headers.get("x-content-type-options"), "nosniff");
  const bytes = new Uint8Array(await respuesta.arrayBuffer());
  assert.deepEqual([...bytes.subarray(0, 8)], PNG);
  assert.equal(bytes.length > 500, true);
}

test("every sample evidence the review route points at serves a visible PNG, work and receipt alike", async () => {
  const almacen = crearMemoria();
  await asegurarSemilla(almacen);
  const voluntario = { usuarioId: "voluntario-1", demo: false };
  const duenos: Record<string, string> = { stand: "voluntario-1", registro: "voluntario-2", comida: "voluntario-1" };
  for (const tareaId of ["stand", "registro", "comida"]) {
    const revision = (await (await leerRevisionHttp(almacen, null, tareaId)).json()) as { foto: string | null };
    assert.equal(revision.foto, `/api/evidencias/ejemplo-${tareaId}/foto`, tareaId);
    const respuesta = await leerFotoHttp(almacen, null, `ejemplo-${tareaId}`, { usuarioId: duenos[tareaId]!, demo: false });
    await esPng(respuesta);
  }
  const trabajo = Buffer.from(await (await leerFotoHttp(almacen, null, "ejemplo-stand", voluntario)).arrayBuffer());
  const recibo = Buffer.from(await (await leerFotoHttp(almacen, null, "ejemplo-comida", voluntario)).arrayBuffer());
  assert.equal(trabajo.equals(recibo), false);
});

test("the demo sample photos load for the demo organizer and the anonymous demo visor, with no photo store", async () => {
  const anterior = process.env.HYTO_DEMO_LOGIN;
  process.env.HYTO_DEMO_LOGIN = "1";
  try {
    const almacen = crearMemoria();
    await asegurarSemilla(almacen);
    for (const visor of [
      { usuarioId: "demo-organizador", demo: true },
      { usuarioId: "demo-voluntario", demo: true },
      { usuarioId: null, demo: true },
    ]) {
      const revision = (await (await leerRevisionHttp(almacen, null, "demo-stand")).json()) as { foto: string | null };
      assert.equal(revision.foto, "/api/evidencias/ejemplo-demo-stand/foto");
      await esPng(await leerFotoHttp(almacen, null, "ejemplo-demo-stand", visor));
    }
    const sinFoto = (await (await leerRevisionHttp(almacen, null, "demo-bienvenida")).json()) as { foto: string | null };
    assert.equal(sinFoto.foto, null);
  } finally {
    if (anterior === undefined) delete process.env.HYTO_DEMO_LOGIN;
    else process.env.HYTO_DEMO_LOGIN = anterior;
  }
});

test("a real evidence whose blob is gone answers 404 with a message, not an empty image", async () => {
  const almacen = crearMemoria();
  await asegurarSemilla(almacen);
  await almacen.asignarOrganizador("zeek", "organizador");
  await almacen.crearEvidencia({
    id: "ev-perdida",
    tareaId: "bienvenida",
    blobId: "memoria/perdida/foto.jpg",
    monto: null,
    montoConfirmado: null,
    fecha: null,
    creadaEn: "2026-10-02T08:00:00.000Z",
  });
  const organizador = { usuarioId: "organizador", demo: false };

  const perdida = await leerFotoHttp(almacen, crearFotosMemoria(), "ev-perdida", organizador);
  assert.equal(perdida.status, 404);
  assert.match(perdida.headers.get("content-type") ?? "", /json/);
  assert.deepEqual(await perdida.json(), { aviso: "We couldn't find the photo." });

  const sinAlmacenDeFotos = await leerFotoHttp(almacen, null, "ev-perdida", organizador);
  assert.equal(sinAlmacenDeFotos.status, 503);
  assert.match(sinAlmacenDeFotos.headers.get("content-type") ?? "", /json/);

  const ajeno = await leerFotoHttp(almacen, crearFotosMemoria(), "ev-perdida", { usuarioId: "otra-persona", demo: false });
  assert.equal(ajeno.status, 403);
  assert.match(ajeno.headers.get("content-type") ?? "", /json/);
});
