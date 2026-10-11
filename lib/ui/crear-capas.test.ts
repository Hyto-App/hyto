import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const CSS = readFileSync(new URL("../../components/admin/crear.css", import.meta.url), "utf8");

/** Every rule (selector list → body) in the file, media blocks included. */
function reglas(): { selectores: string[]; cuerpo: string }[] {
  const sinComentarios = CSS.replace(/\/\*[\s\S]*?\*\//g, "");
  const salida: { selectores: string[]; cuerpo: string }[] = [];
  for (const m of sinComentarios.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    salida.push({ selectores: m[1]!.split(",").map((s) => s.trim()).filter(Boolean), cuerpo: m[2]! });
  }
  return salida;
}

function ultimoPointer(selector: string): string | null {
  let valor: string | null = null;
  for (const regla of reglas()) {
    if (!regla.selectores.includes(selector)) continue;
    const m = /pointer-events:\s*([a-z]+)/.exec(regla.cuerpo);
    if (m) valor = m[1]!;
  }
  return valor;
}

test("las capas decorativas de Crear proyecto no toman clics", () => {
  for (const selector of [".cp-arte", ".cp-arte *", ".cp-portada::after", ".cp-vista-portada::after", ".cp-tarjeta::before", ".cp-subrayado", ".cp-dock", ".cp-dock-col"]) {
    assert.equal(ultimoPointer(selector), "none", selector);
  }
  // The bar and the buttons inside the dock still take clicks.
  assert.equal(ultimoPointer(".cp-dock-col > *"), "auto");
});

test("ninguna capa de Crear proyecto se pone encima de la escena con un z-index alto", () => {
  // .cp itself is 60 (over the shell). Inside it, nothing should climb over the dock (6) except the name card (3) and the top bar (5).
  const altos = reglas()
    .filter((regla) => /z-index:\s*(\d+)/.test(regla.cuerpo))
    .map((regla) => ({ selectores: regla.selectores.join(", "), z: Number(/z-index:\s*(\d+)/.exec(regla.cuerpo)![1]) }))
    .filter((item) => item.selectores !== ".cp" && item.z > 6);
  assert.deepEqual(altos, []);
});
