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

test("un trabajo solo ofrece la cámara y un reembolso solo el archivo", async () => {
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
    assert.match(texto(), /Open camera/);
    assert.doesNotMatch(texto(), /Choose a photo/);
    assert.doesNotMatch(texto(), /Choose a PDF/);
    await desmontar();
    limpiarPantalla();

    await montar(createElement(ProveedorModoDemo, { activo: false, children: createElement(SubirEvidencia, { tareaId: "comida" }) }));
    await act(async () => {
      await new Promise((resolver) => setTimeout(resolver, 30));
    });
    assert.match(texto(), /Choose a file/);
    assert.match(texto(), /Choose a PDF or image/);
    assert.doesNotMatch(texto(), /Open camera/);
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
