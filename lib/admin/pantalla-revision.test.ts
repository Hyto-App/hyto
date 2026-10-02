import "../../tests/integracion/dom-global";
import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { act } from "react";
import { Informe } from "@/components/admin/Informe";
import { Revision } from "@/components/admin/Revision";
import { ProveedorModoDemo } from "@/components/sesion/InsigniaDemo";
import { desmontar, escribir, montar, pulsar, texto } from "../../tests/integracion/montar";

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
        tarea: tarea({ origen: "scout", codigo: null, veredicto: "parcial", nota: 64, frase: "Banner de ZEEK de frente." }),
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
    assert.match(texto(), /Review failed/);
    assert.match(texto(), /Mile is unavailable/);
    assert.equal(
      [...document.querySelectorAll("button")].some((boton) => boton.textContent === "Lock budget"),
      true,
    );
    assert.equal(texto().includes("Mesa armada, banner de ZEEK de frente, tres cajas"), false);
    await pulsar("Retry review");
    await act(async () => {
      await new Promise((resolver) => setTimeout(resolver, 30));
    });
    assert.equal(
      llamadas.some((llamada) => llamada.method === "POST" && llamada.url === "/api/revision/stand"),
      true,
    );
    assert.match(texto(), /AI recommendation/);
    assert.equal(document.querySelector("[role=alert]"), null);
    assert.match(texto(), /Banner de ZEEK de frente/);
    assert.match(texto(), /64%/);
    assert.match(texto(), /Partial/);
  } finally {
    globalThis.fetch = anterior;
    await desmontar();
  }
});

test("el demo carga la revisión remota y marca el guion como muestra", async () => {
  const anterior = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url === "/api/tareas") return json({ tareas: [{ id: "stand", hashPago: null, contratoEscrow: null }] });
    return json({
      tarea: tarea({ origen: "guion", codigo: null, veredicto: "cumplió", nota: 100, frase: "Table set up, ZEEK banner facing forward." }),
      foto: null,
      contratoEscrow: null,
      wallet: "GORGANIZADOR",
    });
  }) as typeof fetch;
  try {
    await montar(createElement(ProveedorModoDemo, { activo: true, children: createElement(Revision, { tareaId: "stand" }) }));
    await act(async () => {
      await new Promise((resolver) => setTimeout(resolver, 30));
    });
    assert.match(texto(), /Sample recommendation/);
    assert.match(texto(), /100%/);
    assert.match(texto(), /Met/);
    assert.match(texto(), /Table set up, ZEEK banner facing forward/);
    assert.equal(texto().includes("Retry review"), false);
  } finally {
    globalThis.fetch = anterior;
    await desmontar();
  }
});

test("el informe muestra el origen y el error", async () => {
  const anterior = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (init?.method === "POST") {
      return json({
        tarea: tarea({ origen: "scout", codigo: null, veredicto: "parcial", nota: 64, frase: "Listo de verdad." }),
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
    assert.match(texto(), /Review failed/);
    await pulsar("Retry review");
    await act(async () => {
      await new Promise((resolver) => setTimeout(resolver, 30));
    });
    assert.match(texto(), /AI recommendation/);
    assert.match(texto(), /Listo de verdad/);
    assert.match(texto(), /64%/);
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
      if (body?.accion === "desplegar") return json({ xdr: "DEPLOY", contrato, monto: 20, token: "tok" });
      if (body?.accion === "fondear") return json({ xdr: "FUND", contrato, token: "tok" });
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
    await esperar(() => rotulo("Lock budget"));
    const lecturasAntes = lecturas;
    await pulsar("Lock budget");
    await esperar(() => rotulo("Finish locking") && !rotulo("Lock budget") && texto().includes("That step didn't go through."));
    assert.ok(lecturas > lecturasAntes);
    const despliegues = () => firmas.filter((item) => item.body.accion === "desplegar").length;
    const antes = despliegues();
    await pulsar("Finish locking");
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

test("un reembolso pide confirmar el monto antes de desplegar", async () => {
  const llamadas: { url: string; method: string; body: string | null }[] = [];
  const anterior = globalThis.fetch;
  const comida = {
    id: "comida",
    titulo: "Team meal",
    tipo: "reembolso",
    monto: "15",
    tope: "15",
    condicion: "Photo of the meal receipt",
    miembroId: "voluntario-1",
    miembro: "Volunteer 1",
    estado: "en revisión",
    veredicto: "cumplió",
    frase: "Receipt visible.",
    origen: "scout",
    codigo: null,
    montoRevisado: "20",
    montoConfirmado: null,
    fecha: "2026-09-27",
    hashPago: null,
    credencialUrl: null,
  };
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    llamadas.push({ url, method, body: typeof init?.body === "string" ? init.body : null });
    if (method === "POST" && url === "/api/revision/comida/monto") return json({ montoConfirmado: "12.40" });
    if (url === "/api/tareas") return json({ tareas: [{ id: "comida", hashPago: null, contratoEscrow: null }] });
    return json({ tarea: comida, foto: null, contratoEscrow: null, wallet: "GORGANIZADOR" });
  }) as typeof fetch;

  try {
    await montar(createElement(Revision, { tareaId: "comida" }));
    await act(async () => {
      await new Promise((resolver) => setTimeout(resolver, 30));
    });
    assert.match(texto(), /Amount on the receipt/);
    assert.match(texto(), /Amount to pay/);
    const bloqueado = [...document.querySelectorAll("button")].find((boton) => boton.textContent?.includes("Lock budget"));
    assert.ok(bloqueado instanceof HTMLButtonElement);
    assert.equal(bloqueado.disabled, true);
    await escribir("#monto-confirmado", "12.40");
    await pulsar("Confirm amount");
    await act(async () => {
      await new Promise((resolver) => setTimeout(resolver, 30));
    });
    const post = llamadas.find((llamada) => llamada.method === "POST" && llamada.url === "/api/revision/comida/monto");
    assert.equal(post?.body, JSON.stringify({ monto: "12.40" }));
    const listo = [...document.querySelectorAll("button")].find((boton) => boton.textContent?.includes("Lock budget"));
    assert.ok(listo instanceof HTMLButtonElement);
    assert.equal(listo.disabled, false);
    assert.equal(document.querySelector("#monto-confirmado"), null);
    assert.match(texto(), /Amount to pay/);
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
    nota: null,
    frase: "Listo",
    origen: "guion",
    codigo: null,
    montoRevisado: null,
    montoConfirmado: null,
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
