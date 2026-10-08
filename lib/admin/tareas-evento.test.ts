import "../../tests/integracion/dom-global";
import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { act } from "react";
import { TareasEvento } from "../../components/admin/TareasEvento";
import { desmontar, escribir, limpiarPantalla, montar, pulsar, texto } from "../../tests/integracion/montar";

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
    assert.match(texto(), /Paid · US\$12\.44 \(US\$12\.48 minus a US\$0\.04 fee\) · Limit US\$15/);
    assert.equal(texto().includes("Up to US$15"), false);
    assert.match(texto(), /Pending · US\$20/);
  } finally {
    await desmontar();
    limpiarPantalla();
  }
});

test("asignar una tarea también deja elegir prioridad y dificultad", async () => {
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
    const rejilla = document.querySelector(".sm\\:grid-cols-2");
    assert.ok(rejilla);
    assert.match(rejilla.className, /grid-cols-1/);
    assert.equal([...document.querySelectorAll("button")].some((boton) => boton.textContent === "Edit"), true);
    assert.equal((document.querySelector("#prioridad-t1") as HTMLSelectElement).value, "normal");
    assert.equal((document.querySelector("#dificultad-t1") as HTMLSelectElement).value, "");
    assert.equal(texto().includes("High priority"), false);

    await elegir("#prioridad-t1", "high");
    await elegir("#dificultad-t1", "easy");
    assert.deepEqual(llamadas, [
      { url: "/api/tareas/t1/clasificar", body: { prioridad: "high" } },
      { url: "/api/tareas/t1/clasificar", body: { dificultad: "easy" } },
    ]);
    assert.match(texto(), /High priority/);
    assert.match(texto(), /Easy/);
    const alta = document.querySelector(".hyto-pill-ok");
    const suave = [...document.querySelectorAll(".hyto-pill-muted")].find((nodo) => nodo.textContent?.includes("Easy"));
    assert.match(alta?.className ?? "", /hyto-pill /);
    assert.equal(alta?.className.includes("hyto-pill-bad"), false);
    assert.match(suave?.className ?? "", /hyto-pill-muted/);

    await pulsar("Edit");
    await escribir("#titulo-t1", "Cajas nuevas");
    await pulsar("Save");
    assert.equal(llamadas.at(-1)?.url, "/api/tareas/t1");
    assert.equal((llamadas.at(-1)?.body as { titulo?: string; prioridad?: string }).titulo, "Cajas nuevas");
    assert.equal((llamadas.at(-1)?.body as { prioridad?: string }).prioridad, undefined);
    assert.equal((document.querySelector("#prioridad-t1") as HTMLSelectElement).value, "high");
  } finally {
    globalThis.fetch = anterior;
    await desmontar();
    limpiarPantalla();
  }
});
