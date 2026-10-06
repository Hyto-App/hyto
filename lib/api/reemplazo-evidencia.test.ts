import assert from "node:assert/strict";
import test from "node:test";
import { emitirTokenEvidenciaHttp, publicarEvidenciaHttp } from "@/lib/api/evidencias";
import { pedirOtraFotoHttp } from "@/lib/api/pedir";
import { listarTareasHttp } from "@/lib/api/tareas";
import { crearFotosMemoria } from "@/lib/blob/fotos";
import { crearMemoria } from "@/lib/db/memoria";
import { asegurarSemilla } from "@/lib/db/semilla";
import { desdeGuion } from "@/lib/revision/armar";
import { jpegDePrueba, jpegDistinto, tokenDePrueba } from "@/lib/evidencia/muestras";
import { reiniciarTokensEvidencia } from "@/lib/evidencia/token";

const ACTOR = { usuarioId: "voluntario-1", rol: "voluntario" as const };

test("el voluntario reemplaza la foto mientras no está pagada y la etapa sigue el envío", async () => {
  reiniciarTokensEvidencia();
  const almacen = crearMemoria();
  await asegurarSemilla(almacen);
  await almacen.guardarMiembro({
    proyectoId: "zeek",
    usuarioId: "organizador",
    rol: "organizer",
    estado: "active",
    creadoEn: "2026-10-01T00:00:00.000Z",
  });
  const fotos = crearFotosMemoria();
  const primera = await jpegDePrueba();
  const segunda = await jpegDistinto();

  const creada = await subir(almacen, fotos, primera);
  assert.equal(creada.status, 201);
  assert.equal((await almacen.leerTarea("stand"))?.estado, "en revisión");
  let envio = await envioDe(almacen);
  assert.equal(envio?.etapa, "enviada_organizador");
  assert.equal(envio?.enviadaEn, (await almacen.ultimaEvidencia("stand"))?.creadaEn);
  const primeraId = (await almacen.ultimaEvidencia("stand"))?.id;

  assert.equal((await pedirOtraFotoHttp(almacen, "organizador", "stand")).status, 200);
  assert.equal((await almacen.leerTarea("stand"))?.estado, "pendiente");
  envio = await envioDe(almacen);
  assert.equal(envio?.etapa, "rechazada");
  assert.equal(envio?.enviadaEn, (await almacen.ultimaEvidencia("stand"))?.creadaEn);

  const reemplazo = await subir(almacen, fotos, segunda);
  assert.equal(reemplazo.status, 201);
  const ultima = await almacen.ultimaEvidencia("stand");
  assert.ok(ultima);
  assert.notEqual(ultima.id, primeraId);
  assert.equal(ultima.motivoCopia ?? null, null);
  assert.equal((await almacen.leerTarea("stand"))?.estado, "en revisión");
  assert.equal((await almacen.veredictoDe(ultima.id))?.veredicto, "cumplió");
  envio = await envioDe(almacen);
  assert.equal(envio?.etapa, "enviada_organizador");
  assert.equal(envio?.enviadaEn, ultima.creadaEn);

  await almacen.actualizarTarea("stand", { hashPago: "ab".repeat(32) });
  const enVuelo = await subir(almacen, fotos, primera);
  assert.equal(enVuelo.status, 409);
  assert.match(((await enVuelo.json()) as { aviso: string }).aviso, /already paid/);
  assert.equal((await almacen.ultimaEvidencia("stand"))?.id, ultima.id);

  await almacen.actualizarTarea("stand", { estado: "pagado", hashPago: null });
  const pagada = await subir(almacen, fotos, await jpegDePrueba());
  assert.equal(pagada.status, 409);
  const token = await emitirTokenEvidenciaHttp(pedidoToken(), { almacen, fotos, actor: ACTOR });
  assert.equal(token.status, 409);
  assert.equal((await almacen.leerTarea("stand"))?.estado, "pagado");
});

test("sin veredicto la etapa queda en revisión", async () => {
  const almacen = crearMemoria();
  await asegurarSemilla(almacen);
  const creadaEn = "2026-10-05T18:04:00.000Z";
  await almacen.crearEvidencia({
    id: "foto-real",
    tareaId: "bienvenida",
    blobId: "blob/real",
    monto: null,
    montoConfirmado: null,
    fecha: null,
    creadaEn,
  });
  await almacen.actualizarTarea("bienvenida", { estado: "en revisión" });
  const cuerpo = (await (await listarTareasHttp(almacen, { usuarioId: "voluntario-3", demo: false }, "mias")).json()) as {
    tareas: { id: string; etapa: string | null; enviadaEn: string | null }[];
  };
  const tarea = cuerpo.tareas.find((item) => item.id === "bienvenida");
  assert.equal(tarea?.etapa, "en_revision");
  assert.equal(tarea?.enviadaEn, creadaEn);
});

async function envioDe(almacen: Awaited<ReturnType<typeof crearMemoria>>) {
  const respuesta = await listarTareasHttp(almacen, { usuarioId: "voluntario-1", demo: false }, "mias");
  const cuerpo = (await respuesta.json()) as { tareas: { id: string; etapa: string | null; enviadaEn: string | null }[] };
  return cuerpo.tareas.find((tarea) => tarea.id === "stand");
}

async function subir(
  almacen: Awaited<ReturnType<typeof crearMemoria>>,
  fotos: ReturnType<typeof crearFotosMemoria>,
  bytes: Uint8Array<ArrayBuffer>,
) {
  const cuerpo = new FormData();
  cuerpo.set("tareaId", "stand");
  cuerpo.set("token", tokenDePrueba("voluntario-1", "stand"));
  cuerpo.set("capturadaEn", new Date().toISOString());
  cuerpo.set("foto", new Blob([bytes], { type: "image/jpeg" }), "evidencia.jpg");
  return publicarEvidenciaHttp(new Request("http://local/api/evidencias", { method: "POST", body: cuerpo }), {
    almacen,
    fotos,
    actor: ACTOR,
    revisarTarea: async () => ({ ...desdeGuion("trabajo", null), veredicto: "cumplió" as const, origen: "scout" as const, score: "80" }),
  });
}

function pedidoToken(): Request {
  return new Request("http://local/api/evidencias/token", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ tareaId: "stand" }),
  });
}
