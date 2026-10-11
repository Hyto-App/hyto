import assert from "node:assert/strict";
import test from "node:test";
import { tareasSemilla } from "../db/semilla";
import { jpegDePrueba, pdfConTexto, pdfEscaneado } from "../evidencia/muestras";
import { PRESUPUESTO_REVISION_MS, TOPE_GROQ_MS } from "./reintento";
import { prepararEvidencia, revisar, type ContextoRevision } from "./revisar";

/**
 * One piece of evidence per task, in any format. Mile reads each one:
 * a photo through vision (Groq, then Gemini), a PDF, a text list, or an HTML receipt through the local
 * text path, and a scanned PDF (no text layer) as an image through vision. Mile never moves money.
 */

type Llamada = { url: string; imagen: string | null };

function proveedor(llamadas: Llamada[], opciones: { groqFalla?: boolean } = {}): typeof fetch {
  return async (input, init) => {
    const url = String(input);
    const cuerpo = JSON.parse(String(init?.body ?? "{}")) as { messages?: { content?: unknown }[] };
    const contenido = cuerpo.messages?.[0]?.content;
    const imagen = Array.isArray(contenido)
      ? ((contenido as { image_url?: { url?: string } }[]).find((parte) => parte.image_url)?.image_url?.url ?? null)
      : null;
    llamadas.push({ url, imagen });
    if (opciones.groqFalla && url.includes("groq.com")) return new Response("caído", { status: 500 });
    return Response.json({
      choices: [{ message: { content: JSON.stringify({ texto: "Factura de Soda La Esquina, total ₡4.500.", monto: null, fecha: null }) } }],
    });
  };
}

function contexto(llamadas: Llamada[], extra: Partial<ContextoRevision> = {}): ContextoRevision {
  return { claveGroq: "clave-groq", claveGemini: "clave-gemini", layaUrl: null, produccion: false, mileActivo: false, fetchImpl: proveedor(llamadas), ...extra };
}

const trabajo = () => {
  const tarea = tareasSemilla().find((item) => item.tipo === "trabajo");
  assert.ok(tarea);
  return tarea;
};

async function callado<T>(fn: () => Promise<T>): Promise<T> {
  const original = console.error;
  console.error = () => undefined;
  try {
    return await fn();
  } finally {
    console.error = original;
  }
}

test("foto: va por visión (Groq) con la imagen", async () => {
  const llamadas: Llamada[] = [];
  const resultado = await revisar(trabajo(), { tipo: "image/jpeg", bytes: await jpegDePrueba() }, contexto(llamadas));
  assert.notEqual(resultado.origen, "error");
  assert.equal(llamadas.length, 1);
  assert.match(llamadas[0]!.url, /api\.groq\.com/);
  assert.match(llamadas[0]!.imagen ?? "", /^data:image\/jpeg;base64,/);
});

test("foto: si Groq falla, Gemini la describe dentro del mismo plazo", async () => {
  const llamadas: Llamada[] = [];
  const resultado = await callado(async () =>
    revisar(trabajo(), { tipo: "image/jpeg", bytes: new Uint8Array([1, 2, 3]) }, contexto(llamadas, { fetchImpl: proveedor(llamadas, { groqFalla: true }) })),
  );
  assert.notEqual(resultado.origen, "error");
  assert.ok(llamadas.some((llamada) => llamada.url.includes("groq.com")));
  assert.ok(llamadas.some((llamada) => llamada.url.includes("generativelanguage.googleapis.com")));
});

test("PDF con texto: se lee local, sin visión", async () => {
  const llamadas: Llamada[] = [];
  const resultado = await revisar(trabajo(), { tipo: "application/pdf", bytes: pdfConTexto("Factura 00123 Soda La Esquina total 4500 colones 06/10/2026") }, contexto(llamadas));
  assert.notEqual(resultado.origen, "error");
  assert.equal(llamadas.length, 0);
  assert.match(resultado.texto, /Soda La Esquina/);
});

test("lista en TXT: se lee local, sin visión", async () => {
  const llamadas: Llamada[] = [];
  const lista = "Lista de asistencia\n- Ana Mora\n- Luis Rojas\n- Carla Vargas\nTotal: 3 personas\n";
  const resultado = await revisar(trabajo(), { tipo: "text/plain", bytes: new TextEncoder().encode(lista) }, contexto(llamadas));
  assert.notEqual(resultado.origen, "error");
  assert.equal(llamadas.length, 0);
  assert.match(resultado.texto, /Luis Rojas/);
});

test("factura en HTML: se lee local y el script no llega a Mile", async () => {
  const llamadas: Llamada[] = [];
  const html = "<h1>Factura</h1><script>alert('x')</script><p>Total ₡4.500</p>";
  const resultado = await revisar(trabajo(), { tipo: "text/html", bytes: new TextEncoder().encode(html) }, contexto(llamadas));
  assert.notEqual(resultado.origen, "error");
  assert.equal(llamadas.length, 0);
  assert.equal(resultado.texto.includes("alert"), false);
});

test("PDF escaneado (sin capa de texto): ya no termina en «Mile no pudo terminar», va por visión como imagen", async () => {
  const pdf = await pdfEscaneado();
  const preparada = await prepararEvidencia({ tipo: "application/pdf", bytes: pdf });
  assert.equal(preparada.vision?.tipo, "image/jpeg");

  const llamadas: Llamada[] = [];
  const resultado = await revisar(trabajo(), { tipo: "application/pdf", bytes: pdf }, contexto(llamadas));
  assert.notEqual(resultado.origen, "error");
  assert.equal(resultado.codigo, null);
  assert.equal(llamadas.length, 1);
  assert.match(llamadas[0]!.url, /api\.groq\.com/);
  assert.match(llamadas[0]!.imagen ?? "", /^data:image\/jpeg;base64,/);
});

test("PDF escaneado: con Groq caído también usa Gemini", async () => {
  const llamadas: Llamada[] = [];
  const resultado = await callado(async () =>
    revisar(trabajo(), { tipo: "application/pdf", bytes: await pdfEscaneado() }, contexto(llamadas, { fetchImpl: proveedor(llamadas, { groqFalla: true }) })),
  );
  assert.notEqual(resultado.origen, "error");
  assert.ok(llamadas.some((llamada) => llamada.url.includes("generativelanguage.googleapis.com")));
});

test("PDF escaneado sin claves de visión: falla claro, sin aprobar", async () => {
  const llamadas: Llamada[] = [];
  const resultado = await callado(async () =>
    revisar(trabajo(), { tipo: "application/pdf", bytes: await pdfEscaneado() }, contexto(llamadas, { claveGroq: null, claveGemini: null })),
  );
  assert.equal(resultado.origen, "error");
  assert.equal(resultado.codigo, "sin_clave");
  assert.equal(llamadas.length, 0);
});

test("PDF escaneado: respeta el plazo de Mile (Groq 20 s por intento, 45 s en total)", async () => {
  assert.equal(TOPE_GROQ_MS, 20_000);
  assert.equal(PRESUPUESTO_REVISION_MS, 45_000);
  const llamadas: Llamada[] = [];
  let reloj = 0;
  const resultado = await callado(async () =>
    revisar(trabajo(), { tipo: "application/pdf", bytes: await pdfEscaneado() }, contexto(llamadas, {
      presupuestoMs: 1_000,
      ahora: () => reloj,
      esperar: async (ms) => {
        reloj += ms;
      },
      fetchImpl: async (input) => {
        llamadas.push({ url: String(input), imagen: null });
        reloj += 5_000;
        return new Response("lento", { status: 503 });
      },
    })),
  );
  assert.equal(resultado.origen, "error");
  assert.ok(llamadas.length <= 2, `llamadas: ${llamadas.length}`);
});
