import "../../tests/integracion/dom-global";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { act, createElement } from "react";
import { Bandeja } from "@/components/admin/Bandeja";
import { ProveedorIdioma } from "@/components/ui/Idioma";
import { texto as textoDe } from "@/lib/ui/diccionario";
import { chipsEstado, filtrarPorEstado, nombrePersona, pasosRevision, porcentajePagado, rotuloPrincipalRevision } from "./proyecto-vista";
import { desmontar, montar, pulsar, texto } from "../../tests/integracion/montar";

test("el botón principal de la revisión: Bloquear y aprobar sin bloqueo, Aprobar y pagar con bloqueo", () => {
  const sin = { enRevision: true, desplegar: false, fondear: false, pagar: false };
  assert.equal(rotuloPrincipalRevision({ ...sin, desplegar: true }), "proyecto.bloquearAprobar");
  // Deployed but not funded is still not locked.
  assert.equal(rotuloPrincipalRevision({ ...sin, fondear: true }), "proyecto.bloquearAprobar");
  assert.equal(rotuloPrincipalRevision({ ...sin, pagar: true }), "pago.approvePay");
  // No evidence yet: there is nothing to approve, so the lock keeps its own name.
  assert.equal(rotuloPrincipalRevision({ ...sin, enRevision: false, desplegar: true }), "pago.lockBudget");
  assert.equal(rotuloPrincipalRevision({ ...sin, enRevision: false, fondear: true }), "pago.finishLocking");
  assert.equal(rotuloPrincipalRevision(sin), null);
  assert.equal(textoDe("es", "proyecto.bloquearAprobar"), "Bloquear y aprobar");
  assert.equal(textoDe("es", "pago.approvePay"), "Aprobar y pagar");
  assert.equal(textoDe("es", "revision.askAnother"), "Pedir otra evidencia");
  assert.equal(textoDe("es", "proyecto.mileDecide"), "Mile solo recomienda. Usted decide.");
});

test("los tres pasos de la revisión", () => {
  assert.deepEqual(pasosRevision({ evidencia: true, bloqueado: false, pagado: false }), ["hecho", "ahora", "luego"]);
  assert.deepEqual(pasosRevision({ evidencia: true, bloqueado: true, pagado: false }), ["hecho", "hecho", "ahora"]);
  assert.deepEqual(pasosRevision({ evidencia: false, bloqueado: false, pagado: false }), ["ahora", "luego", "luego"]);
  assert.deepEqual(pasosRevision({ evidencia: true, bloqueado: true, pagado: true }), ["hecho", "hecho", "hecho"]);
});

test("los chips de estado cuentan cada grupo y filtran en orden", () => {
  const tareas = [
    { id: "p1", estado: "pendiente" },
    { id: "r1", estado: "en revisión" },
    { id: "g1", estado: "pagado" },
    { id: "r2", estado: "en revisión" },
  ];
  assert.deepEqual(
    chipsEstado(tareas).map((chip) => [chip.id, chip.n]),
    [
      ["all", 4],
      ["en revisión", 2],
      ["pagado", 1],
      ["pendiente", 1],
    ],
  );
  assert.deepEqual(filtrarPorEstado(tareas, "all").map((tarea) => tarea.id), ["r1", "r2", "g1", "p1"]);
  assert.deepEqual(filtrarPorEstado(tareas, "en revisión").map((tarea) => tarea.id), ["r1", "r2"]);
  assert.deepEqual(filtrarPorEstado(tareas, "pendiente").map((tarea) => tarea.id), ["p1"]);
});

test("nunca un correo ni un id como nombre; porcentaje pagado acotado", () => {
  assert.equal(nombrePersona("ana@hyto.app"), null);
  assert.equal(nombrePersona("0b5d7d0e-1c1f-4a52-9a0e-2f9f1d2c3b4a"), null);
  assert.equal(nombrePersona("  Ana López "), "Ana López");
  assert.equal(porcentajePagado("12.44", "15"), 83);
  assert.equal(porcentajePagado("5", "0"), 0);
  assert.equal(porcentajePagado("20", "15"), 100);
});

test("los chips se desplazan en una sola fila: no se envuelven ni se cortan", () => {
  const css = readFileSync("components/admin/proyecto.css", "utf8");
  const regla = (selector: string) => css.match(new RegExp(`${selector.replace(".", "\\.")} \\{([^}]*)\\}`))?.[1] ?? "";
  assert.match(regla(".pj-chips"), /overflow-x: auto/);
  assert.doesNotMatch(regla(".pj-chips"), /flex-wrap: wrap/);
  assert.match(regla(".pj-chip"), /flex: none/);
});

test("la bandeja muestra chips con conteo en español y filtra la lista", async () => {
  const anterior = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("/vista")) {
      return json({
        nombre: "Feria",
        tareas: [
          fila("stand", "Montar el stand", "en revisión", "Ana López"),
          fila("comida", "Comida", "pendiente", "ana@hyto.app"),
          fila("registro", "Registro", "pagado", "Luis"),
        ],
      });
    }
    if (url.includes("/novedades")) return json({ cursor: "a".repeat(32), cambios: [] });
    return json({ aviso: "no" }, 404);
  }) as typeof fetch;
  try {
    await montar(createElement(ProveedorIdioma, { idioma: "es", children: createElement(Bandeja, { proyectoId: "evt" }) }));
    await esperar(() => texto().includes("Montar el stand"));
    const chips = [...document.querySelectorAll("button.pj-chip")].map((chip) => chip.textContent);
    assert.deepEqual(chips, ["Todas 3", "Por revisar 1", "Pagadas 1", "Pendientes 1"]);
    assert.equal(document.querySelector("button.pj-chip")?.getAttribute("aria-pressed"), "true");
    // People show by name and initial; an email never reaches the screen.
    assert.equal(texto().includes("ana@hyto.app"), false);
    assert.match(texto(), /Ana López/);
    assert.equal([...document.querySelectorAll("a.pj-item")].length, 3);
    await pulsar("Pendientes");
    assert.deepEqual([...document.querySelectorAll("a.pj-item")].map((nodo) => nodo.getAttribute("href")), ["/revision/comida"]);
    assert.equal([...document.querySelectorAll("button.pj-chip")].find((chip) => chip.textContent?.startsWith("Pendientes"))?.getAttribute("aria-pressed"), "true");
    // One lime primary in the detail: «Abrir la revisión».
    assert.equal([...document.querySelectorAll("a.hyto-btn, button.hyto-btn")].filter((nodo) => nodo.textContent?.includes("Abrir la revisión")).length, 1);
  } finally {
    globalThis.fetch = anterior;
    await desmontar();
  }
});

function fila(id: string, titulo: string, estado: string, miembro: string) {
  return {
    id,
    titulo,
    tipo: "trabajo",
    monto: "20",
    tope: null,
    condicion: "Banner",
    miembroId: "v",
    miembro,
    estado,
    veredicto: estado === "en revisión" ? "cumplió" : null,
    nota: estado === "en revisión" ? 90 : null,
    frase: null,
    origen: estado === "en revisión" ? "guion" : null,
    montoRevisado: null,
    hashPago: estado === "pagado" ? "ab".repeat(32) : null,
  };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

async function esperar(listo: () => boolean): Promise<void> {
  for (let i = 0; i < 40; i += 1) {
    if (listo()) return;
    await act(async () => {
      await new Promise((resolver) => setTimeout(resolver, 20));
    });
  }
  throw new Error(`Timed out. Screen: ${texto()}`);
}
