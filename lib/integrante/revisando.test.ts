import "../../tests/integracion/dom-global";
import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { act } from "react";
import { SubirEvidencia } from "../../components/integrante/SubirEvidencia";
import { ProveedorModoDemo } from "../../components/sesion/InsigniaDemo";
import { desmontar, limpiarPantalla, montar, texto } from "../../tests/integracion/montar";
import { INTERVALO_SEGUIMIENTO_MS, LIMITE_SEGUIMIENTO_MS } from "./seguimiento";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

const base = {
  id: "stand",
  titulo: "Set up the booth",
  tipo: "trabajo",
  monto: "20",
  condicion: "Banner visible; table set up",
  miembroId: "voluntario-1",
  estado: "en revisión",
  proyectoId: "zeek",
};

test("Revisando muestra a Mile buscando y pasa a Enviada cuando llega la nota", async () => {
  limpiarPantalla();
  const anterior = globalThis.fetch;
  let lecturas = 0;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.includes("/api/tareas")) {
      lecturas += 1;
      return json({ tareas: [lecturas > 1 ? { ...base, nota: 84, veredicto: "cumplió" } : { ...base, nota: null }] });
    }
    if (url.includes("/api/proyectos")) return json({ proyectos: [{ id: "zeek", nombre: "ZEEK" }] });
    return json({}, 404);
  };
  try {
    await montar(createElement(ProveedorModoDemo, { activo: false, children: createElement(SubirEvidencia, { tareaId: "stand" }) }));
    await act(async () => {
      await new Promise((resolver) => setTimeout(resolver, 30));
    });
    assert.match(texto(), /Mile is checking your photo/);
    // Static fallback while the animated rig loads, or the rig itself once it is ready (#159).
    const rigListo = [...document.querySelectorAll<HTMLElement>(".hyto-mile-animada [data-mile-rig]")].some((nodo) => nodo.style.display === "block");
    assert.ok(document.querySelector('img[src="/mile/mile-buscando-dark.svg"]') || rigListo);
    assert.equal(document.querySelectorAll(".hyto-checklist li").length, 2);
    assert.equal(document.querySelectorAll(".hyto-checklist .hyto-punto-espera").length, 2);
    const cta = [...document.querySelectorAll("button")].find((item) => item.textContent === "Sent");
    assert.equal((cta as HTMLButtonElement | undefined)?.disabled, true);

    await act(async () => {
      await new Promise((resolver) => setTimeout(resolver, INTERVALO_SEGUIMIENTO_MS + 300));
    });
    assert.ok(lecturas >= 2);
    assert.doesNotMatch(texto(), /Mile is checking your photo/);
    assert.match(texto(), /Your photo arrived/);
    assert.match(texto(), /What happens now/);
    assert.match(texto(), /84% · Completed/);
  } finally {
    globalThis.fetch = anterior;
    await desmontar();
    limpiarPantalla();
  }
});

test("si el plazo se acaba sin nota, Mile no queda en visto y se puede reenviar", async () => {
  limpiarPantalla();
  const anterior = globalThis.fetch;
  const ahoraPrevio = Date.now;
  let ahora = 1_700_000_000_000;
  Date.now = () => ahora;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.includes("/api/tareas")) return json({ tareas: [{ ...base, nota: null, veredicto: null }] });
    if (url.includes("/api/proyectos")) return json({ proyectos: [{ id: "zeek", nombre: "ZEEK" }] });
    return json({}, 404);
  };
  try {
    await montar(createElement(ProveedorModoDemo, { activo: false, children: createElement(SubirEvidencia, { tareaId: "stand" }) }));
    await act(async () => {
      await new Promise((resolver) => setTimeout(resolver, 30));
    });
    assert.match(texto(), /Mile is checking your photo/);
    ahora += LIMITE_SEGUIMIENTO_MS;
    await act(async () => {
      await new Promise((resolver) => setTimeout(resolver, INTERVALO_SEGUIMIENTO_MS + 300));
    });
    assert.match(texto(), /Mile couldn't finish — retry/);
    assert.match(texto(), /Send the photo again/);
    assert.doesNotMatch(texto(), /Your photo arrived/);
    assert.doesNotMatch(texto(), /Mile checks your photo/);
    const reintentar = [...document.querySelectorAll("button")].find((item) => item.textContent === "Try again");
    assert.ok(reintentar instanceof HTMLButtonElement);
    await act(async () => {
      reintentar.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    assert.match(texto(), /Open camera/);
    assert.doesNotMatch(texto(), /Mile couldn't finish/);
  } finally {
    Date.now = ahoraPrevio;
    globalThis.fetch = anterior;
    await desmontar();
    limpiarPantalla();
  }
});

test("una revisión guardada como error ofrece reenviar sin esperar el plazo", async () => {
  limpiarPantalla();
  const anterior = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.includes("/api/tareas")) {
      return json({
        tareas: [{ ...base, nota: null, veredicto: null, revisionFallida: true, enviadaEn: new Date().toISOString() }],
      });
    }
    if (url.includes("/api/proyectos")) return json({ proyectos: [{ id: "zeek", nombre: "ZEEK" }] });
    return json({}, 404);
  };
  try {
    await montar(createElement(ProveedorModoDemo, { activo: false, children: createElement(SubirEvidencia, { tareaId: "stand" }) }));
    await act(async () => {
      await new Promise((resolver) => setTimeout(resolver, 30));
    });
    assert.match(texto(), /Mile couldn't finish — retry/);
    assert.match(texto(), /Send the photo again/);
    assert.doesNotMatch(texto(), /Mile is checking your photo/);
    assert.doesNotMatch(texto(), /Your photo arrived/);
    const reintentar = [...document.querySelectorAll("button")].find((item) => item.textContent === "Try again");
    assert.ok(reintentar instanceof HTMLButtonElement);
  } finally {
    globalThis.fetch = anterior;
    await desmontar();
    limpiarPantalla();
  }
});

test("una foto ya más vieja que el plazo, sin nota, ofrece reenviar al abrir", async () => {
  limpiarPantalla();
  const anterior = globalThis.fetch;
  const enviadaEn = new Date(Date.now() - LIMITE_SEGUIMIENTO_MS - 5_000).toISOString();
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.includes("/api/tareas")) return json({ tareas: [{ ...base, nota: null, veredicto: null, enviadaEn }] });
    if (url.includes("/api/proyectos")) return json({ proyectos: [{ id: "zeek", nombre: "ZEEK" }] });
    return json({}, 404);
  };
  try {
    await montar(createElement(ProveedorModoDemo, { activo: false, children: createElement(SubirEvidencia, { tareaId: "stand" }) }));
    await act(async () => {
      await new Promise((resolver) => setTimeout(resolver, 30));
    });
    assert.match(texto(), /Mile couldn't finish — retry/);
    assert.doesNotMatch(texto(), /Mile is checking your photo/);
    const reintentar = [...document.querySelectorAll("button")].find((item) => item.textContent === "Try again");
    assert.ok(reintentar instanceof HTMLButtonElement);
  } finally {
    globalThis.fetch = anterior;
    await desmontar();
    limpiarPantalla();
  }
});

test("una foto recién enviada y sin nota sigue en Checking", async () => {
  limpiarPantalla();
  const anterior = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.includes("/api/tareas")) {
      return json({ tareas: [{ ...base, nota: null, veredicto: null, enviadaEn: new Date().toISOString() }] });
    }
    if (url.includes("/api/proyectos")) return json({ proyectos: [{ id: "zeek", nombre: "ZEEK" }] });
    return json({}, 404);
  };
  try {
    await montar(createElement(ProveedorModoDemo, { activo: false, children: createElement(SubirEvidencia, { tareaId: "stand" }) }));
    await act(async () => {
      await new Promise((resolver) => setTimeout(resolver, 30));
    });
    assert.match(texto(), /Mile is checking your photo/);
    assert.doesNotMatch(texto(), /Mile couldn't finish/);
  } finally {
    globalThis.fetch = anterior;
    await desmontar();
    limpiarPantalla();
  }
});

test("un reembolso fallido vuelve al selector de archivo", async () => {
  limpiarPantalla();
  const anterior = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.includes("/api/tareas")) {
      return json({
        tareas: [{ ...base, tipo: "reembolso", nota: null, veredicto: null, revisionFallida: true }],
      });
    }
    if (url.includes("/api/proyectos")) return json({ proyectos: [{ id: "zeek", nombre: "ZEEK" }] });
    return json({}, 404);
  };
  try {
    await montar(createElement(ProveedorModoDemo, { activo: false, children: createElement(SubirEvidencia, { tareaId: "stand" }) }));
    await act(async () => {
      await new Promise((resolver) => setTimeout(resolver, 30));
    });
    const reintentar = [...document.querySelectorAll("button")].find((item) => item.textContent === "Try again");
    assert.ok(reintentar instanceof HTMLButtonElement);
    await act(async () => {
      reintentar.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    assert.ok(document.querySelector('input[type="file"]') instanceof HTMLInputElement);
    assert.match(texto(), /Choose a file/);
    assert.doesNotMatch(texto(), /Mile couldn't finish/);
    assert.doesNotMatch(texto(), /Mile is checking your photo/);
  } finally {
    globalThis.fetch = anterior;
    await desmontar();
    limpiarPantalla();
  }
});

test("una nota insuficiente no usa el texto de éxito", async () => {
  limpiarPantalla();
  const anterior = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.includes("/api/tareas")) {
      return json({
        tareas: [{ ...base, nota: 40, veredicto: "insuficiente", etapa: "enviada_organizador" }],
      });
    }
    if (url.includes("/api/proyectos")) return json({ proyectos: [{ id: "zeek", nombre: "ZEEK" }] });
    return json({}, 404);
  };
  try {
    await montar(
      createElement(ProveedorModoDemo, {
        activo: false,
        children: createElement(SubirEvidencia, { tareaId: "stand", nombre: "Ana" }),
      }),
    );
    await act(async () => {
      await new Promise((resolver) => setTimeout(resolver, 30));
    });
    assert.match(texto(), /Ana, this photo didn't pass Mile's check/);
    assert.match(texto(), /40% · Insufficient/);
    assert.match(texto(), /You can send another one/);
    assert.doesNotMatch(texto(), /Your photo arrived/);
    assert.doesNotMatch(texto(), /Great job/);
    assert.doesNotMatch(texto(), /Mile is checking your photo/);
  } finally {
    globalThis.fetch = anterior;
    await desmontar();
    limpiarPantalla();
  }
});
