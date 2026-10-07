import "../../tests/integracion/dom-global";
import assert from "node:assert/strict";
import { File as ArchivoNode } from "node:buffer";
import test from "node:test";
import { createElement } from "react";
import { act } from "react";
import { SubirEvidencia } from "../../components/integrante/SubirEvidencia";
import { ProveedorModoDemo } from "../../components/sesion/InsigniaDemo";
import { desmontar, limpiarPantalla, montar, pulsar, texto } from "../../tests/integracion/montar";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function pestanas(): HTMLButtonElement[] {
  return [...document.querySelectorAll('[role="tab"]')].filter((nodo) => nodo instanceof HTMLButtonElement);
}

function entradaArchivo(): HTMLInputElement | null {
  const entrada = document.querySelector('input[type="file"]');
  return entrada instanceof HTMLInputElement ? entrada : null;
}

function envioDeshabilitado(): boolean {
  const envio = [...document.querySelectorAll("button")].find((boton) => boton.textContent === "Send evidence");
  return envio instanceof HTMLButtonElement && envio.disabled;
}

test("las pestañas Recibo y Tarea muestran una sola carga", async () => {
  const original = globalThis.fetch;
  const fetchImpl: typeof fetch = async (input) => {
    const url = String(input);
    if (url.includes("/api/tareas")) {
      return json({
        tareas: [
          {
            id: "stand",
            titulo: "Set up the booth",
            tipo: "trabajo",
            monto: "20",
            condicion: "Show the work",
            miembroId: "voluntario-1",
            estado: "pendiente",
            proyectoId: "zeek",
          },
          {
            id: "comida",
            titulo: "Team meal",
            tipo: "reembolso",
            monto: "15",
            condicion: "Receipt",
            miembroId: "voluntario-1",
            estado: "pendiente",
            proyectoId: "zeek",
          },
        ],
      });
    }
    if (url.includes("/api/proyectos")) return json({ proyectos: [{ id: "zeek", nombre: "ZEEK" }] });
    return json({}, 404);
  };
  globalThis.fetch = fetchImpl;
  try {
    await montar(createElement(ProveedorModoDemo, { activo: false, children: createElement(SubirEvidencia, { tareaId: "stand" }) }));
    await act(async () => {
      await new Promise((resolver) => setTimeout(resolver, 30));
    });
    const lista = document.querySelector('[role="tablist"]');
    assert.equal(lista?.getAttribute("aria-label"), "What you are sending");
    assert.deepEqual(
      pestanas().map((tab) => tab.textContent),
      ["Receipt", "Task"],
    );
    assert.equal(pestanas()[0]?.getAttribute("aria-selected"), "false");
    assert.equal(pestanas()[1]?.getAttribute("aria-selected"), "true");
    assert.equal(document.querySelectorAll('[role="tabpanel"]').length, 1);
    assert.equal(document.querySelector('[role="tabpanel"]')?.getAttribute("aria-labelledby"), pestanas()[1]?.id);
    assert.match(texto(), /Open camera/);
    assert.doesNotMatch(texto(), /Choose a PDF/);
    assert.doesNotMatch(texto(), /This task needs a camera photo/);
    assert.equal(entradaArchivo()?.accept.includes("pdf") ?? false, false);

    await pulsar("Receipt");
    assert.equal(pestanas()[0]?.getAttribute("aria-selected"), "true");
    assert.equal(pestanas()[1]?.getAttribute("aria-selected"), "false");
    assert.equal(document.querySelector('[role="tabpanel"]')?.getAttribute("aria-labelledby"), pestanas()[0]?.id);
    assert.match(texto(), /This task needs a camera photo\. Go back to the Task tab\./);
    assert.doesNotMatch(texto(), /Choose a PDF/);
    assert.doesNotMatch(texto(), /Open camera/);
    assert.equal(entradaArchivo(), null);
    const envioTrabajo = [...document.querySelectorAll("button")].find((boton) => boton.textContent === "Send evidence");
    assert.ok(envioTrabajo instanceof HTMLButtonElement);
    assert.equal(envioTrabajo.disabled, true);

    await pulsar("Go back to Task");
    assert.equal(pestanas()[1]?.getAttribute("aria-selected"), "true");
    assert.doesNotMatch(texto(), /This task needs a camera photo/);
    assert.match(texto(), /Open camera/);
    assert.equal(envioDeshabilitado(), false);

    await desmontar();
    limpiarPantalla();

    await montar(createElement(ProveedorModoDemo, { activo: false, children: createElement(SubirEvidencia, { tareaId: "comida" }) }));
    await act(async () => {
      await new Promise((resolver) => setTimeout(resolver, 30));
    });
    assert.equal(pestanas()[0]?.getAttribute("aria-selected"), "true");
    assert.match(texto(), /Choose a file/);
    assert.match(texto(), /Choose a PDF or image/);
    assert.doesNotMatch(texto(), /Open camera/);
    assert.doesNotMatch(texto(), /This task needs a receipt/);
    const recibo = entradaArchivo();
    assert.ok(recibo);
    assert.match(recibo.accept, /pdf/);

    const malo = new ArchivoNode(["no"], "notas.txt", { type: "text/plain" });
    Object.defineProperty(recibo, "files", { configurable: true, value: [malo] });
    await act(async () => {
      recibo.dispatchEvent(new window.Event("change", { bubbles: true }));
    });
    assert.match(texto(), /Choose a PDF, JPEG, PNG, or WebP file/);
    assert.doesNotMatch(texto(), /notas.txt/);

    const pdf = new ArchivoNode(["%PDF-1.4"], "recibo.pdf", { type: "application/pdf" });
    const entradaPdf = entradaArchivo();
    assert.ok(entradaPdf);
    Object.defineProperty(entradaPdf, "files", { configurable: true, value: [pdf] });
    await act(async () => {
      entradaPdf.dispatchEvent(new window.Event("change", { bubbles: true }));
    });
    assert.match(texto(), /recibo\.pdf/);
    assert.equal(envioDeshabilitado(), false);

    const tabRecibo = pestanas()[0];
    assert.ok(tabRecibo);
    await act(async () => {
      tabRecibo.dispatchEvent(new window.KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    });
    assert.equal(pestanas()[1]?.getAttribute("aria-selected"), "true");
    assert.doesNotMatch(texto(), /recibo\.pdf/);
    assert.doesNotMatch(texto(), /Choose a PDF/);
    assert.doesNotMatch(texto(), /Open camera/);
    assert.match(texto(), /This task needs a receipt as a PDF or image\. Go back to the Receipt tab\./);
    assert.equal(entradaArchivo(), null);
    assert.equal(envioDeshabilitado(), true);
    assert.equal(document.querySelectorAll('[role="tabpanel"]').length, 1);

    await pulsar("Go back to Receipt");
    assert.equal(pestanas()[0]?.getAttribute("aria-selected"), "true");
    assert.doesNotMatch(texto(), /This task needs a receipt/);
    assert.match(texto(), /Choose a PDF or image/);
  } finally {
    globalThis.fetch = original;
    await desmontar();
    limpiarPantalla();
  }
});

const comidaRemota = {
  id: "comida",
  titulo: "Team meal",
  tipo: "reembolso",
  monto: "15",
  condicion: "Receipt",
  miembroId: "voluntario-1",
  estado: "pendiente",
  proyectoId: "zeek",
};

async function esperar(): Promise<void> {
  await act(async () => {
    await new Promise((resolver) => setTimeout(resolver, 30));
  });
}

async function elegirRecibo(): Promise<void> {
  const entrada = document.querySelector('input[type="file"]');
  if (!(entrada instanceof window.HTMLInputElement)) throw new Error("Sin selector de archivo.");
  const archivo = new ArchivoNode(["%PDF-1.4"], "recibo.pdf", { type: "application/pdf" });
  Object.defineProperty(entrada, "files", { configurable: true, value: [archivo] });
  await act(async () => {
    entrada.dispatchEvent(new window.Event("change", { bubbles: true }));
  });
}

async function subirConRespuesta(respuesta: () => Response): Promise<void> {
  const fetchImpl: typeof fetch = async (input, init) => {
    const url = String(input);
    if (url.includes("/api/tareas")) return json({ tareas: [comidaRemota] });
    if (url.includes("/api/proyectos")) return json({ proyectos: [{ id: "zeek", nombre: "ZEEK" }] });
    if (url.endsWith("/api/evidencias") && init?.method === "POST") return respuesta();
    if (url.includes("/api/evidencias/")) return json({ id: "ev-1", tareaId: "comida", blobId: "blob-1" });
    return json({}, 404);
  };
  globalThis.fetch = fetchImpl;
  await montar(createElement(ProveedorModoDemo, { activo: false, children: createElement(SubirEvidencia, { tareaId: "comida" }) }));
  await esperar();
  await elegirRecibo();
  assert.match(texto(), /Send/);
  await pulsar("Send evidence");
  await esperar();
}

test("si el servidor falla, la pantalla muestra su aviso y no dice Evidence sent", async () => {
  const original = globalThis.fetch;
  const aviso = "Evidence checks need migration 0005_evidencia_antifraude.sql before new files can be saved.";
  try {
    await subirConRespuesta(() => json({ aviso }, 503));
    assert.doesNotMatch(texto(), /Evidence sent/);
    assert.doesNotMatch(texto(), /File sent/);
    assert.match(texto(), new RegExp(aviso.replace(/[.]/g, "\\.")));
    assert.match(texto(), /Upload evidence/);
    const memoria = JSON.stringify({ ...window.localStorage });
    assert.doesNotMatch(memoria, /en revisión/);
  } finally {
    globalThis.fetch = original;
    await desmontar();
    limpiarPantalla();
  }
});

test("un 201 con aviso de cobro no se muestra como envío limpio", async () => {
  const original = globalThis.fetch;
  const aviso = "This sign-in has no payout account. Sign in again and open the task so we know where to pay.";
  try {
    await subirConRespuesta(() => json({ evidencia: { id: "ev-1", tareaId: "comida", blobId: "blob-1" }, aviso }, 201));
    assert.match(texto(), /Evidence sent, action needed/);
    assert.match(texto(), /This sign-in has no payout account/);
    assert.doesNotMatch(texto(), /The organizer can review it now/);
    assert.ok(document.querySelector('[role="alert"]')?.textContent?.includes(aviso));
  } finally {
    globalThis.fetch = original;
    await desmontar();
    limpiarPantalla();
  }
});

test("un 201 sin aviso sí dice que la foto llegó", async () => {
  const original = globalThis.fetch;
  try {
    await subirConRespuesta(() => json({ evidencia: { id: "ev-1", tareaId: "comida", blobId: "blob-1" } }, 201));
    assert.match(texto(), /Your photo arrived/);
    assert.doesNotMatch(texto(), /action needed/);
    assert.match(texto(), /as soon as the organizer approves it/);
  } finally {
    globalThis.fetch = original;
    await desmontar();
    limpiarPantalla();
  }
});
