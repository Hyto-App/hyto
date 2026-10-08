import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { contadorCerca, contextoAbierto, errorPortada, hayTextoMile, mostrarRecibos } from "./campos-evento";
import { en, es } from "./diccionario";

const leer = (ruta: string) => readFileSync(new URL(ruta, import.meta.url), "utf8");
const css = leer("../../app/globals.css");
const campos = leer("../../components/admin/CamposEvento.tsx");
const form = leer("../../components/admin/CrearProyecto.tsx");

test("counter turns pink from 90 % of the limit", () => {
  assert.equal(contadorCerca(899, 1000), false);
  assert.equal(contadorCerca(900, 1000), true);
  assert.equal(contadorCerca(1800, 2000), true);
  assert.equal(contadorCerca(1799, 2000), false);
});

test("the live region only carries text past the threshold", () => {
  assert.match(campos, /aria-live="polite"[\s\S]{0,40}cerca \? t\("eventos\.counterNear"\) : ""/);
});

test("the Mile card is collapsed when empty and open with text or after opening", () => {
  assert.equal(contextoAbierto("", false), false);
  assert.equal(contextoAbierto("x", false), true);
  assert.equal(contextoAbierto("", true), true);
});

test("the cover dropzone keeps a focusable labelled input and a Remove button", () => {
  assert.match(campos, /<label[^>]*htmlFor=\{id\}/);
  assert.match(campos, /type="file"/);
  assert.match(campos, /accept="image\/jpeg,image\/png,image\/webp"/);
  assert.match(campos, /className="sr-only"/);
  assert.match(campos, /URL\.revokeObjectURL/);
  assert.match(campos, /eventos\.coverRemove/);
  assert.match(form, /id="portada-proyecto"/);
});

test("textareas do not resize by hand and previews use a 16:9 frame", () => {
  assert.match(css, /\.hyto-area \{[^}]*resize:\s*none/);
  assert.match(css, /\.hyto-marco-16-9 \{[^}]*aspect-ratio:\s*16 \/ 9/);
  assert.match(css, /--contador-alto:\s*#ff4d8d/);
  assert.doesNotMatch(campos + form, /#[0-9a-fA-F]{6}/);
});

test("cover files are checked by type and size, on pick and on drop", () => {
  assert.equal(errorPortada({ type: "image/png", size: 1024 }), null);
  assert.equal(errorPortada({ type: "image/webp", size: 5 * 1024 * 1024 }), null);
  assert.equal(errorPortada({ type: "image/svg+xml", size: 1024 }), "type");
  assert.equal(errorPortada({ type: "image/png", size: 14 * 1024 * 1024 }), "size");
  assert.match(campos, /function elegir[\s\S]{0,200}errorPortada/);
  assert.match(campos, /onDrop=\{[\s\S]{0,200}elegir\(/);
});

test("the organizer's event page renders the cover and description card", () => {
  const pagina = leer("../../app/(admin)/eventos/[id]/page.tsx");
  assert.equal((pagina.match(/<ContextoEvento/g) ?? []).length, 2);
});

test("receipts question shows only while a task is a reimbursement", () => {
  assert.equal(mostrarRecibos([]), false);
  assert.equal(mostrarRecibos(["trabajo", "trabajo"]), false);
  assert.equal(mostrarRecibos(["trabajo", "reembolso"]), true);
});

test("the For Mile card stays open while any field has text", () => {
  assert.equal(hayTextoMile({ lugar: "", recibos: "" }), false);
  assert.equal(hayTextoMile({ lugar: "", recibos: "x" }), true);
});

test("the guided For Mile strings exist in English and Spanish with the same keys", () => {
  assert.deepEqual(Object.keys(en.eventos.mileCampos), Object.keys(es.eventos.mileCampos));
  for (const [clave, valor] of Object.entries(en.eventos.mileCampos)) {
    assert.ok(valor && (es.eventos.mileCampos as Record<string, string>)[clave], clave);
  }
  for (const clave of ["mileAbout", "mileAboutHelp", "mileRules", "mileRulesHelp"] as const) {
    assert.ok(en.eventos[clave] && es.eventos[clave], clave);
  }
});

test("the new strings exist in English and Spanish", () => {
  for (const clave of ["detailsTitle", "coverDrop","coverReplace", "coverRemove", "coverPreviewAlt", "mileTitle", "mileLock", "mileAdd", "mileHide", "counterNear"]) {
    assert.ok((en.eventos as unknown as Record<string, unknown>)[clave], `en ${clave}`);
    assert.ok((es.eventos as unknown as Record<string, unknown>)[clave], `es ${clave}`);
  }
});
