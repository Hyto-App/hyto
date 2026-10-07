import assert from "node:assert/strict";
import test from "node:test";
import { PDF_MINIMO, pdfConTexto } from "./muestras";
import { FalloRevision } from "@/lib/revision/fallo";
import { TOPE_TRANSCRIPCION, textoDeHtml, transcribirEvidencia } from "./transcribir";

test("un html deja títulos y texto y tira el script", () => {
  const html = "<h2>Market</h2><script>alert(1)</script><p>Caf&eacute; &amp; receipt</p><ul><li>Meal</li></ul>";
  const texto = textoDeHtml(html);
  assert.match(texto, /## Market/);
  assert.match(texto, /Café & receipt/);
  assert.match(texto, /- Meal/);
  assert.equal(texto.includes("alert"), false);
  assert.equal(texto.includes("<"), false);
});

test("un txt y un markdown se leen tal cual, con un tope", async () => {
  const nota = await transcribirEvidencia({
    tipo: "text/plain",
    bytes: new TextEncoder().encode("\uFEFFTeam meal receipt\n"),
  });
  assert.equal(nota.texto, "Team meal receipt");
  assert.equal(nota.monto, null);
  assert.equal(nota.fecha, null);

  const markdown = await transcribirEvidencia({
    tipo: "text/markdown",
    bytes: new TextEncoder().encode("# Title\n\n<b>keep</b>\n"),
  });
  assert.match(markdown.texto, /# Title/);
  assert.match(markdown.texto, /<b>keep<\/b>/);

  const largo = await transcribirEvidencia({
    tipo: "text/plain",
    bytes: new TextEncoder().encode("Meal ".repeat(2_000)),
  });
  assert.equal(largo.texto.length <= TOPE_TRANSCRIPCION, true);
  assert.equal(largo.texto.length > TOPE_TRANSCRIPCION - 20, true);
  assert.equal(largo.texto.startsWith("Meal "), true);
});

test("un PDF con texto se extrae y uno vacío o roto no se cae", async () => {
  const leido = await transcribirEvidencia({
    tipo: "application/pdf",
    bytes: pdfConTexto("Team meal receipt"),
  });
  assert.match(leido.texto, /Team meal receipt/);
  assert.equal(leido.monto, null);

  for (const bytes of [pdfConTexto(""), PDF_MINIMO]) {
    await assert.rejects(
      () => transcribirEvidencia({ tipo: "application/pdf", bytes }),
      (error: unknown) => {
        assert.ok(error instanceof FalloRevision);
        assert.equal(error.code, "sin_texto");
        assert.match(error.message, /no readable text/);
        return true;
      },
    );
  }
});
