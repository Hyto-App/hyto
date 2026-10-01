import assert from "node:assert/strict";
import test from "node:test";
import { crearFotosMemoria } from "../blob/fotos";
import { crearMemoria } from "../db/memoria";
import { publicarEvidenciaHttp } from "./evidencias";

async function publicar(foto: Blob, nombre: string): Promise<Response> {
  const cuerpo = new FormData();
  cuerpo.set("tareaId", "stand");
  cuerpo.set("foto", foto, nombre);
  return publicarEvidenciaHttp(new Request("http://local/api/evidencias", { method: "POST", body: cuerpo }), {
    almacen: crearMemoria(),
    fotos: crearFotosMemoria(),
  });
}

test("la subida rechaza svg, gif y una foto vacía", async () => {
  const svg = await publicar(new Blob(["<svg xmlns='http://www.w3.org/2000/svg'/>"], { type: "image/svg+xml" }), "dibujo.svg");
  assert.equal(svg.status, 400);
  assert.equal(((await svg.json()) as { aviso: string }).aviso, "Choose a photo.");

  const gif = await publicar(new Blob([Uint8Array.from([1, 2, 3])], { type: "image/gif" }), "anim.gif");
  assert.equal(gif.status, 400);

  const vacia = await publicar(new Blob([], { type: "image/jpeg" }), "vacia.jpg");
  assert.equal(vacia.status, 400);
});
