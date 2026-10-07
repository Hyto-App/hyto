import assert from "node:assert/strict";
import test from "node:test";
import { crearFotosMemoria } from "../blob/fotos";
import { crearMemoria } from "../db/memoria";
import { asegurarSemilla } from "../db/semilla";
import { publicarEvidenciaHttp } from "./evidencias";

async function publicar(tareaId: string, foto: Blob, nombre: string): Promise<Response> {
  const cuerpo = new FormData();
  cuerpo.set("tareaId", tareaId);
  cuerpo.set("foto", foto, nombre);
  const almacen = crearMemoria();
  await asegurarSemilla(almacen);
  return publicarEvidenciaHttp(new Request("http://local/api/evidencias", { method: "POST", body: cuerpo }), {
    almacen,
    fotos: crearFotosMemoria(),
  });
}

const SVG = "<svg xmlns='http://www.w3.org/2000/svg'/>";
const GIF = Uint8Array.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 1, 0, 1, 0]);

test("la subida rechaza svg, gif y un archivo vacío aunque digan ser jpeg", async () => {
  for (const tareaId of ["stand", "comida"]) {
    const casos = [
      await publicar(tareaId, new Blob([SVG], { type: "image/svg+xml" }), "dibujo.svg"),
      await publicar(tareaId, new Blob([SVG], { type: "image/jpeg" }), "dibujo.jpg"),
      await publicar(tareaId, new Blob([GIF], { type: "image/gif" }), "anim.gif"),
      await publicar(tareaId, new Blob([GIF], { type: "image/jpeg" }), "anim.jpg"),
      await publicar(tareaId, new Blob([], { type: "image/jpeg" }), "vacia.jpg"),
    ];
    for (const respuesta of casos) assert.equal(respuesta.status, 400, tareaId);
  }
});
