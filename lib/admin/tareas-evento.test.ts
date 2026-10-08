import "../../tests/integracion/dom-global";
import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { TareasEvento } from "../../components/admin/TareasEvento";
import { desmontar, escribir, limpiarPantalla, montar, pulsar, texto } from "../../tests/integracion/montar";

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
            bloqueo: null,
            tieneFoto: false,
          },
        ],
      }),
    );
    assert.match(texto(), /Paid · US\$12\.44 \(US\$12\.48 minus a US\$0\.04 fee\) · Limit US\$15/);
    assert.equal(texto().includes("Up to US$15"), false);
    assert.match(texto(), /Pending · US\$20/);
    const bloqueo = document.querySelector('a[href="/revision/stand"]');
    assert.equal(bloqueo?.textContent, "Lock budget");
    const comida = document.querySelector('a[href="/revision/comida"]');
    assert.equal(comida?.textContent, "Open review");
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
            bloqueo: null,
            tieneFoto: false,
          },
        ],
      }),
    );
    await pulsar("Edit");
    await escribir("#tope-comida", "50");
    const aviso = document.querySelector("#saldo-comida");
    assert.match(aviso?.textContent ?? "", /US\$51\.00/);
    assert.match(aviso?.textContent ?? "", /US\$1\.00 that stays/);
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

test("las tareas del evento ya no muestran ni editan prioridad y dificultad", async () => {
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
            bloqueo: null,
            tieneFoto: false,
          },
        ],
      }),
    );
    assert.equal([...document.querySelectorAll("button")].some((boton) => boton.textContent === "Edit"), true);
    assert.equal(document.querySelector("#prioridad-t1"), null);
    assert.equal(document.querySelector("#dificultad-t1"), null);
    assert.equal(llamadas.length, 0);

    await pulsar("Edit");
    assert.match(texto(), /Evidence must show/);
    await escribir("#titulo-t1", "Cajas nuevas");
    await pulsar("Save");
    assert.equal(llamadas.at(-1)?.url, "/api/tareas/t1");
    assert.equal((llamadas.at(-1)?.body as { titulo?: string }).titulo, "Cajas nuevas");
    assert.equal(llamadas.some((llamada) => llamada.url.endsWith("/clasificar")), false);
  } finally {
    globalThis.fetch = anterior;
    await desmontar();
    limpiarPantalla();
  }
});
