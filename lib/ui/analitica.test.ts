import assert from "node:assert/strict";
import test from "node:test";
import { filtrarUrlAnalitica } from "./analitica";

test("la analítica oculta el secreto del enlace de unión y la consulta", () => {
  const salida = filtrarUrlAnalitica("https://hyto.vercel.app/join/HYTO-ABCDEFGHJKLM?next=%2Fmis-tareas#x");
  assert.equal(salida, "https://hyto.vercel.app/join/[invite]");
});

test("la analítica deja las rutas normales sin consulta", () => {
  assert.equal(filtrarUrlAnalitica("https://hyto.vercel.app/eventos?q=1"), "https://hyto.vercel.app/eventos");
  assert.equal(filtrarUrlAnalitica("https://hyto.vercel.app/join"), "https://hyto.vercel.app/join");
  assert.equal(filtrarUrlAnalitica("https://hyto.vercel.app/join/"), "https://hyto.vercel.app/join/");
});

test("una URL inválida no se envía", () => {
  assert.equal(filtrarUrlAnalitica("no-es-una-url"), null);
});
