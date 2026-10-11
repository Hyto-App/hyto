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
  for (const selector of [".cp-arte", ".cp-arte *", ".cp-portada::after", ".cp-vista-portada::after", ".cp-tarjeta::before", ".cp-cursor", ".cp-dock", ".cp-dock-col"]) {
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

/** The body of every `@media (...)` block whose query matches, in file order. */
function bloquesMedia(consulta: string): string[] {
  const sinComentarios = CSS.replace(/\/\*[\s\S]*?\*\//g, "");
  const bloques: string[] = [];
  let desde = 0;
  for (;;) {
    const inicio = sinComentarios.indexOf(`@media ${consulta}`, desde);
    if (inicio < 0) return bloques;
    let i = sinComentarios.indexOf("{", inicio) + 1;
    const cuerpo = i;
    for (let nivel = 1; nivel > 0; i++) {
      if (sinComentarios[i] === "{") nivel++;
      if (sinComentarios[i] === "}") nivel--;
    }
    bloques.push(sinComentarios.slice(cuerpo, i - 1));
    desde = i;
  }
}

function propiedad(bloque: string, selector: string, nombre: string): string | null {
  let valor: string | null = null;
  for (const m of bloque.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (!m[1]!.split(",").map((s) => s.trim()).includes(selector)) continue;
    const p = new RegExp(`(?:^|;|\\s)${nombre}:\\s*([^;]+);`).exec(m[2]!);
    if (p) valor = p[1]!.trim();
  }
  return valor;
}

test("en escritorio Crear proyecto vive dentro del marco con el menú y el botón cierra el formulario", () => {
  const escritorio = bloquesMedia("(min-width: 1024px)").join("\n");
  // Not a full-screen layer over the sidebar.
  assert.equal(propiedad(escritorio, ".cp", "position"), "relative");
  assert.equal(propiedad(escritorio, ".cp", "z-index"), "auto");
  assert.equal(propiedad(escritorio, ".cp", "overflow"), "visible");
  // The button bar is part of the form, not fixed.
  assert.equal(propiedad(escritorio, ".cp-dock", "position"), "static");
  // The right column stays in view.
  const ancho = bloquesMedia("(min-width: 1200px)").join("\n");
  assert.equal(propiedad(ancho, ".cp-lado", "position"), "sticky");
});

test("la barra de arriba es sólida y pegada, así el contenido pasa por debajo", () => {
  const base = reglas().filter((regla) => regla.selectores.includes(".cp-top"));
  const ultimo = (nombre: string) => {
    let valor: string | null = null;
    for (const regla of base) {
      const m = new RegExp(`(?:^|;|\\s)${nombre}:\\s*([^;]+);`).exec(regla.cuerpo);
      if (m) valor = m[1]!.trim();
    }
    return valor;
  };
  assert.equal(ultimo("position"), "sticky");
  assert.equal(ultimo("background")?.toLowerCase(), "#08090c");
  assert.match(ultimo("backdrop-filter") ?? "", /blur/);
  // No step turns it back into a see-through layer over the content.
  assert.equal(reglas().some((regla) => regla.selectores.some((s) => /\.cp-top$/.test(s) && s !== ".cp-top") && /position:\s*absolute/.test(regla.cuerpo)), false);
});
