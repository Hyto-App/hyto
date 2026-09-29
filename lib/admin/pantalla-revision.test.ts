import "../../tests/integracion/dom-global";
import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { act } from "react";
import { Informe } from "@/components/admin/Informe";
import { Revision } from "@/components/admin/Revision";
import { ProveedorModoDemo } from "@/components/sesion/InsigniaDemo";
import { desmontar, montar, pulsar, texto } from "../../tests/integracion/montar";

const MENSAJE = "La IA no está configurada";

test("la revisión muestra el error y reintenta con POST", async () => {
  const llamadas: { url: string; method: string }[] = [];
  const anterior = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    llamadas.push({ url, method });
    if (method === "POST") {
      return json({
        tarea: tarea({ origen: "scout", codigo: null, veredicto: "parcial", frase: "Banner de ZEEK de frente." }),
        foto: "/api/evidencias/1/foto",
        contratoEscrow: null,
        wallet: "GORGANIZADOR",
      });
    }
    if (url === "/api/tareas") return json({ tareas: [{ id: "stand", hashPago: null, contratoEscrow: null }] });
    return json({
      tarea: tarea({ origen: "error", codigo: "sin_clave", veredicto: null, frase: MENSAJE }),
      foto: "/api/evidencias/1/foto",
      contratoEscrow: null,
      wallet: "GORGANIZADOR",
    });
  }) as typeof fetch;

  try {
    await montar(createElement(Revision, { tareaId: "stand" }));
    await act(async () => {
      await new Promise((resolver) => setTimeout(resolver, 30));
    });
    const alerta = document.querySelector("[role=alert]");
    assert.equal(alerta?.textContent, MENSAJE);
    assert.match(texto(), /error/);
    assert.equal(texto().includes("Mesa armada, banner de ZEEK de frente, tres cajas"), false);
    await pulsar("Reintentar revisión");
    await act(async () => {
      await new Promise((resolver) => setTimeout(resolver, 30));
    });
    assert.equal(
      llamadas.some((llamada) => llamada.method === "POST" && llamada.url === "/api/revision/stand"),
      true,
    );
    assert.match(texto(), /IA/);
    assert.equal(document.querySelector("[role=alert]"), null);
    assert.match(texto(), /Banner de ZEEK de frente/);
  } finally {
    globalThis.fetch = anterior;
    await desmontar();
  }
});

test("el demo muestra el guion como simulado y no ofrece reintentar", async () => {
  await montar(createElement(ProveedorModoDemo, { activo: true, children: createElement(Revision, { tareaId: "stand" }) }));
  await act(async () => {
    await new Promise((resolver) => setTimeout(resolver, 20));
  });
  assert.match(texto(), /simulado/);
  assert.match(texto(), /Mesa armada, banner de ZEEK de frente y el salón visible/);
  assert.equal(texto().includes("Reintentar revisión"), false);
  assert.equal(document.querySelector("[role=alert]"), null);
  await desmontar();
});

test("el informe muestra el origen y el error", async () => {
  const anterior = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (init?.method === "POST") {
      return json({
        tarea: tarea({ origen: "scout", codigo: null, veredicto: "parcial", frase: "Listo de verdad." }),
        foto: null,
      });
    }
    if (url === "/api/tareas") return json({ tareas: [{ id: "stand" }] });
    if (url === "/api/proyectos") return json({ proyecto: { nombre: "ZEEK" } });
    if (url.startsWith("/api/revision/")) {
      return json({
        tarea: tarea({ origen: "error", codigo: "tiempo", veredicto: null, frase: "La IA no respondió a tiempo" }),
        foto: null,
      });
    }
    return json({ aviso: "no" }, 404);
  }) as typeof fetch;

  try {
    await montar(createElement(Informe));
    await act(async () => {
      await new Promise((resolver) => setTimeout(resolver, 40));
    });
    assert.equal(document.querySelector("[role=alert]")?.textContent, "La IA no respondió a tiempo");
    assert.match(texto(), /error/);
    await pulsar("Reintentar revisión");
    await act(async () => {
      await new Promise((resolver) => setTimeout(resolver, 30));
    });
    assert.match(texto(), /IA/);
    assert.match(texto(), /Listo de verdad/);
    assert.equal(document.querySelector("[role=alert]"), null);
  } finally {
    globalThis.fetch = anterior;
    await desmontar();
  }
});

function tarea(parcial: Record<string, unknown>) {
  return {
    id: "stand",
    titulo: "Montar el stand",
    tipo: "trabajo",
    monto: "20",
    tope: null,
    condicion: "Banner visible",
    miembroId: "voluntario-1",
    miembro: "Voluntario 1",
    estado: "en revisión",
    veredicto: "cumplió",
    frase: "Listo",
    origen: "guion",
    codigo: null,
    montoRevisado: null,
    fecha: null,
    hashPago: null,
    credencialUrl: null,
    ...parcial,
  };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
