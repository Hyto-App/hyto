import "../../tests/integracion/dom-global";
import assert from "node:assert/strict";
import test from "node:test";
import { elementosFoco, teclaDialogo } from "./dialogo";

test("Tab no sale del diálogo y Esc pide cerrarlo", () => {
  document.body.innerHTML = `<div id="caja"><button id="a">A</button><a href="/x" id="b">B</a><button disabled id="c">C</button></div>`;
  const raiz = document.getElementById("caja");
  assert.ok(raiz);
  assert.deepEqual(
    elementosFoco(raiz).map((el) => el.id),
    ["a", "b"],
  );
  const a = document.getElementById("a");
  const b = document.getElementById("b");
  assert.ok(a && b);
  b.focus();
  let cerrado = false;
  teclaDialogo({ key: "Tab", shiftKey: false, preventDefault() {}, target: b }, raiz, () => {
    cerrado = true;
  });
  assert.equal(document.activeElement, a);
  assert.equal(cerrado, false);
  teclaDialogo({ key: "Escape", shiftKey: false, preventDefault() {}, target: a }, raiz, () => {
    cerrado = true;
  });
  assert.equal(cerrado, true);
  document.body.innerHTML = "";
});
