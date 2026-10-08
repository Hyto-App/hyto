import "../../tests/integracion/dom-global";
import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { act } from "react";
import { Informe } from "@/components/admin/Informe";
import { Revision } from "@/components/admin/Revision";
import { ProveedorModoDemo } from "@/components/sesion/InsigniaDemo";
import { ProveedorIdioma } from "@/components/ui/Idioma";
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
    await confirmarDialogo();
    await esperar(() => rotulo("Finish locking") && !rotulo("Lock budget") && texto().includes("That step did not finish."));
    assert.match(texto(), /Budget not locked/);
    assert.equal(texto().includes("Payment failed"), false);
    assert.equal(texto().includes("No USDC left the escrow."), false);
    assert.ok(lecturas > lecturasAntes);
    const despliegues = () => firmas.filter((item) => item.body.accion === "desplegar").length;
    const antes = despliegues();
    await pulsar("Finish locking");
    await confirmarDialogo();
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
    assert.match(texto(), /Limit US\$15\. Confirm this amount before locking the budget\./);
    assert.equal(texto().includes("deploy"), false);
    const bloqueado = [...document.querySelectorAll("button")].find((boton) => boton.textContent?.includes("Lock budget"));
    assert.ok(bloqueado instanceof HTMLButtonElement);
    assert.equal(bloqueado.disabled, true);
    assert.match(texto(), /Confirm the amount before Lock budget can be used/);
    assert.equal(bloqueado.getAttribute("aria-describedby"), "bloqueo-monto");
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
    assert.equal(listo.getAttribute("aria-describedby"), null);
    assert.equal(/Confirm the amount before Lock budget can be used/.test(texto()), false);
    assert.equal(document.querySelector("#monto-confirmado"), null);
    assert.match(texto(), /Amount to pay/);
    assert.match(texto(), /US\$12\.40/);
    assert.match(texto(), /Limit US\$15/);
  } finally {
    globalThis.fetch = anterior;
    await desmontar();
  }
});

test("sin cuenta para firmar, Lock budget no dice que el ingreso venció y no llama a la firma", async () => {
  const anterior = globalThis.fetch;
  const llamadas: string[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    llamadas.push(`${method} ${url}`);
    if (url === "/api/tareas") return json({ tareas: [{ id: "stand", hashPago: null, contratoEscrow: null }] });
    if (url.startsWith("/api/revision/")) {
      return json({ tarea: tarea({}), foto: null, contratoEscrow: null, wallet: null });
    }
    return json({ aviso: "no" }, 404);
  }) as typeof fetch;
  try {
    await montar(createElement(Revision, { tareaId: "stand" }));
    await esperar(() => rotulo("Lock budget"));
    await pulsar("Lock budget");
    await confirmarDialogo();
    await esperar(() => texto().includes("no account to sign with"));
    assert.match(texto(), /Sign in again on this site/);
    assert.equal(texto().includes("Your sign-in expired"), false);
    assert.equal(llamadas.some((llamada) => llamada.startsWith("POST /api/firma")), false);
    const enlace = document.querySelector("[role='alert'] a");
    assert.equal(enlace?.textContent, "Sign in again");
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
    await confirmarDialogo();
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
    await confirmarDialogo();
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
    await confirmarPedir();
    await esperar(() => texto().includes("The photo isn't ready. Try again."));
    assert.equal(texto().includes("The request was sent"), false);
    assert.equal(texto().includes("Payment failed"), false);
    assert.equal(texto().includes("Budget not locked"), false);
    assert.equal(texto().includes("No USDC left the escrow."), false);
  } finally {
    globalThis.fetch = anterior;
    await desmontar();
  }
});

test("antes de apartar el dinero, Avanzado dice que la referencia todavía no está", async () => {
  const anterior = globalThis.fetch;
  const cargar = (contrato: string | null) => {
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/tareas") return json({ tareas: [{ id: "stand", hashPago: null, contratoEscrow: contrato }] });
      if (url.includes("/api/escrow/")) return json({ escrow: { balance: 0 } });
      return json({ tarea: tarea({}), foto: null, contratoEscrow: contrato, wallet: "GORGANIZADOR" });
    }) as typeof fetch;
  };
  try {
    cargar(null);
    await montar(createElement(Revision, { tareaId: "stand" }));
    await esperar(() => texto().includes("Advanced"));
    const cerrado = document.querySelector("details");
    assert.equal(cerrado?.hasAttribute("open"), false);
    assert.match(cerrado?.textContent ?? "", /Payment account ID/);
    assert.match(cerrado?.textContent ?? "", /The payment reference appears when you set the money aside/);
    assert.equal((cerrado?.textContent ?? "").includes("Task payment reference"), false);

    await desmontar();
    cargar("CSTAND");
    await montar(createElement(Revision, { tareaId: "stand" }));
    await esperar(() => texto().includes("Task payment reference"));
    const abierto = document.querySelector("details");
    assert.match(abierto?.textContent ?? "", /Task payment reference/);
    assert.equal((abierto?.textContent ?? "").includes("appears when you set the money aside"), false);
  } finally {
    globalThis.fetch = anterior;
    await desmontar();
  }
});

test("a live review without a photo URL says No photo yet, not Sample evidence", async () => {
  const anterior = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url === "/api/tareas") return json({ tareas: [{ id: "stand", hashPago: null, contratoEscrow: null }] });
    return json({
      tarea: tarea({ origen: "scout", veredicto: "parcial", nota: 64, frase: "Half of the booth is set up." }),
      foto: null,
      contratoEscrow: null,
      wallet: "GORGANIZADOR",
    });
  }) as typeof fetch;
  try {
    await montar(createElement(Revision, { tareaId: "stand" }));
    await esperar(() => texto().includes("No photo yet"));
    assert.equal(texto().includes("Sample evidence"), false);
  } finally {
    globalThis.fetch = anterior;
    await desmontar();
  }
});

test("asking for another photo removes the old verdict pill", async () => {
  const anterior = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    if (method === "POST" && url.endsWith("/pedir")) return json({ estado: "pendiente" });
    if (url === "/api/tareas") return json({ tareas: [{ id: "stand", hashPago: null, contratoEscrow: null }] });
    return json({
      tarea: tarea({ origen: "scout", veredicto: "parcial", nota: 64, frase: "Half of the booth is set up." }),
      foto: "/api/evidencias/1/foto",
      contratoEscrow: null,
      wallet: "GORGANIZADOR",
    });
  }) as typeof fetch;
  try {
    await montar(createElement(Revision, { tareaId: "stand" }));
    await esperar(() => texto().includes("64% · Partially completed"));
    await confirmarPedir();
    await esperar(() => !texto().includes("Partially completed"));
    assert.equal(texto().includes("AI recommendation"), false);
    assert.equal(texto().includes("Half of the booth is set up."), false);
    assert.match(texto(), /Pending/);
    const aviso = [...document.querySelectorAll("[role=status]")].find((nodo) => nodo.classList.contains("hyto-pedir-listo"));
    assert.equal(
      aviso?.textContent,
      "Asked for another photo. The request was sent, and this task stays pending until a new photo arrives.",
    );
    assert.equal(aviso?.id, "bloqueo-foto");
    assert.equal(texto().includes("Waiting for a new photo"), false);
  } finally {
    globalThis.fetch = anterior;
    await desmontar();
  }
});

test("pedir otra foto deja el monto del recibo con colones y la conversión", async () => {
  const anterior = globalThis.fetch;
  const lectura = { moneda: "CRC", montoOriginal: "₡6.900,00", tasa: 505, fechaImpresa: null, comercio: "Soda La Esquina" };
  const comida = tarea({
    id: "comida",
    titulo: "Team meal",
    tipo: "reembolso",
    monto: "15",
    tope: "15",
    condicion: "Photo of the meal receipt",
    origen: "scout",
    veredicto: "parcial",
    nota: 78,
    frase: "A receipt from Soda La Esquina.",
    montoRevisado: "13.66",
    fecha: null,
    lectura,
  });
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    if (method === "POST" && url.endsWith("/pedir")) return json({ estado: "pendiente" });
    if (url === "/api/tareas") return json({ tareas: [{ id: "comida", hashPago: null, contratoEscrow: null }] });
    return json({ tarea: comida, foto: null, contratoEscrow: null, wallet: "GORGANIZADOR" });
  }) as typeof fetch;
  try {
    await montar(createElement(Revision, { tareaId: "comida" }));
    await esperar(() => texto().includes("Printed ₡6.900,00, converted at 505 CRC per US dollar."));
    assert.match(texto(), /78% · Partially completed/);
    assert.match(texto(), /AI recommendation/);
    await confirmarPedir();
    await esperar(() => texto().includes("The request was sent"));
    const aviso = document.querySelector(".hyto-pedir-listo");
    assert.equal(aviso?.textContent, "Asked for another photo. The request was sent, and this task stays pending until a new photo arrives.");
    assert.equal(texto().includes("Waiting for a new photo"), false);
    const monto = document.querySelector("dd.hyto-amount");
    assert.equal(monto?.textContent, "₡6.900,00");
    assert.match(texto(), /Amount on the receipt/);
    assert.match(texto(), /Printed ₡6\.900,00, converted at 505 CRC per US dollar\./);
    assert.equal(texto().includes("78% · Partially completed"), false);
  } finally {
    globalThis.fetch = anterior;
    await desmontar();
  }
});

test("al recargar, el monto del recibo sigue en colones después de pedir otra foto", async () => {
  const anterior = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url === "/api/tareas") return json({ tareas: [{ id: "comida", hashPago: null, contratoEscrow: null }] });
    return json({
      tarea: tarea({
        id: "comida",
        titulo: "Team meal",
        tipo: "reembolso",
        monto: "15",
        tope: "15",
        estado: "pendiente",
        origen: null,
        veredicto: null,
        nota: null,
        frase: null,
        montoRevisado: "13.66",
        lectura: { moneda: "CRC", montoOriginal: "₡6.900,00", tasa: 505, fechaImpresa: null, comercio: "Soda La Esquina" },
      }),
      foto: "/api/evidencias/1/foto",
      contratoEscrow: null,
      wallet: "GORGANIZADOR",
    });
  }) as typeof fetch;
  try {
    await montar(createElement(ProveedorIdioma, { idioma: "es", children: createElement(Revision, { tareaId: "comida" }) }));
    await esperar(() => texto().includes("Monto en el comprobante"));
    const monto = document.querySelector("dd.hyto-amount");
    assert.equal(monto?.textContent, "₡6.900,00");
    assert.match(texto(), /Impreso ₡6\.900,00, convertido a 505 CRC por dólar\./);
    assert.equal(texto().includes("US$13.66"), false);
  } finally {
    globalThis.fetch = anterior;
    await desmontar();
  }
});

test("pedir otra foto confirma el envío en español", async () => {
  const anterior = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    if (method === "POST" && url.endsWith("/pedir")) return json({ estado: "pendiente" });
    if (url === "/api/tareas") return json({ tareas: [{ id: "stand", hashPago: null, contratoEscrow: null }] });
    return json({
      tarea: tarea({ origen: "scout", veredicto: "parcial", nota: 64, frase: "Half of the booth is set up." }),
      foto: null,
      contratoEscrow: null,
      wallet: "GORGANIZADOR",
    });
  }) as typeof fetch;
  try {
    await montar(createElement(ProveedorIdioma, { idioma: "es", children: createElement(Revision, { tareaId: "stand" }) }));
    await esperar(() => rotulo("Pedir otra foto"));
    await pulsar("Pedir otra foto");
    await esperar(() => texto().includes("¿Qué falta?"));
    const enviar = document.querySelector(".hyto-pedir button[type='submit']");
    if (!enviar) throw new Error("No send-back confirm.");
    await act(async () => {
      enviar.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await esperar(() => texto().includes("Pendiente"));
    const aviso = document.querySelector(".hyto-pedir-listo");
    assert.equal(aviso?.getAttribute("role"), "status");
    assert.equal(aviso?.textContent, "Pediste otra foto. La solicitud se envió y esta tarea queda pendiente hasta que llegue una nueva.");
    assert.equal(aviso?.id, "bloqueo-foto");
    assert.equal(texto().includes("Esperando una foto nueva"), false);
  } finally {
    globalThis.fetch = anterior;
    await desmontar();
  }
});

test("pedir otra foto sin red muestra el error y no cambia la tarea", async () => {
  const anterior = globalThis.fetch;
  const rechazos: unknown[] = [];
  const oir = (razon: unknown) => {
    rechazos.push(razon);
  };
  process.on("unhandledRejection", oir);
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    if (method === "POST" && url.endsWith("/pedir")) throw new TypeError("Failed to fetch");
    if (url === "/api/tareas") return json({ tareas: [{ id: "stand", hashPago: null, contratoEscrow: null }] });
    return json({
      tarea: tarea({ origen: "scout", veredicto: "parcial", nota: 64, frase: "Half of the booth is set up." }),
      foto: "/api/evidencias/1/foto",
      contratoEscrow: null,
      wallet: "GORGANIZADOR",
    });
  }) as typeof fetch;
  try {
    await montar(createElement(Revision, { tareaId: "stand" }));
    await esperar(() => texto().includes("64% · Partially completed"));
    await confirmarPedir();
    await esperar(() => texto().includes("Could not send. Check your connection and try again."));
    assert.equal(document.querySelector("[role=alert]")?.textContent, "Could not send. Check your connection and try again.");
    assert.match(texto(), /64% · Partially completed/);
    assert.match(texto(), /Half of the booth is set up/);
    assert.equal(texto().includes("Asked for another photo. The request was sent"), false);
    assert.equal(texto().includes("What's missing?"), true);
    assert.equal(rotulo("Lock budget") && [...document.querySelectorAll("button")].some((boton) => boton.textContent === "Lock budget" && !(boton as HTMLButtonElement).disabled), true);
    await act(async () => {
      await new Promise((resolver) => setTimeout(resolver, 30));
    });
    assert.deepEqual(rechazos, []);
  } finally {
    process.off("unhandledRejection", oir);
    globalThis.fetch = anterior;
    await desmontar();
  }
});

test("pedir otra foto sin red avisa en español y deja la tarea en revisión", async () => {
  const anterior = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    if (method === "POST" && url.endsWith("/pedir")) throw new TypeError("Failed to fetch");
    if (url === "/api/tareas") return json({ tareas: [{ id: "stand", hashPago: null, contratoEscrow: null }] });
    return json({
      tarea: tarea({ origen: "scout", veredicto: "parcial", nota: 64, frase: "La mitad del puesto está lista." }),
      foto: "/api/evidencias/1/foto",
      contratoEscrow: null,
      wallet: "GORGANIZADOR",
    });
  }) as typeof fetch;
  try {
    await montar(createElement(ProveedorIdioma, { idioma: "es", children: createElement(Revision, { tareaId: "stand" }) }));
    await esperar(() => rotulo("Pedir otra foto"));
    await pulsar("Pedir otra foto");
    await esperar(() => texto().includes("¿Qué falta?"));
    const enviar = document.querySelector(".hyto-pedir button[type='submit']");
    if (!enviar) throw new Error("No send-back confirm.");
    await act(async () => {
      enviar.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await esperar(() => texto().includes("No se pudo enviar. Revise su conexión e intente de nuevo."));
    assert.equal(document.querySelector("[role=alert]")?.textContent, "No se pudo enviar. Revise su conexión e intente de nuevo.");
    assert.match(texto(), /64% · Parcialmente completado/);
    assert.equal(texto().includes("Pediste otra foto"), false);
    assert.equal(texto().includes("Pendiente"), false);
  } finally {
    globalThis.fetch = anterior;
    await desmontar();
  }
});

test("lock budget stays off while a pending task waits for another photo", async () => {
  const anterior = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url === "/api/tareas") return json({ tareas: [{ id: "stand", hashPago: null, contratoEscrow: null }] });
    return json({
      tarea: tarea({
        estado: "pendiente",
        veredicto: null,
        nota: null,
        frase: null,
        origen: null,
        intentosAnteriores: [{ numero: 1, veredicto: "parcial", nota: 64, frase: "The first photo was incomplete." }],
      }),
      foto: "/api/evidencias/1/foto",
      contratoEscrow: null,
      wallet: "GORGANIZADOR",
    });
  }) as typeof fetch;
  try {
    await montar(createElement(Revision, { tareaId: "stand" }));
    await esperar(() => rotulo("Lock budget"));
    const bloqueo = [...document.querySelectorAll("button")].find((boton) => boton.textContent === "Lock budget");
    assert.ok(bloqueo instanceof HTMLButtonElement);
    assert.equal(bloqueo.disabled, true);
    assert.equal(bloqueo.getAttribute("aria-describedby"), "bloqueo-foto");
    assert.match(texto(), /Waiting for a new photo\. This stays off until it arrives\./);
    assert.match(texto(), /Pending/);
    await pulsar("Lock budget");
    assert.equal(document.querySelector("dialog"), null);
  } finally {
    globalThis.fetch = anterior;
    await desmontar();
  }
});

test("bloquear presupuesto queda apagado en español mientras espera la foto nueva", async () => {
  const anterior = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url === "/api/tareas") return json({ tareas: [{ id: "stand", hashPago: null, contratoEscrow: null }] });
    return json({
      tarea: tarea({ estado: "pendiente", veredicto: null, nota: null, frase: null, origen: null }),
      foto: "/api/evidencias/1/foto",
      contratoEscrow: null,
      wallet: "GORGANIZADOR",
    });
  }) as typeof fetch;
  try {
    await montar(createElement(ProveedorIdioma, { idioma: "es", children: createElement(Revision, { tareaId: "stand" }) }));
    await esperar(() => rotulo("Bloquear presupuesto"));
    const bloqueo = [...document.querySelectorAll("button")].find((boton) => boton.textContent === "Bloquear presupuesto");
    assert.ok(bloqueo instanceof HTMLButtonElement);
    assert.equal(bloqueo.disabled, true);
    assert.match(texto(), /Esperando una foto nueva\. Esto queda apagado hasta que llegue\./);
  } finally {
    globalThis.fetch = anterior;
    await desmontar();
  }
});

test("a pending task with no photo still offers lock budget", async () => {
  const anterior = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url === "/api/tareas") return json({ tareas: [{ id: "stand", hashPago: null, contratoEscrow: null }] });
    return json({
      tarea: tarea({ estado: "pendiente", veredicto: null, nota: null, frase: null, origen: null }),
      foto: null,
      contratoEscrow: null,
      wallet: "GORGANIZADOR",
    });
  }) as typeof fetch;
  try {
    await montar(createElement(Revision, { tareaId: "stand" }));
    await esperar(() => rotulo("Lock budget"));
    const bloqueo = [...document.querySelectorAll("button")].find((boton) => boton.textContent === "Lock budget");
    assert.ok(bloqueo instanceof HTMLButtonElement);
    assert.equal(bloqueo.disabled, false);
    assert.equal(texto().includes("Waiting for a new photo"), false);
  } finally {
    globalThis.fetch = anterior;
    await desmontar();
  }
});

test("the lock sentence and the dialog use the confirmed amount, not the cap", async () => {
  const anterior = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url === "/api/tareas") return json({ tareas: [{ id: "comida", hashPago: null, contratoEscrow: null }] });
    return json({
      tarea: tarea({
        id: "comida",
        titulo: "Team meal",
        tipo: "reembolso",
        monto: "0.25",
        tope: "0.25",
        estado: "en revisión",
        montoRevisado: "0.25",
        montoConfirmado: "0.22",
      }),
      foto: null,
      contratoEscrow: null,
      wallet: "GORGANIZADOR",
    });
  }) as typeof fetch;
  try {
    await montar(createElement(Revision, { tareaId: "comida" }));
    await esperar(() => rotulo("Lock budget"));
    assert.match(texto(), /This sets aside US\$0\.22/);
    assert.equal(/This sets aside Up to/.test(texto()), false);
    await pulsar("Lock budget");
    assert.equal(document.querySelector(".hyto-dialogo-monto")?.textContent, "US$0.22");
  } finally {
    globalThis.fetch = anterior;
    await desmontar();
  }
});

test("en español la frase de apartar no lleva Hasta a media oración y Receipt se traduce", async () => {
  const anterior = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url === "/api/tareas") return json({ tareas: [{ id: "comida", hashPago: null, contratoEscrow: null }] });
    return json({
      tarea: tarea({
        id: "comida",
        titulo: "Comida",
        tipo: "reembolso",
        monto: "0.25",
        tope: "0.25",
        estado: "en revisión",
        veredicto: "parcial",
        nota: 79,
        montoRevisado: "0.25",
        montoConfirmado: "0.22",
        etiquetas: [
          {
            id: "date_missing",
            texto: "Receipt date missing",
            explicacion: "A date the stored pair does not know.",
            severidad: "warning",
            preguntas: [],
          },
        ],
      }),
      foto: null,
      contratoEscrow: null,
      wallet: "GORGANIZADOR",
    });
  }) as typeof fetch;
  try {
    await montar(createElement(ProveedorIdioma, { idioma: "es", children: createElement(Revision, { tareaId: "comida" }) }));
    await esperar(() => rotulo("Bloquear presupuesto"));
    assert.match(texto(), /Esto aparta US\$0,22/);
    assert.equal(/Esto aparta Hasta/.test(texto()), false);
    assert.equal(texto().includes("Receipt"), false);
    assert.match(texto(), /Falta la fecha del recibo/);
    await pulsar("Bloquear presupuesto");
    assert.equal(document.querySelector(".hyto-dialogo-monto")?.textContent, "US$0,22");
  } finally {
    globalThis.fetch = anterior;
    await desmontar();
  }
});

test("approve and pay shows US$2, the same amount as the rest of the screen", async () => {
  const contrato = "CSTAND";
  const anterior = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.startsWith("/api/escrow/")) return json({ escrow: { balance: "2" } });
    if (url === "/api/tareas") return json({ tareas: [{ id: "stand", hashPago: null, contratoEscrow: contrato }] });
    if (url.startsWith("/api/revision/")) {
      return json({ tarea: tarea({ monto: "2" }), foto: null, contratoEscrow: contrato, wallet: "GORGANIZADOR" });
    }
    return json({ aviso: "no" }, 404);
  }) as typeof fetch;
  try {
    await montar(createElement(Revision, { tareaId: "stand" }));
    await esperar(() => rotulo("Approve and pay"));
    assert.match(texto(), /US\$2/);
    await pulsar("Approve and pay");
    const monto = document.querySelector(".hyto-dialogo-monto");
    assert.equal(monto?.textContent, "US$2");
    assert.equal(monto?.querySelector("small"), null);
    assert.equal(document.querySelector("dialog .hyto-dialogo-acciones .hyto-btn")?.textContent, "Pay US$2");
    assert.equal(texto().includes("USDC"), false);
    assert.equal(texto().includes("2.00"), false);
  } finally {
    globalThis.fetch = anterior;
    await desmontar();
  }
});

/** "Ask for another photo" opens the sheet. The submit inside confirms the existing action. */
async function confirmarPedir(): Promise<void> {
  await pulsar("Ask for another photo");
  await esperar(() => texto().includes("What's missing?"));
  const enviar = document.querySelector(".hyto-pedir button[type='submit']");
  if (!enviar) throw new Error("No send-back confirm.");
  await act(async () => {
    enviar.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

/** The money buttons now open a ConfirmDialog first: confirm it. */
async function confirmarDialogo(): Promise<void> {
  const boton = document.querySelector("dialog .hyto-dialogo-acciones .hyto-btn");
  if (!boton) throw new Error("No confirm dialog.");
  await act(async () => {
    boton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

test("the review card shows the main reason next to the percentage and what the receipt printed", async () => {
  const anterior = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url === "/api/tareas") return json({ tareas: [{ id: "comida", hashPago: null, contratoEscrow: null }] });
    return json({
      tarea: tarea({
        id: "comida",
        titulo: "Team meal",
        tipo: "reembolso",
        monto: "15",
        tope: "15",
        condicion: "Photo of the meal receipt",
        origen: "scout",
        veredicto: "parcial",
        nota: 78,
        frase: "A receipt from Soda La Esquina.",
        montoRevisado: "13.66",
        fecha: null,
        etiquetas: [
          {
            id: "date_missing",
            texto: "Receipt date missing",
            explicacion: "The saved receipt has no date, so the grade cannot reach Completed.",
            severidad: "warning",
            preguntas: [],
          },
          { id: "matches", texto: "Matches the request", explicacion: "The answers say this expense is what was requested.", severidad: "good", preguntas: ["f1"] },
        ],
        lectura: { moneda: "CRC", montoOriginal: "₡6.900,00", tasa: 505, fechaImpresa: null, comercio: "Soda La Esquina" },
      }),
      foto: null,
      contratoEscrow: null,
      wallet: "GORGANIZADOR",
    });
  }) as typeof fetch;
  try {
    await montar(createElement(Revision, { tareaId: "comida" }));
    await esperar(() => texto().includes("78% · Partially completed"));
    const pill = document.querySelector('[aria-label="78% · Partially completed"]');
    const motivo = document.querySelector("[data-motivo]");
    assert.ok(pill instanceof HTMLElement);
    assert.ok(motivo instanceof HTMLElement);
    assert.equal(motivo.getAttribute("data-motivo"), "date_missing");
    assert.equal(motivo.textContent, "Receipt date missing");
    assert.equal(motivo.title, "The saved receipt has no date, so the grade cannot reach Completed.");
    assert.equal(motivo.parentElement, pill.closest("div"));
    assert.match(texto(), /Printed ₡6\.900,00, converted at 505 CRC per US dollar\./);
    assert.match(texto(), /Not shown/);
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

test("a receipt above the cap prefills the cap and shows the overage note", async () => {
  const anterior = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url === "/api/tareas") return json({ tareas: [{ id: "comida", hashPago: null, contratoEscrow: null }] });
    return json({
      tarea: tarea({
        id: "comida",
        titulo: "Team meal",
        tipo: "reembolso",
        monto: "15",
        tope: "15",
        origen: "scout",
        veredicto: "parcial",
        nota: 79,
        frase: "A receipt from Soda La Esquina.",
        montoRevisado: "15.74",
        montoConfirmado: null,
        lectura: { moneda: "CRC", montoOriginal: "₡7.950,00", tasa: 505, fechaImpresa: null, comercio: "Soda La Esquina" },
      }),
      foto: null,
      contratoEscrow: null,
      wallet: "GORGANIZADOR",
    });
  }) as typeof fetch;
  try {
    await montar(createElement(Revision, { tareaId: "comida" }));
    await esperar(() => Boolean(document.querySelector("#monto-confirmado")));
    const campo = document.querySelector("#monto-confirmado") as HTMLInputElement;
    assert.equal(campo.value, "15");
    assert.match(texto(), /above the US\$15 cap/);
    assert.match(texto(), /US\$15\.74/);
  } finally {
    globalThis.fetch = anterior;
    await desmontar();
  }
});

test("un escrow con fondos en la red no ofrece terminar de bloquear", async () => {
  const anterior = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.startsWith("/api/escrow/")) return json({ escrow: { balance: 0.22 } });
    if (url === "/api/tareas") return json({ tareas: [{ id: "stand", hashPago: null, contratoEscrow: "CSTAND" }] });
    if (url.startsWith("/api/revision/")) {
      return json({ tarea: tarea({ monto: "0.22" }), foto: null, contratoEscrow: "CSTAND", wallet: "GORGANIZADOR" });
    }
    return json({ aviso: "no" }, 404);
  }) as typeof fetch;
  try {
    await montar(createElement(Revision, { tareaId: "stand" }));
    await esperar(() => texto().includes("Budget secured"));
    assert.equal(rotulo("Finish locking"), false);
    assert.equal(rotulo("Lock budget"), false);
    assert.equal(rotulo("Approve and pay"), true);
  } finally {
    globalThis.fetch = anterior;
    await desmontar();
  }
});

test("si el fondeo ya está en la red, terminar de bloquear no pide otra firma", async () => {
  const anterior = globalThis.fetch;
  let firmas = 0;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    if (url.startsWith("/api/escrow/")) return json({ escrow: { balance: 0 } });
    if (method === "POST" && url === "/api/firma") {
      return json(
        {
          aviso: "This budget is already locked on the network. Refresh this page. Do not lock it again.",
          codigo: "ya_fondeado",
        },
        409,
      );
    }
    if (url === "/api/tareas") return json({ tareas: [{ id: "stand", hashPago: null, contratoEscrow: "CSTAND" }] });
    if (url.startsWith("/api/revision/")) {
      return json({ tarea: tarea({}), foto: null, contratoEscrow: "CSTAND", wallet: "GORGANIZADOR" });
    }
    return json({ aviso: "no" }, 404);
  }) as typeof fetch;
  try {
    await montar(
      createElement(Revision, {
        tareaId: "stand",
        firmar: async () => {
          firmas += 1;
          return "SIGNED";
        },
      }),
    );
    await esperar(() => rotulo("Finish locking"));
    await pulsar("Finish locking");
    await confirmarDialogo();
    await esperar(() => texto().includes("Budget secured") && rotulo("Approve and pay"));
    assert.equal(rotulo("Finish locking"), false);
    assert.equal(texto().includes("Budget not locked"), false);
    assert.equal(firmas, 0);
  } finally {
    globalThis.fetch = anterior;
    await desmontar();
  }
});

test("en demo, demo-comida muestra la revisión de ejemplo aunque la red no responda", async () => {
  const anterior = globalThis.fetch;
  globalThis.fetch = (() => new Promise(() => undefined)) as typeof fetch;
  try {
    await montar(
      createElement(ProveedorModoDemo, {
        activo: true,
        children: createElement(Revision, { tareaId: "demo-comida" }),
      }),
    );
    await esperar(() => texto().includes("Team meal"));
    assert.match(texto(), /90%/);
    assert.equal(texto().includes("Loading…"), false);
  } finally {
    globalThis.fetch = anterior;
    await desmontar();
  }
});

test("bloquear queda apagado cuando el saldo no alcanza y el aviso usa dos decimales", async () => {
  const anterior = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url === "/api/tareas") return json({ tareas: [{ id: "stand", hashPago: null, contratoEscrow: null }] });
    return json({
      tarea: tarea({ monto: "39.60", veredicto: "cumplió", origen: "scout", nota: 90, frase: "Booth ready." }),
      foto: null,
      contratoEscrow: null,
      wallet: "GORGANIZADOR",
    });
  }) as typeof fetch;
  try {
    await montar(createElement(Revision, { tareaId: "stand", saldo: "1.30" }));
    await esperar(() => rotulo("Lock budget"));
    const boton = [...document.querySelectorAll("button")].find((item) => item.textContent?.trim() === "Lock budget");
    assert.equal(boton instanceof HTMLButtonElement && boton.disabled, true);
    const aviso = document.querySelector("#bloqueo-saldo");
    assert.match(aviso?.textContent ?? "", /US\$40\.60/);
    assert.match(aviso?.textContent ?? "", /US\$1\.00 reserve/);
    assert.match(aviso?.textContent ?? "", /You are short US\$39\.30/);
    assert.equal(/US\$40\.6(?!0)/.test(aviso?.textContent ?? ""), false);
    assert.equal(document.querySelector("[role=dialog]"), null);
  } finally {
    globalThis.fetch = anterior;
    await desmontar();
  }
});

test("una tarea ya bloqueada sigue mostrando Ver en la cadena de testnet al recargar", async () => {
  const anterior = globalThis.fetch;
  const contrato = `C${"B".repeat(55)}`;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.startsWith("/api/escrow/")) return json({ escrow: { balance: 20 } });
    if (url === "/api/tareas") return json({ tareas: [{ id: "stand", hashPago: null, contratoEscrow: contrato }] });
    if (url.startsWith("/api/revision/")) {
      return json({ tarea: tarea({ monto: "20" }), foto: null, contratoEscrow: contrato, wallet: "GORGANIZADOR" });
    }
    return json({ aviso: "no" }, 404);
  }) as typeof fetch;
  try {
    await montar(createElement(Revision, { tareaId: "stand" }));
    await esperar(() => texto().includes("View on blockchain"));
    const enlace = [...document.querySelectorAll("a")].find((nodo) => nodo.textContent?.trim() === "View on blockchain");
    assert.equal(enlace?.getAttribute("href"), `https://stellar.expert/explorer/testnet/contract/${contrato}`);
    assert.equal(enlace?.getAttribute("href")?.includes("/public/"), false);
    assert.equal(enlace?.getAttribute("target"), "_blank");
    assert.equal(enlace?.getAttribute("rel"), "noopener noreferrer");
  } finally {
    globalThis.fetch = anterior;
    await desmontar();
  }
});

test("al recargar, el presupuesto se revisa solo y no pide recargar la página", async () => {
  const anterior = globalThis.fetch;
  const marca = globalThis as { __HYTO_PAUSAS_CONSULTA__?: number[] };
  marca.__HYTO_PAUSAS_CONSULTA__ = [1, 1, 1];
  const contrato = `C${"D".repeat(55)}`;
  let lecturas = 0;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.startsWith("/api/escrow/")) {
      lecturas += 1;
      return json({ escrow: {} });
    }
    if (url === "/api/tareas") return json({ tareas: [{ id: "stand", hashPago: null, contratoEscrow: contrato }] });
    if (url.startsWith("/api/revision/")) {
      return json({ tarea: tarea({ monto: "20" }), foto: null, contratoEscrow: contrato, wallet: "GORGANIZADOR" });
    }
    return json({ aviso: "no" }, 404);
  }) as typeof fetch;
  try {
    await montar(createElement(Revision, { tareaId: "stand" }));
    await esperar(() => texto().includes("Checking the locked budget"));
    assert.equal(/refresh|reload|recarga|actualiza/i.test(texto()), false);
    const enlace = [...document.querySelectorAll("a")].find((nodo) => nodo.textContent?.trim() === "View on blockchain");
    assert.equal(enlace?.getAttribute("target"), "_blank");
    assert.equal(enlace?.getAttribute("rel"), "noopener noreferrer");
    await esperar(() => texto().includes("still isn't confirmed"));
    assert.match(texto(), /You can try again when you want/);
    assert.equal(/refresh|reload/i.test(texto()), false);
    const antes = lecturas;
    await pulsar("Try again");
    await esperar(() => lecturas > antes);
    assert.ok(lecturas > antes);
  } finally {
    delete marca.__HYTO_PAUSAS_CONSULTA__;
    globalThis.fetch = anterior;
    await desmontar();
  }
});

test("en español el presupuesto sin confirmar ofrece intentarlo de nuevo", async () => {
  const anterior = globalThis.fetch;
  const marca = globalThis as { __HYTO_PAUSAS_CONSULTA__?: number[] };
  marca.__HYTO_PAUSAS_CONSULTA__ = [1, 1, 1];
  const contrato = `C${"E".repeat(55)}`;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.startsWith("/api/escrow/")) return json({ escrow: {} });
    if (url === "/api/tareas") return json({ tareas: [{ id: "stand", hashPago: null, contratoEscrow: contrato }] });
    if (url.startsWith("/api/revision/")) {
      return json({ tarea: tarea({ monto: "20" }), foto: null, contratoEscrow: contrato, wallet: "GORGANIZADOR" });
    }
    return json({ aviso: "no" }, 404);
  }) as typeof fetch;
  try {
    await montar(
      createElement(ProveedorIdioma, {
        idioma: "es",
        children: createElement(Revision, { tareaId: "stand" }),
      }),
    );
    await esperar(() => texto().includes("todavía no se confirma"));
    assert.match(texto(), /Esto sigue solo|todavía no se confirma/);
    assert.equal(/actualiza|recarga/i.test(texto()), false);
    assert.equal(
      [...document.querySelectorAll("button")].some((boton) => boton.textContent?.trim() === "Intentar de nuevo"),
      true,
    );
  } finally {
    delete marca.__HYTO_PAUSAS_CONSULTA__;
    globalThis.fetch = anterior;
    await desmontar();
  }
});

test("si la red confirma el presupuesto en un reintento, la pantalla se actualiza sola", async () => {
  const anterior = globalThis.fetch;
  const marca = globalThis as { __HYTO_PAUSAS_CONSULTA__?: number[] };
  marca.__HYTO_PAUSAS_CONSULTA__ = [1, 1, 1];
  const contrato = `C${"F".repeat(55)}`;
  let lecturas = 0;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.startsWith("/api/escrow/")) {
      lecturas += 1;
      return json({ escrow: { balance: lecturas >= 2 ? 20 : null } });
    }
    if (url === "/api/tareas") return json({ tareas: [{ id: "stand", hashPago: null, contratoEscrow: contrato }] });
    if (url.startsWith("/api/revision/")) {
      return json({ tarea: tarea({ monto: "20" }), foto: null, contratoEscrow: contrato, wallet: "GORGANIZADOR" });
    }
    return json({ aviso: "no" }, 404);
  }) as typeof fetch;
  try {
    await montar(createElement(Revision, { tareaId: "stand" }));
    await esperar(() => texto().includes("Budget secured"));
    assert.ok(lecturas >= 2);
    assert.equal(texto().includes("still isn't confirmed"), false);
    assert.equal(
      [...document.querySelectorAll("button")].some((boton) => boton.textContent?.trim() === "Try again"),
      false,
    );
  } finally {
    delete marca.__HYTO_PAUSAS_CONSULTA__;
    globalThis.fetch = anterior;
    await desmontar();
  }
});

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
