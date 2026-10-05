import "../../tests/integracion/dom-global";
import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { act } from "react";
import { SubirEvidencia } from "../../components/integrante/SubirEvidencia";
import { ProveedorModoDemo } from "../../components/sesion/InsigniaDemo";
import { desmontar, limpiarPantalla, montar, texto } from "../../tests/integracion/montar";
import { FRASE_PAGO } from "./nota";
import { leerTarea } from "./rutas";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function tarea(extra: Record<string, unknown> = {}) {
  return {
    id: "stand",
    titulo: "Set up the booth",
    tipo: "trabajo",
    monto: "20",
    condicion: "Banner visible",
    miembroId: "voluntario-1",
    estado: "en revisión",
    proyectoId: "zeek",
    ...extra,
  };
}

async function abrir(cuerpo: Record<string, unknown>) {
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.includes("/api/tareas")) return json({ tareas: [cuerpo] });
    if (url.includes("/api/proyectos")) return json({ proyectos: [{ id: "zeek", nombre: "ZEEK" }] });
    return json({}, 404);
  };
  await montar(createElement(ProveedorModoDemo, { activo: false, children: createElement(SubirEvidencia, { tareaId: "stand" }) }));
  await act(async () => {
    await new Promise((resolver) => setTimeout(resolver, 30));
  });
}

test("con nota real la pastilla muestra el porcentaje y aclara que el pago lo decide el organizador", async () => {
  limpiarPantalla();
  const anterior = globalThis.fetch;
  try {
    await abrir(
      tarea({
        nota: 64,
        veredicto: "cumplió",
        frase: "SECRETO-LAYA Category stand",
        choice: "stand",
        etiquetas: ["antifraude"],
        origen: "scout",
        textoScout: "SECRETO-LAYA",
      }),
    );
    assert.match(texto(), /64% · Partially completed/);
    assert.match(texto(), /In review/);
    assert.match(texto(), new RegExp(FRASE_PAGO));
    assert.equal(document.querySelector(".hyto-pill-veredicto")?.getAttribute("aria-label"), "64% · Partially completed");
    assert.match(document.querySelector(".hyto-pill-veredicto")?.className ?? "", /hyto-pill-mid/);
    assert.equal(document.querySelector(".hyto-pill-bar > span") instanceof HTMLElement, true);
    assert.equal(texto().includes("SECRETO-LAYA"), false);
    assert.equal(texto().includes("Category"), false);
    assert.equal(texto().includes("antifraude"), false);
    assert.equal(texto().includes("%"), true);
  } finally {
    globalThis.fetch = anterior;
    await desmontar();
    limpiarPantalla();
  }
});

test("sin nota real no hay porcentaje ni la frase del pago", async () => {
  limpiarPantalla();
  const anterior = globalThis.fetch;
  try {
    await abrir(tarea({ nota: null, veredicto: null, frase: "SECRETO-LAYA" }));
    assert.match(texto(), /In review/);
    assert.equal(document.querySelector(".hyto-pill-veredicto"), null);
    assert.equal(texto().includes("%"), false);
    assert.equal(texto().includes(FRASE_PAGO), false);
    assert.equal(texto().includes("SECRETO-LAYA"), false);
  } finally {
    globalThis.fetch = anterior;
    await desmontar();
    limpiarPantalla();
  }
});

test("una tarea pagada muestra la nota y no dice que el pago sigue abierto", async () => {
  limpiarPantalla();
  const anterior = globalThis.fetch;
  try {
    await abrir(tarea({ estado: "pagado", nota: 84, veredicto: "cumplió" }));
    assert.match(texto(), /84% · Completed/);
    assert.match(texto(), /Paid/);
    assert.equal(texto().includes(FRASE_PAGO), false);
    assert.equal(texto().includes("Take another"), false);
  } finally {
    globalThis.fetch = anterior;
    await desmontar();
    limpiarPantalla();
  }
});

test("una nota que no es un entero de 0 a 100 no se muestra", async () => {
  limpiarPantalla();
  const anterior = globalThis.fetch;
  try {
    await abrir(tarea({ nota: "64", veredicto: "parcial", frase: "no mostrar" }));
    assert.equal(document.querySelector(".hyto-pill-veredicto"), null);
    assert.equal(texto().includes("%"), false);
    assert.equal(texto().includes("no mostrar"), false);
  } finally {
    globalThis.fetch = anterior;
    await desmontar();
    limpiarPantalla();
  }
});

test("con menos movimiento la pastilla del voluntario salta al porcentaje final", async () => {
  limpiarPantalla();
  const anterior = globalThis.fetch;
  const restaurar = medio(true);
  try {
    await abrir(tarea({ nota: 40, veredicto: "insuficiente" }));
    const pill = document.querySelector(".hyto-pill-veredicto");
    assert.ok(pill instanceof HTMLElement);
    assert.equal(pill.style.getPropertyValue("--hyto-nota"), "40");
    assert.equal(pill.style.getPropertyValue("--hyto-llenado"), "40");
    assert.equal(pill.getAttribute("aria-label"), "40% · Insufficient");
    assert.match(texto(), new RegExp(FRASE_PAGO));
  } finally {
    restaurar();
    globalThis.fetch = anterior;
    await desmontar();
    limpiarPantalla();
  }
});

test("una tarea pendiente no muestra el porcentaje aunque la respuesta lo traiga", async () => {
  limpiarPantalla();
  const anterior = globalThis.fetch;
  try {
    await abrir(tarea({ estado: "pendiente", nota: 64, veredicto: "parcial", frase: "SECRETO-LAYA" }));
    assert.match(texto(), /Open camera/);
    assert.equal(texto().includes("%"), false);
    assert.equal(texto().includes(FRASE_PAGO), false);
    assert.equal(texto().includes("SECRETO-LAYA"), false);
  } finally {
    globalThis.fetch = anterior;
    await desmontar();
    limpiarPantalla();
  }
});

test("después de enviar, la pantalla usa la nota que ya guardó la revisión", async () => {
  limpiarPantalla();
  const anterior = globalThis.fetch;
  Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: undefined });
  let lecturas = 0;
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.includes("/api/tareas")) {
      lecturas += 1;
      if (lecturas === 1) return json({ tareas: [tarea({ estado: "pendiente", nota: null, veredicto: null })] });
      return json({
        tareas: [
          tarea({
            estado: "en revisión",
            etapa: "enviada_organizador",
            enviadaEn: "2026-10-05T18:04:00.000Z",
            nota: 64,
            veredicto: "parcial",
            frase: "SECRETO-LAYA",
            choice: "otra",
          }),
        ],
      });
    }
    if (url.includes("/api/proyectos")) return json({ proyectos: [{ id: "zeek", nombre: "ZEEK" }] });
    if (url.endsWith("/api/evidencias/token")) return json({ token: "t-1" });
    if (url.endsWith("/api/evidencias") && init?.method === "POST") {
      return json({ evidencia: { id: "ev-1", tareaId: "stand", blobId: "blob-1" } }, 201);
    }
    if (url.includes("/api/evidencias/")) return json({ evidencia: { id: "ev-1", tareaId: "stand", blobId: "blob-1" } });
    return json({}, 404);
  };
  try {
    await montar(createElement(ProveedorModoDemo, { activo: false, children: createElement(SubirEvidencia, { tareaId: "stand" }) }));
    await act(async () => {
      await new Promise((resolver) => setTimeout(resolver, 30));
    });
    assert.match(texto(), /Open camera/);
    assert.equal(texto().includes("%"), false);
    const input = document.querySelector('input[type="file"]');
    assert.ok(input instanceof HTMLInputElement);
    const archivo = new File([Uint8Array.from([1, 2, 3])], "ahora.jpg", { type: "image/jpeg", lastModified: Date.now() });
    Object.defineProperty(input, "files", { configurable: true, value: { 0: archivo, length: 1, item: () => archivo } });
    await act(async () => {
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
    const enviar = [...document.querySelectorAll("button")].find((item) => item.textContent === "Send");
    assert.ok(enviar instanceof HTMLButtonElement);
    await act(async () => {
      enviar.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await act(async () => {
      await new Promise((resolver) => setTimeout(resolver, 40));
    });
    assert.match(texto(), /Photo uploaded successfully/);
    assert.match(texto(), /Your photo already reached the organizer/);
    assert.match(texto(), /Take another/);
    assert.match(texto(), /64% · Partially completed/);
    assert.match(texto(), new RegExp(FRASE_PAGO));
    assert.equal(texto().includes("SECRETO-LAYA"), false);
    assert.equal(lecturas >= 2, true);
  } finally {
    globalThis.fetch = anterior;
    await desmontar();
    limpiarPantalla();
  }
});

test("una foto ya enviada se puede volver a tomar, y dice que llegó", async () => {
  limpiarPantalla();
  const anterior = globalThis.fetch;
  try {
    await abrir(
      tarea({
        estado: "en revisión",
        etapa: "enviada_organizador",
        enviadaEn: "2026-10-05T18:04:00.000Z",
        nota: 64,
        veredicto: "parcial",
      }),
    );
    assert.match(texto(), /Your photo already reached the organizer/);
    assert.match(texto(), /Take another/);
    await act(async () => {
      [...document.querySelectorAll("button")].find((item) => item.textContent === "Take another")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    assert.match(texto(), /Open camera/);
    assert.equal(texto().includes("Your photo already reached the organizer"), false);
  } finally {
    globalThis.fetch = anterior;
    await desmontar();
    limpiarPantalla();
  }
});

test("leerTarea conserva la nota, la etapa y no copia la frase", async () => {
  const fetchImpl: typeof fetch = async () =>
    json({
      tareas: [
        tarea({
          nota: 0,
          veredicto: "insuficiente",
          frase: "SECRETO-LAYA",
          hashPago: "abc",
          contratoEscrow: "C",
        }),
      ],
    });
  const leida = await leerTarea("stand", { miembroId: "" }, { fetch: fetchImpl });
  assert.equal(leida.tarea?.nota, 0);
  assert.equal(leida.tarea?.veredicto, "insuficiente");
  assert.equal("frase" in (leida.tarea ?? {}), false);
  assert.equal(JSON.stringify(leida).includes("SECRETO-LAYA"), false);

  const conEtapa = await leerTarea("stand", { miembroId: "" }, {
    fetch: async () =>
      json({
        tareas: [
          tarea({
            estado: "en revisión",
            etapa: "enviada_organizador",
            enviada_en: "2026-10-05T18:04:00.000Z",
          }),
        ],
      }),
  });
  assert.equal(conEtapa.tarea?.etapa, "enviada_organizador");
  assert.equal(conEtapa.tarea?.enviadaEn, "2026-10-05T18:04:00.000Z");
  assert.equal("contratoEscrow" in (conEtapa.tarea ?? {}), false);
});

function medio(reducido: boolean): () => void {
  const anterior = window.matchMedia.bind(window);
  window.matchMedia = ((consulta: string) => ({
    matches: reducido && consulta.includes("prefers-reduced-motion"),
    media: consulta,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() {
      return false;
    },
  })) as typeof window.matchMedia;
  return () => {
    window.matchMedia = anterior;
  };
}
