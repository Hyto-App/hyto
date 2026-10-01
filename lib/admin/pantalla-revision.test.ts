import "../../tests/integracion/dom-global";
import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { act } from "react";
import { Informe } from "@/components/admin/Informe";
import { Revision } from "@/components/admin/Revision";
import { ProveedorModoDemo } from "@/components/sesion/InsigniaDemo";
import { desmontar, montar, pulsar, texto } from "../../tests/integracion/montar";

const MENSAJE = "AI review is not configured";

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
    await pulsar("Retry review");
    await act(async () => {
      await new Promise((resolver) => setTimeout(resolver, 30));
    });
    assert.equal(
      llamadas.some((llamada) => llamada.method === "POST" && llamada.url === "/api/revision/stand"),
      true,
    );
    assert.match(texto(), /AI/);
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
  assert.match(texto(), /simulated/);
  assert.match(texto(), /Table set up, ZEEK banner facing forward, and the room is visible/);
  assert.equal(texto().includes("Retry review"), false);
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
        tarea: tarea({ origen: "error", codigo: "tiempo", veredicto: null, frase: "The AI did not respond in time" }),
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
    assert.equal(document.querySelector("[role=alert]")?.textContent, "The AI did not respond in time");
    assert.match(texto(), /error/);
    await pulsar("Retry review");
    await act(async () => {
      await new Promise((resolver) => setTimeout(resolver, 30));
    });
    assert.match(texto(), /AI/);
    assert.match(texto(), /Listo de verdad/);
    assert.equal(document.querySelector("[role=alert]"), null);
  } finally {
    globalThis.fetch = anterior;
    await desmontar();
  }
});

test("el informe avisa si el reintento no responde", async () => {
  const anterior = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (init?.method === "POST") return json({ aviso: "no" }, 500);
    if (url === "/api/tareas") return json({ tareas: [{ id: "stand" }] });
    if (url === "/api/proyectos") return json({ proyecto: { nombre: "ZEEK" } });
    if (url.startsWith("/api/revision/")) {
      return json({
        tarea: tarea({ origen: "error", codigo: "tiempo", veredicto: null, frase: "The AI did not respond in time" }),
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
    await pulsar("Retry review");
    await act(async () => {
      await new Promise((resolver) => setTimeout(resolver, 30));
    });
    assert.match(texto(), /The review could not be retried/);
  } finally {
    globalThis.fetch = anterior;
    await desmontar();
  }
});

test("after deploy succeeds and fund fails, the screen offers Fund and retries that contract", async () => {
  const contrato = "CSTAND";
  const firmas: { url: string; body: Record<string, unknown> }[] = [];
  let desplegado = false;
  let fondos = 0;
  let lecturas = 0;
  const anterior = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    const body = typeof init?.body === "string" ? (JSON.parse(init.body) as Record<string, unknown>) : null;
    if (method === "POST" && body) firmas.push({ url, body });
    if (url === "/api/usdc") return json({ listo: true });
    if (url.startsWith("/api/escrow/")) return json({ escrow: { balance: fondos > 1 ? 20 : 0 } });
    if (method === "POST" && url === "/api/firma") {
      if (body?.accion === "desplegar") return json({ xdr: "DEPLOY", contrato, monto: 20 });
      if (body?.accion === "fondear") return json({ xdr: "FUND", contrato });
      return json({ aviso: "unexpected" }, 400);
    }
    if (method === "POST" && url === "/api/firma/enviar") {
      if (body?.accion === "desplegar") {
        desplegado = true;
        return json({ hash: "ab".repeat(32), contrato, estado: "SUCCESS" });
      }
      if (body?.accion === "fondear") {
        fondos += 1;
        if (fondos === 1) return json({ aviso: "Could not submit the payment." }, 502);
        return json({ hash: "cd".repeat(32), contrato, estado: "SUCCESS" });
      }
    }
    const contratoEscrow = desplegado ? contrato : null;
    if (url === "/api/tareas") return json({ tareas: [{ id: "stand", hashPago: null, contratoEscrow }] });
    if (url.startsWith("/api/revision/")) {
      lecturas += 1;
      return json({
        tarea: tarea({}),
        foto: null,
        contratoEscrow,
        wallet: "GORGANIZADOR",
      });
    }
    return json({ aviso: "no" }, 404);
  }) as typeof fetch;

  try {
    await montar(createElement(Revision, { tareaId: "stand", firmar: async () => "SIGNED" }));
    await esperar(() => rotulo("Deploy and fund"));
    const lecturasAntes = lecturas;
    await pulsar("Deploy and fund");
    await esperar(() => rotulo("Fund") && !rotulo("Deploy and fund") && texto().includes("Could not submit the payment."));
    assert.ok(lecturas > lecturasAntes);
    const despliegues = () => firmas.filter((item) => item.body.accion === "desplegar").length;
    const antes = despliegues();
    await pulsar("Fund");
    await esperar(() => firmas.filter((item) => item.url === "/api/firma/enviar" && item.body.accion === "fondear").length === 2);
    const reintento = firmas.filter((item) => item.url === "/api/firma" && item.body.accion === "fondear").at(-1);
    assert.equal(reintento?.body.contrato, contrato);
    assert.equal(reintento?.body.tareaId, "stand");
    assert.equal(despliegues(), antes);
    assert.equal(antes, 2);
  } finally {
    globalThis.fetch = anterior;
    await desmontar();
  }
});

function rotulo(textoBoton: string): boolean {
  return [...document.querySelectorAll("button")].some((item) => item.textContent?.trim() === textoBoton);
}

async function esperar(listo: () => boolean): Promise<void> {
  for (let i = 0; i < 25; i += 1) {
    if (listo()) return;
    await act(async () => {
      await new Promise((resolver) => setTimeout(resolver, 20));
    });
  }
  throw new Error(`Timed out. Screen: ${texto()}`);
}

function tarea(parcial: Record<string, unknown>) {
  return {
    id: "stand",
    titulo: "Set up the booth",
    tipo: "trabajo",
    monto: "20",
    tope: null,
    condicion: "Banner visible",
    miembroId: "voluntario-1",
    miembro: "Volunteer 1",
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
