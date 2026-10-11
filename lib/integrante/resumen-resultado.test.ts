import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MiniaturaEvidencia } from "../../components/integrante/evidencia/MiniaturaEvidencia";
import { ResumenResultado } from "../../components/integrante/evidencia/ResumenResultado";
import { ProveedorIdioma } from "../../components/ui/Idioma";
import type { Tarea } from "./tipos";

type Nota = NonNullable<Tarea["notas"]>[number];

function dibujar(notas: Nota[], nota: number, veredicto: "cumplió" | "parcial" | "insuficiente", idioma: "es" | "en" = "es"): string {
  const tarea = { id: "t1", estado: "en revisión", notas } as unknown as Tarea;
  return renderToStaticMarkup(
    createElement(
      ProveedorIdioma,
      { idioma, children: undefined },
      createElement(ResumenResultado, { tarea, titulo: "Stand", calificacion: { veredicto, nota }, montoVisible: "Monto a pagar US$2.90 · Límite US$4" }),
    ),
  );
}

test("the result card shows the percentage, the state and the amount", () => {
  const html = dibujar([{ id: "matches", texto: "Matches the task", explicacion: "Fits.", severidad: "good", preguntas: [] }], 88, "cumplió");
  assert.match(html, /88%/);
  assert.match(html, /Completado/);
  assert.match(html, /Monto a pagar US\$2\.90/);
  assert.match(html, /hyto-resumen-notas/);
  assert.match(html, /hyto-resumen-caja/);
});

test("a part_missing tag adds the orange strip with «Falta: …»", () => {
  const html = dibujar(
    [{ id: "part_missing", texto: "Part missing", explicacion: "Missing: el mantel; la hoja de registro.", severidad: "warning", preguntas: [] }],
    64,
    "parcial",
  );
  assert.match(html, /role="note"/);
  assert.match(html, /hyto-resumen-falta/);
  assert.match(html, /Falta: el mantel; la hoja de registro\./);
  assert.equal((html.match(/Falta: el mantel/g) ?? []).length, 1, "the missing list shows once, only in the strip");
});

test("a completed invoice with only good tags has no orange strip", () => {
  const html = dibujar([{ id: "matches", texto: "Matches the task", explicacion: "Fits.", severidad: "good", preguntas: [] }], 92, "cumplió");
  assert.doesNotMatch(html, /hyto-resumen-falta/);
  assert.doesNotMatch(html, /Falta:/);
});

test("a PDF, a text list, or a missing file shows a file icon, never a broken image", () => {
  for (const props of [
    { src: null, documento: false, etiqueta: "Evidencia" },
    { src: "/api/evidencias/e1/foto", documento: true, etiqueta: "PDF de la factura" },
  ]) {
    const html = renderToStaticMarkup(createElement(MiniaturaEvidencia, props));
    assert.doesNotMatch(html, /<img/);
    assert.match(html, /hyto-resumen-icono/);
    assert.match(html, /<svg/);
  }
  assert.match(renderToStaticMarkup(createElement(MiniaturaEvidencia, { src: "/f.jpg", documento: false, etiqueta: "Foto" })), /<img/);
});
