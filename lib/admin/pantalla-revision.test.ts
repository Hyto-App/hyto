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
    assert.match(texto(), /64% · Partially completed/);
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
    assert.match(texto(), /100% · Completed/);
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
    assert.match(texto(), /Budget not locked/);
    assert.equal(texto().includes("Payment failed"), false);
    assert.equal(texto().includes("No USDC left the escrow."), false);
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

test("after a confirmed fund, a zero indexed balance shows a wait state instead of Finish locking", async () => {
  const hashFondeo = "ef".repeat(32);
  let lecturasSaldo = 0;
  const firmas: string[] = [];
  const anterior = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if ((init?.method ?? "GET") === "POST") firmas.push(url);
    if (url.startsWith("/api/escrow/")) {
      lecturasSaldo += 1;
      return json({ escrow: { balance: lecturasSaldo > 1 ? 20 : 0 } });
    }
    if (url === "/api/tareas") return json({ tareas: [{ id: "stand", hashPago: null, contratoEscrow: "CSTAND" }] });
    if (url.startsWith("/api/revision/")) {
      return json({ tarea: tarea({}), foto: null, contratoEscrow: "CSTAND", hashFondeo, wallet: "GORGANIZADOR" });
    }
    return json({ aviso: "no" }, 404);
  }) as typeof fetch;

  try {
    await montar(createElement(Revision, { tareaId: "stand", firmar: async () => "SIGNED" }));
    await esperar(() => texto().includes("The budget is locked. Waiting for Trustless Work to show the balance."));
    assert.equal(rotulo("Finish locking"), false);
    assert.equal(rotulo("Lock budget"), false);
    assert.equal(rotulo("Approve and pay"), false);
    const enlace = [...document.querySelectorAll("a")].find((item) => item.textContent === "View on blockchain");
    assert.equal(enlace?.getAttribute("href"), `https://stellar.expert/explorer/testnet/tx/${hashFondeo}`);
    for (let i = 0; i < 60 && !rotulo("Approve and pay"); i += 1) {
      await act(async () => {
        await new Promise((resolver) => setTimeout(resolver, 100));
      });
    }
    assert.equal(rotulo("Approve and pay"), true);
    assert.equal(rotulo("Finish locking"), false);
    assert.equal(texto().includes("Waiting for Trustless Work"), false);
    assert.equal(lecturasSaldo, 2);
    assert.deepEqual(firmas, []);
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

test("lock budget shows the payout error and does not claim USDC left an escrow", async () => {
  const aviso = "The volunteer's payout account isn't ready yet. Ask them to open the task in Hyto and tap Get ready to be paid.";
  const anterior = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    if (method === "POST" && url === "/api/firma") return json({ aviso, codigo: "receptor_no_listo" }, 409);
    if (url === "/api/tareas") return json({ tareas: [{ id: "stand", hashPago: null, contratoEscrow: null }] });
    if (url.startsWith("/api/revision/")) {
      return json({ tarea: tarea({}), foto: null, contratoEscrow: null, wallet: "GORGANIZADOR" });
    }
    return json({ aviso: "no" }, 404);
  }) as typeof fetch;
  try {
    await montar(createElement(Revision, { tareaId: "stand", firmar: async () => "SIGNED" }));
    await esperar(() => rotulo("Lock budget"));
    await pulsar("Lock budget");
    await esperar(() => texto().includes("Budget not locked"));
    assert.match(texto(), new RegExp(aviso.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.equal(texto().includes("Payment failed"), false);
    assert.equal(texto().includes("No USDC left the escrow."), false);
  } finally {
    globalThis.fetch = anterior;
    await desmontar();
  }
});

test("pay still says the payment failed when release does not go through", async () => {
  const contrato = "CSTAND";
  const anterior = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    if (url.startsWith("/api/escrow/")) return json({ escrow: { balance: 20 } });
    if (method === "POST" && url === "/api/firma") {
      return json({ aviso: "The milestone isn't ready. Try again.", codigo: "ESCROW_NOT_READY" }, 409);
    }
    if (url === "/api/tareas") return json({ tareas: [{ id: "stand", hashPago: null, contratoEscrow: contrato }] });
    if (url.startsWith("/api/revision/")) {
      return json({ tarea: tarea({}), foto: null, contratoEscrow: contrato, wallet: "GORGANIZADOR" });
    }
    return json({ aviso: "no" }, 404);
  }) as typeof fetch;
  try {
    await montar(createElement(Revision, { tareaId: "stand", firmar: async () => "SIGNED" }));
    await esperar(() => rotulo("Approve and pay"));
    await pulsar("Approve and pay");
    await esperar(() => texto().includes("Payment failed"));
    assert.match(texto(), /No USDC left the escrow/);
    assert.match(texto(), /The milestone isn't ready/);
    assert.equal(texto().includes("Budget not locked"), false);
  } finally {
    globalThis.fetch = anterior;
    await desmontar();
  }
});

test("an error outside lock or pay does not use the payment box", async () => {
  const anterior = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    if (method === "POST" && url.endsWith("/pedir")) {
      return json({ aviso: "The photo isn't ready. Try again." }, 409);
    }
    if (url === "/api/tareas") return json({ tareas: [{ id: "stand", hashPago: null, contratoEscrow: null }] });
    if (url.startsWith("/api/revision/")) {
      return json({ tarea: tarea({}), foto: null, contratoEscrow: null, wallet: "GORGANIZADOR" });
    }
    return json({ aviso: "no" }, 404);
  }) as typeof fetch;
  try {
    await montar(createElement(Revision, { tareaId: "stand" }));
    await esperar(() => rotulo("Ask for another photo"));
    await pulsar("Ask for another photo");
    await esperar(() => texto().includes("The photo isn't ready. Try again."));
    assert.equal(texto().includes("Payment failed"), false);
    assert.equal(texto().includes("Budget not locked"), false);
    assert.equal(texto().includes("No USDC left the escrow."), false);
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
