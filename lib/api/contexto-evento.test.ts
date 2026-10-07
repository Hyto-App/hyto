import assert from "node:assert/strict";
import test from "node:test";
import { crearFotosMemoria } from "@/lib/blob/fotos";
import { crearMemoria } from "@/lib/db/memoria";
import { visorSesion } from "./alcance";
import { guardarPortadaHttp, leerPortadaHttp, MAX_BYTES_PORTADA } from "./contexto-evento";
import { crearProyectoHttp, leerProyectoHttp } from "./proyectos";

const SECRETO_IA = "Booth B is behind the green gate. Reject photos of the old stage.";
const TAREA = { titulo: "Booth", tipo: "trabajo", monto: "20", condicion: "The booth is set up" };

const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const JPEG = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]);
const SVG = new TextEncoder().encode("<svg xmlns='http://www.w3.org/2000/svg'/>");

async function nuevoEvento(cuerpo: Record<string, unknown>) {
  const almacen = crearMemoria();
  await almacen.guardarUsuario({ id: "org", email: "org@hyto.app", nombre: "Org", rol: "voluntario" });
  await almacen.guardarUsuario({ id: "vol", email: "vol@hyto.app", nombre: "Vol", rol: "voluntario" });
  const respuesta = await crearProyectoHttp(
    new Request("http://local/api/proyectos", { method: "POST", body: JSON.stringify({ nombre: "Feria", tareas: [TAREA], ...cuerpo }) }),
    almacen,
    "org",
  );
  const datos = (await respuesta.json()) as { proyecto?: { id: string }; aviso?: string };
  return { almacen, respuesta, id: datos.proyecto?.id ?? "", datos };
}

function portada(bytes: Uint8Array, tipo: string): Request {
  const cuerpo = new FormData();
  cuerpo.set("portada", new Blob([bytes], { type: tipo }), "portada");
  return new Request("http://local/api/eventos/x/portada", { method: "POST", body: cuerpo });
}

test("crear un evento sin los campos nuevos los deja vacíos", async () => {
  const { almacen, respuesta, id } = await nuevoEvento({});
  assert.equal(respuesta.status, 201);
  const proyecto = await almacen.leerProyecto(id);
  assert.equal(proyecto?.descripcion ?? null, null);
  assert.equal(proyecto?.contextoIa ?? null, null);
  assert.equal(proyecto?.portada ?? null, null);
});

test("crear un evento con descripción y contexto para la IA los guarda recortados", async () => {
  const { almacen, respuesta, id } = await nuevoEvento({ descripcion: "  Street fair  ", contextoIa: SECRETO_IA });
  assert.equal(respuesta.status, 201);
  const proyecto = await almacen.leerProyecto(id);
  assert.equal(proyecto?.descripcion, "Street fair");
  assert.equal(proyecto?.contextoIa, SECRETO_IA);
});

test("la descripción y el contexto respetan 1000 y 2000 caracteres", async () => {
  const largaDescripcion = await nuevoEvento({ descripcion: "a".repeat(1001) });
  assert.equal(largaDescripcion.respuesta.status, 400);
  const largoContexto = await nuevoEvento({ contextoIa: "a".repeat(2001) });
  assert.equal(largoContexto.respuesta.status, 400);
  const justo = await nuevoEvento({ descripcion: "a".repeat(1000), contextoIa: "a".repeat(2000) });
  assert.equal(justo.respuesta.status, 201);
});

test("el contexto para la IA no sale en ninguna respuesta para un voluntario ni en la de creación", async () => {
  const { almacen, id, respuesta } = await nuevoEvento({ descripcion: "Street fair", contextoIa: SECRETO_IA });
  await almacen.guardarMiembro({ proyectoId: id, usuarioId: "vol", rol: "volunteer", estado: "active", creadoEn: "2026-10-07T00:00:00.000Z" });
  const lectura = await leerProyectoHttp(almacen, visorSesion("vol"), { id });
  const texto = await lectura.text();
  assert.equal(lectura.status, 200);
  assert.ok(texto.includes("Street fair"));
  assert.ok(!texto.includes(SECRETO_IA));
  assert.ok(!/contextoIa|contexto_ia/i.test(texto));
  assert.ok(!(await respuesta.clone().text()).includes(SECRETO_IA));
});

test("la portada acepta jpeg y png y rechaza svg, gif y tipos falsos", async () => {
  const { almacen, id } = await nuevoEvento({});
  const fotos = crearFotosMemoria();
  assert.equal((await guardarPortadaHttp(portada(PNG, "image/png"), almacen, fotos, id, "org")).status, 201);
  assert.equal((await guardarPortadaHttp(portada(JPEG, "image/jpeg"), almacen, fotos, id, "org")).status, 201);
  assert.equal((await guardarPortadaHttp(portada(SVG, "image/svg+xml"), almacen, fotos, id, "org")).status, 400);
  assert.equal((await guardarPortadaHttp(portada(SVG, "image/png"), almacen, fotos, id, "org")).status, 400);
  const gif = Uint8Array.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 1, 0, 1, 0]);
  assert.equal((await guardarPortadaHttp(portada(gif, "image/jpeg"), almacen, fotos, id, "org")).status, 400);
});

test("la portada rechaza más de 5 MB y a quien no organiza", async () => {
  const { almacen, id } = await nuevoEvento({});
  const fotos = crearFotosMemoria();
  const grande = new Uint8Array(MAX_BYTES_PORTADA + 1);
  grande.set(JPEG);
  assert.equal((await guardarPortadaHttp(portada(grande, "image/jpeg"), almacen, fotos, id, "org")).status, 413);
  assert.equal((await guardarPortadaHttp(portada(JPEG, "image/jpeg"), almacen, fotos, id, "vol")).status, 403);
});

test("un miembro lee la portada y quien no es del evento no", async () => {
  const { almacen, id } = await nuevoEvento({});
  await almacen.guardarMiembro({ proyectoId: id, usuarioId: "vol", rol: "volunteer", estado: "active", creadoEn: "2026-10-07T00:00:00.000Z" });
  const fotos = crearFotosMemoria();
  await guardarPortadaHttp(portada(PNG, "image/png"), almacen, fotos, id, "org");
  const miembro = await leerPortadaHttp(almacen, fotos, id, visorSesion("vol"));
  assert.equal(miembro.status, 200);
  assert.equal(miembro.headers.get("content-type"), "image/png");
  assert.equal(miembro.headers.get("x-content-type-options"), "nosniff");
  const ajeno = await leerPortadaHttp(almacen, fotos, id, visorSesion("otra-persona"));
  assert.equal(ajeno.status, 404);
});
