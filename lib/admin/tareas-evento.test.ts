import "../../tests/integracion/dom-global";
import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { act } from "react";
import { TareasEvento, type FilaTareaEvento } from "../../components/admin/TareasEvento";
import { ProveedorModoDemo } from "../../components/sesion/InsigniaDemo";
import { ProveedorIdioma } from "../../components/ui/Idioma";
import { desmontar, escribir, limpiarPantalla, montar, pulsar, texto } from "../../tests/integracion/montar";

async function pulsarMenu(titulo: string): Promise<void> {
  const boton = document.querySelector(`button[aria-label="More actions for ${titulo}"]`);
  if (!boton) throw new Error(`Sin menú ${titulo}.`);
  await act(async () => {
    boton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

async function elegir(selector: string, valor: string): Promise<void> {
  const nodo = document.querySelector(selector);
  if (!(nodo instanceof HTMLSelectElement)) throw new Error(`No está ${selector}.`);
  const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set;
  await act(async () => {
    setter?.call(nodo, valor);
    nodo.dispatchEvent(new Event("change", { bubbles: true }));
    await Promise.resolve();
  });
}

test("una tarea pagada muestra lo pagado y el límite, no el tope como si fuera el pago", async () => {
  limpiarPantalla();
  try {
    await montar(
      createElement(TareasEvento, {
        miembros: [],
        tareas: [
          {
            id: "comida",
            titulo: "Team meal",
            tipo: "reembolso",
            monto: "15",
            tope: "15",
            estado: "pagado",
            miembroId: "",
            condicion: "Receipt",
            prioridad: "normal",
            dificultad: null,
            bloqueo: null,
            tieneFoto: true,
            montoConfirmado: "12.48",
            montoRevisado: "12.48",
          },
          {
            id: "stand",
            titulo: "Booth",
            tipo: "trabajo",
            monto: "20",
            tope: null,
            estado: "pendiente",
            miembroId: "",
            condicion: "",
            prioridad: "normal",
            dificultad: null,
            bloqueo: null,
            tieneFoto: false,
          },
        ],
      }),
    );
    // The gross and the fee of a paid task are a separate detail; the cap is not shown as the payment.
    assert.match(texto(), /US\$12\.48 minus a US\$0\.04 fee/);
    assert.equal(texto().includes("Up to US$15"), false);
    assert.match(texto(), /US\$20\.00/);
    // «Presupuesto sin bloquear»: only the unpaid task counts, and nobody is assigned, so nothing is ready.
    assert.match(texto(), /Budget not locked · US\$20\.00 for 1 task/);
    assert.match(texto(), /Each task is saved separately/);
    const lote = [...document.querySelectorAll("button")].find((boton) => boton.textContent?.includes("Lock 0 of 1 task"));
    assert.equal(lote instanceof HTMLButtonElement && lote.disabled, true);
    assert.match(texto(), /Assign someone before you can lock the budget/);
    assert.equal(document.querySelector('[data-tarea="stand"]')?.getAttribute("data-fila"), "gris");
    assert.match(texto(), /Has evidence/);
    // No lime button per row: actions live in the ⋯ menu.
    assert.equal(document.querySelectorAll(".pj-trow .hyto-btn").length, 0);
    await pulsarMenu("Booth");
    assert.equal(document.querySelector('[role="menu"] a[href="/revision/stand"]')?.textContent, "Open review");
  } finally {
    await desmontar();
    limpiarPantalla();
  }
});

test("subir el tope por encima del saldo avisa con dos decimales y no guarda", async () => {
  limpiarPantalla();
  const anterior = globalThis.fetch;
  let llamados = 0;
  globalThis.fetch = (async () => {
    llamados += 1;
    return new Response(JSON.stringify({ tarea: { titulo: "Meal", condicion: "Receipt", monto: "15", tope: "50", miembroId: "" } }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;
  try {
    await montar(
      createElement(TareasEvento, {
        saldo: "1.30",
        miembros: [],
        tareas: [
          {
            id: "comida",
            titulo: "Meal",
            tipo: "reembolso",
            monto: "15",
            tope: "15",
            estado: "pendiente",
            miembroId: "",
            condicion: "Receipt",
            prioridad: "normal",
            dificultad: null,
            bloqueo: null,
            tieneFoto: false,
          },
        ],
      }),
    );
    await pulsarMenu("Meal");
    await pulsar("Edit");
    await escribir("#tope-comida", "50");
    const aviso = document.querySelector("#saldo-comida");
    assert.match(aviso?.textContent ?? "", /US\$51\.00/);
    assert.match(aviso?.textContent ?? "", /US\$1\.00 reserve/);
    assert.match(aviso?.textContent ?? "", /You are short US\$49\.70/);
    assert.equal(/US\$51(?!\.00)/.test(aviso?.textContent ?? ""), false);
    assert.equal(/US\$49\.7(?!0)/.test(aviso?.textContent ?? ""), false);
    const guardar = [...document.querySelectorAll("button")].find((boton) => boton.textContent === "Save");
    assert.equal(guardar instanceof HTMLButtonElement && guardar.disabled, true);
    await pulsar("Save");
    assert.equal(llamados, 0);
  } finally {
    globalThis.fetch = anterior;
    await desmontar();
    limpiarPantalla();
  }
});

test("la tarea del evento no muestra ni deja editar prioridad o dificultad", async () => {
  limpiarPantalla();
  const anterior = globalThis.fetch;
  const llamadas: { url: string; body: unknown }[] = [];
  globalThis.fetch = (async (entrada: RequestInfo | URL, init?: RequestInit) => {
    llamadas.push({ url: String(entrada), body: JSON.parse(String(init?.body)) });
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;
  try {
    await montar(
      createElement(TareasEvento, {
        miembros: [{ usuarioId: "vol", email: "vol@hyto.app" }],
        tareas: [
          {
            id: "t1",
            titulo: "Cajas",
            tipo: "trabajo",
            monto: "8",
            tope: null,
            estado: "pendiente",
            miembroId: "",
            condicion: "Cajas cerradas",
            prioridad: "normal",
            dificultad: null,
            bloqueo: null,
            tieneFoto: false,
          },
        ],
      }),
    );
    await pulsarMenu("Cajas");
    assert.equal([...document.querySelectorAll("button")].some((boton) => boton.textContent === "Edit"), true);
    assert.equal(document.querySelector("#prioridad-t1"), null);
    assert.equal(document.querySelector("#dificultad-t1"), null);
    assert.equal(/Priority|Difficulty|High priority|\b(Easy|Medium|Hard)\b/.test(texto()), false);

    await pulsar("Edit");
    await escribir("#titulo-t1", "Cajas nuevas");
    await pulsar("Save");
    assert.equal(llamadas.at(-1)?.url, "/api/tareas/t1");
    assert.equal((llamadas.at(-1)?.body as { titulo?: string; prioridad?: string }).titulo, "Cajas nuevas");
    assert.equal((llamadas.at(-1)?.body as { prioridad?: string }).prioridad, undefined);
    assert.equal(llamadas.some((llamada) => llamada.url.endsWith("/clasificar")), false);
  } finally {
    globalThis.fetch = anterior;
    await desmontar();
    limpiarPantalla();
  }
});

function filaLote(id: string, parcial: Partial<FilaTareaEvento> = {}): FilaTareaEvento {
  return {
    id,
    titulo: `Task ${id.toUpperCase()}`,
    tipo: "trabajo",
    monto: "10",
    tope: null,
    estado: "pendiente",
    miembroId: "vol",
    condicion: "",
    prioridad: "normal",
    dificultad: null,
    bloqueo: null,
    tieneFoto: false,
    cuentaCobro: true,
    contrato: null,
    montoLote: "10",
    ...parcial,
  };
}

function botonLote(): HTMLButtonElement | undefined {
  return document.querySelector(".pj-lote button.hyto-btn") as HTMLButtonElement | undefined;
}

async function pulsarLote(): Promise<void> {
  const boton = botonLote();
  if (!boton) throw new Error("Sin botón del lote.");
  await act(async () => {
    boton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  await act(async () => {
    await new Promise((resolver) => setTimeout(resolver, 10));
  });
}

test("Bloquear K de N firma una vez por clic, salta sin persona y sigue tras un fallo; Reintentar solo pide lo que falta", async () => {
  limpiarPantalla();
  const anterior = globalThis.fetch;
  const pedidos: { url: string; body: Record<string, unknown> }[] = [];
  let fallaFondeoA = true;
  globalThis.fetch = (async (entrada: RequestInfo | URL, init?: RequestInit) => {
    const url = String(entrada);
    const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {};
    pedidos.push({ url, body });
    const responder = (cuerpo: unknown, status = 200) =>
      new Response(JSON.stringify(cuerpo), { status, headers: { "content-type": "application/json" } });
    if (url === "/api/firma") {
      return responder({ xdr: `XDR-${body.tareaId}-${body.accion}`, token: "T", contrato: body.accion === "desplegar" ? null : body.contrato, monto: 10 });
    }
    if (url === "/api/firma/enviar") {
      if (body.tareaId === "a" && body.accion === "fondear" && fallaFondeoA) {
        fallaFondeoA = false;
        return responder({ aviso: "We couldn't send that step. Try again." }, 502);
      }
      return responder({ hash: `H-${body.tareaId}-${body.accion}`, contrato: body.accion === "desplegar" ? `C-${body.tareaId}` : body.contrato });
    }
    return responder({ aviso: "no" }, 404);
  }) as typeof fetch;
  const firmas: string[] = [];
  const firmar = async (xdr: string) => {
    firmas.push(xdr);
    return `SIGNED-${xdr}`;
  };
  try {
    await montar(
      createElement(TareasEvento, {
        wallet: "GORGANIZADOR",
        saldo: "500",
        firmar,
        miembros: [{ usuarioId: "vol", email: "vol@hyto.app", nombre: "Ana López", cuentaCobro: true }],
        tareas: [filaLote("a"), filaLote("b", { miembroId: "", cuentaCobro: false }), filaLote("c")],
      }),
    );
    assert.match(texto(), /Budget not locked · US\$30\.00 for 3 tasks/);
    assert.equal(botonLote()?.textContent, "Lock 2 of 3 tasks");
    assert.equal(document.querySelector('[data-tarea="b"]')?.getAttribute("data-fila"), "gris");
    assert.equal(texto().includes("vol@hyto.app"), false);

    // Click 1: only Task A's deploy.
    await pulsarLote();
    assert.deepEqual(firmas, ["XDR-a-desplegar"]);
    assert.match(texto(), /Locking task 1 of 2 · signature 2 of 2/);
    assert.equal(botonLote()?.textContent, "Next signature");
    // Click 2: Task A's fund fails. The row turns orange with Retry; the run moves on to C.
    await pulsarLote();
    assert.deepEqual(firmas, ["XDR-a-desplegar", "XDR-a-fondear"]);
    assert.equal(document.querySelector('[data-tarea="a"]')?.getAttribute("data-fila"), "naranja");
    assert.ok([...document.querySelectorAll('[data-tarea="a"] button')].some((boton) => boton.textContent === "Retry"));
    assert.match(texto(), /Locking task 2 of 2 · signature 1 of 2/);
    // Clicks 3 and 4: Task C, one signature each. B (no person) is never signed.
    await pulsarLote();
    assert.equal(firmas.length, 3);
    await pulsarLote();
    assert.deepEqual(firmas, ["XDR-a-desplegar", "XDR-a-fondear", "XDR-c-desplegar", "XDR-c-fondear"]);
    assert.equal(firmas.some((firma) => firma.includes("-b-")), false);
    assert.ok(document.querySelector('[data-tarea="c"] .pj-candado'));
    assert.equal(texto().includes("Locking task"), false);
    // The fund signature carried the amount the deploy prepared, on C's own contract.
    const fondeoC = pedidos.find((pedido) => pedido.url === "/api/firma" && pedido.body.tareaId === "c" && pedido.body.accion === "fondear");
    assert.equal(fondeoC?.body.contrato, "C-c");
    assert.equal(fondeoC?.body.monto, 10);
    assert.equal(fondeoC?.body.firmante, "GORGANIZADOR");

    // Retry on A: one click, only the fund signature, on the contract its deploy left.
    const reintento = [...document.querySelectorAll('[data-tarea="a"] button')].find((boton) => boton.textContent === "Retry");
    await act(async () => {
      reintento?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await act(async () => {
      await new Promise((resolver) => setTimeout(resolver, 10));
    });
    assert.deepEqual(firmas.slice(4), ["XDR-a-fondear"]);
    assert.equal(pedidos.filter((pedido) => pedido.url === "/api/firma" && pedido.body.tareaId === "a" && pedido.body.accion === "desplegar").length, 1);
    assert.equal(pedidos.filter((pedido) => pedido.url === "/api/firma" && pedido.body.tareaId === "a").at(-1)?.body.contrato, "C-a");
    assert.ok(document.querySelector('[data-tarea="a"] .pj-candado'));
    assert.equal(document.querySelector('[data-tarea="a"]')?.getAttribute("data-fila"), null);
    // Only B is left, and it has no person.
    assert.match(texto(), /Budget not locked · US\$10\.00 for 1 task/);
    assert.equal(botonLote()?.textContent, "Lock 0 of 1 task");
  } finally {
    globalThis.fetch = anterior;
    await desmontar();
    limpiarPantalla();
  }
});

test("en español: banner, nota de Stellar y botón Bloquear K de N; sin cuenta de cobro no entra al lote", async () => {
  limpiarPantalla();
  try {
    await montar(
      createElement(ProveedorIdioma, {
        idioma: "es",
        children: createElement(TareasEvento, {
          wallet: "GORGANIZADOR",
          saldo: "500",
          firmar: async (xdr: string) => xdr,
          miembros: [{ usuarioId: "vol", email: "vol@hyto.app", nombre: "Ana López", cuentaCobro: true }],
          tareas: [
            filaLote("a", { tieneFoto: true, estado: "en revisión" }),
            filaLote("b", { cuentaCobro: false }),
            filaLote("c", { contrato: "CLISTO" }),
          ],
        }),
      }),
    );
    assert.match(texto(), /Presupuesto sin bloquear · US\$20\.00 para 2 tareas/);
    assert.match(texto(), /Cada tarea queda guardada por separado/);
    assert.equal(botonLote()?.textContent, "Bloquear 1 de 2 tareas");
    assert.match(texto(), /Ya tiene evidencia/);
    assert.match(texto(), /Aún sin evidencia/);
    assert.match(texto(), /Esta persona aún no tiene cuenta de cobro\. Pídale que entre a Hyto para prepararla\./);
    assert.equal([...document.querySelectorAll("button.hyto-btn")].length, 1);
  } finally {
    await desmontar();
    limpiarPantalla();
  }
});

test("en demo el lote va firma por firma, sin Cavos, con el bloqueo de práctica", async () => {
  limpiarPantalla();
  const anterior = globalThis.fetch;
  const demos: string[] = [];
  globalThis.fetch = (async (entrada: RequestInfo | URL, init?: RequestInit) => {
    const url = String(entrada);
    if (url.includes("/api/firma")) throw new Error("no Cavos in demo");
    if (url.endsWith("/demo")) {
      demos.push(url);
      const id = url.split("/")[3];
      return new Response(JSON.stringify({ estado: "pendiente", contrato: `demo-lock-${id}`, demo: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    void init;
    return new Response("{}", { status: 404 });
  }) as typeof fetch;
  try {
    await montar(
      createElement(ProveedorModoDemo, {
        activo: true,
        rol: "organizador",
        children: createElement(TareasEvento, {
          miembros: [{ usuarioId: "vol", email: "vol@hyto.app", nombre: "Voluntario demo" }],
          tareas: [filaLote("a", { cuentaCobro: false }), filaLote("b", { cuentaCobro: false }), filaLote("c", { miembroId: "" })],
        }),
      }),
    );
    assert.equal(botonLote()?.textContent, "Lock 2 of 3 tasks");
    // Same rhythm as a real run: one click per signature, a lime «Next signature» between them.
    await pulsarLote();
    assert.match(texto(), /Locking budget…/);
    assert.match(texto(), /Locking task 1 of 2 · signature 2 of 2/);
    assert.equal(document.querySelector(".pj-lote-barra")?.getAttribute("aria-valuenow"), "25");
    assert.equal(botonLote()?.textContent, "Next signature");
    assert.equal(botonLote()?.disabled, false);
    assert.equal(botonLote()?.getAttribute("aria-disabled"), null);
    assert.deepEqual(demos, []);
    await pulsarLote();
    for (let i = 0; i < 20 && demos.length < 1; i += 1) {
      await act(async () => {
        await new Promise((resolver) => setTimeout(resolver, 10));
      });
    }
    assert.deepEqual(demos, ["/api/revision/a/demo"]);
    assert.match(texto(), /Locking task 2 of 2 · signature 1 of 2/);
    await pulsarLote();
    await pulsarLote();
    for (let i = 0; i < 20 && demos.length < 2; i += 1) {
      await act(async () => {
        await new Promise((resolver) => setTimeout(resolver, 10));
      });
    }
    assert.deepEqual(demos, ["/api/revision/a/demo", "/api/revision/b/demo"]);
    assert.ok(document.querySelector('[data-tarea="a"] .pj-candado'));
    assert.ok(document.querySelector('[data-tarea="b"] .pj-candado'));
    assert.equal(texto().includes("Locking budget…"), false);
    assert.equal(botonLote()?.textContent, "Lock 0 of 1 task");
  } finally {
    globalThis.fetch = anterior;
    await desmontar();
    limpiarPantalla();
  }
});
