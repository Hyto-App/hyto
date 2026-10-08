import "../../tests/integracion/dom-global";
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { createElement, useState } from "react";
import { act } from "react";
import { Bandeja } from "@/components/admin/Bandeja";
import { Revision } from "@/components/admin/Revision";
import { useNovedadesEvento } from "@/components/admin/usarNovedades";
import { desmontar, escribir, montar, pulsar, texto } from "../../tests/integracion/montar";

describe("pantalla en vivo", { concurrency: false }, () => {
  before(() => {
    (globalThis as { __HYTO_SONDEO_MS?: number }).__HYTO_SONDEO_MS = 25;
  });

  after(() => {
    delete (globalThis as { __HYTO_SONDEO_MS?: number }).__HYTO_SONDEO_MS;
  });

  test("la bandeja actualiza el veredicto sin soltar la fila abierta ni el scroll", async () => {
    let sondeos = 0;
    const espera: { soltar: ((respuesta: Response | PromiseLike<Response>) => void) | null } = { soltar: null };
    let fase: "inicial" | "nueva" = "inicial";
    const anterior = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.startsWith("/api/eventos/evt/novedades")) {
        sondeos += 1;
        if (sondeos === 1) return json(fotoDe("a", "cumplió", "guion"));
        assert.equal(new Headers(init?.headers).get("if-none-match"), `"${sello("c")}"`);
        return new Promise<Response>((resolver) => {
          espera.soltar = resolver;
        });
      }
      if (url.startsWith("/api/tareas")) return json({ tareas: filas });
      if (url.startsWith("/api/proyectos")) return json({ proyecto: { nombre: "Feria" } });
      if (url.includes("/api/revision/stand")) return revision(stand(fase));
      if (url.includes("/api/revision/registro")) return revision(registro());
      return new Response("no", { status: 404 });
    }) as typeof fetch;
    try {
      await montar(createElement(Bandeja as (props: { proyectoId?: string }) => ReturnType<typeof Bandeja>, { proyectoId: "evt" }));
      await esperar(() => texto().includes("Set up the booth") && sondeos >= 2);
      await pulsar("Check-in list");
      const main = document.querySelector("main");
      assert.ok(main);
      main.scrollTop = 80;
      fase = "nueva";
      espera.soltar?.(json(fotoDe("b", "insuficiente", "scout")));
      await esperar(() => texto().includes("Updated just now") && texto().includes("Insufficient"));
      assert.equal(document.querySelector("h3")?.textContent, "Check-in list");
      const fila = [...document.querySelectorAll("button")].find((item) => item.textContent?.includes("Check-in list"));
      assert.equal(fila?.className.includes("is-on"), true);
      assert.equal(document.querySelector("main")?.scrollTop, 80);
      assert.equal(texto().includes("Loading…"), false);
    } finally {
      globalThis.fetch = anterior;
      await desmontar();
    }
  });

  test("la revisión muestra la nota nueva y no borra el monto que se está escribiendo", async () => {
    let sondeos = 0;
    const espera: { soltar: ((respuesta: Response | PromiseLike<Response>) => void) | null } = { soltar: null };
    let fase: "inicial" | "nueva" = "inicial";
    const anterior = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.startsWith("/api/eventos/evt/novedades")) {
        sondeos += 1;
        if (sondeos === 1) return json(marcaComida("a", "Receipt is blurry."));
        assert.match(String(init && "headers" in init ? new Headers(init.headers).get("if-none-match") : ""), /"[a-f0-9]{32}"/);
        return new Promise<Response>((resolver) => {
          espera.soltar = resolver;
        });
      }
      if (url.startsWith("/api/tareas")) return json({ tareas: [{ id: "comida", proyectoId: "evt", hashPago: null, contratoEscrow: null }] });
      return revision(comida(fase), "/api/evidencias/ev-comida/foto");
    }) as typeof fetch;
    try {
      await montar(createElement(Revision, { tareaId: "comida", eventoId: "evt" }));
      await esperar(() => (document.querySelector("#monto-confirmado") as HTMLInputElement | null)?.value === "9");
      await escribir("#monto-confirmado", "12");
      const detalles = document.querySelector("details");
      assert.ok(detalles);
      detalles.open = true;
      await esperar(() => sondeos >= 2);
      fase = "nueva";
      espera.soltar?.(json(marcaComida("b", "Amount and date are visible.")));
      await esperar(() => texto().includes("Amount and date are visible.") && texto().includes("Updated just now"));
      assert.equal((document.querySelector("#monto-confirmado") as HTMLInputElement).value, "12");
      assert.equal(document.querySelector("details")?.open, true);
      assert.equal(texto().includes("Loading…"), false);
    } finally {
      globalThis.fetch = anterior;
      await desmontar();
    }
  });

  test("con la sesión vencida, recuperar el foco no vuelve a sondear", async () => {
    let sondeos = 0;
    const anterior = globalThis.fetch;
    globalThis.fetch = (async () => {
      sondeos += 1;
      return json({ aviso: "Sign in to continue." }, 401);
    }) as typeof fetch;
    try {
      await montar(createElement(Sonda, { oculto: () => false }));
      await esperar(() => sondeos === 1);
      await act(async () => {
        await new Promise((resolver) => setTimeout(resolver, 80));
      });
      assert.equal(sondeos, 1);
      await act(async () => {
        document.dispatchEvent(new Event("visibilitychange"));
        window.dispatchEvent(new Event("focus"));
        await new Promise((resolver) => setTimeout(resolver, 50));
      });
      assert.equal(sondeos, 1);
    } finally {
      globalThis.fetch = anterior;
      await desmontar();
    }
  });

  test("una pestaña oculta no sondea y al volver pide los cambios", async () => {
    let sondeos = 0;
    let oculto = true;
    const anterior = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      if (String(input).includes("/novedades")) {
        sondeos += 1;
        return json({
          cursor: sello("c"),
          cambios: [
            {
              tareaId: "stand",
              estado: "en revisión",
              evidenciaId: "ev",
              creadaEn: "2026-10-02T08:00:00.000Z",
              veredicto: "cumplió",
              origen: "scout",
              sello: sello("b"),
            },
          ],
        });
      }
      return new Response("no", { status: 404 });
    }) as typeof fetch;
    try {
      await montar(createElement(Sonda, { oculto: () => oculto }));
      await act(async () => {
        await new Promise((resolver) => setTimeout(resolver, 70));
      });
      assert.equal(sondeos, 0);
      oculto = false;
      await act(async () => {
        window.dispatchEvent(new Event("focus"));
        await new Promise((resolver) => setTimeout(resolver, 30));
      });
      assert.equal(sondeos >= 1, true);
    } finally {
      globalThis.fetch = anterior;
      await desmontar();
    }
  });

  test("un error de red no pisa la pantalla y el siguiente sí avisa", async () => {
    let sondeos = 0;
    const anterior = globalThis.fetch;
    globalThis.fetch = (async () => {
      sondeos += 1;
      if (sondeos === 1) return new Response("no", { status: 503 });
      return json({
        cursor: sello("d"),
        cambios: [
          {
            tareaId: "stand",
            estado: "en revisión",
            evidenciaId: "ev",
            creadaEn: "2026-10-02T08:00:00.000Z",
            veredicto: "parcial",
            origen: "scout",
            sello: sello("e"),
          },
        ],
      });
    }) as typeof fetch;
    try {
      await montar(createElement(Sonda, { oculto: () => false }));
      await esperar(() => texto().includes("Updated just now"));
      assert.equal(sondeos >= 2, true);
      assert.equal(texto().includes("Could not load"), false);
    } finally {
      globalThis.fetch = anterior;
      await desmontar();
    }
  });
});

function Sonda({ oculto }: { oculto: () => boolean }) {
  const [aviso, setAviso] = useState("waiting");
  useNovedadesEvento({
    proyectoId: "evt",
    intervaloMs: 20,
    oculto,
    exigirFoto: false,
    tareas: [{ id: "stand", estado: "pendiente", veredicto: null, origen: null }],
    alCambiar: async () => {
      setAviso("Updated just now");
      return { ok: true, avisar: true };
    },
  });
  return createElement("p", null, aviso);
}

const filas = [
  { id: "stand", proyectoId: "evt", hashPago: null, contratoEscrow: null },
  { id: "registro", proyectoId: "evt", hashPago: null, contratoEscrow: null },
];

function stand(fase: "inicial" | "nueva") {
  return tareaAdmin({
    id: "stand",
    titulo: "Set up the booth",
    veredicto: fase === "nueva" ? "insuficiente" : "cumplió",
    origen: fase === "nueva" ? "scout" : "guion",
    frase: fase === "nueva" ? "The banner is missing." : "Table set up.",
  });
}

function registro() {
  return tareaAdmin({
    id: "registro",
    titulo: "Check-in list",
    veredicto: "parcial",
    origen: "guion",
    frase: "The list is short.",
  });
}

function comida(fase: "inicial" | "nueva") {
  return tareaAdmin({
    id: "comida",
    titulo: "Team meal",
    tipo: "reembolso",
    monto: "15",
    tope: "15",
    veredicto: "parcial",
    origen: "stub",
    frase: fase === "nueva" ? "Amount and date are visible." : "Receipt is blurry.",
    montoRevisado: "9",
    fecha: "2026-10-01",
  });
}

function tareaAdmin(parcial: Record<string, unknown>) {
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
    frase: "Ready",
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

function revision(tarea: Record<string, unknown>, foto = "/api/evidencias/ev-stand/foto") {
  return json({ tarea, foto, contratoEscrow: null, walletCobro: null, wallet: "GORGANIZADOR" });
}

function fotoDe(letra: string, veredicto: string, origen: string) {
  return {
    cursor: letra === "a" ? sello("c") : sello("d"),
    hasta: "2026-10-02T08:00:00.000Z",
    cambios: [
      marca("stand", letra === "a" ? "a" : "b", veredicto, origen, "ev-stand"),
      marca("registro", "f", "parcial", "guion", "ev-registro"),
    ],
  };
}

function marcaComida(letra: string, _frase: string) {
  return {
    cursor: letra === "a" ? sello("c") : sello("d"),
    hasta: "2026-10-02T08:00:00.000Z",
    cambios: [marca("comida", letra, "parcial", "stub", "ev-comida")],
  };
}

function marca(tareaId: string, letra: string, veredicto: string, origen: string, evidenciaId: string) {
  return {
    tareaId,
    estado: "en revisión",
    evidenciaId,
    creadaEn: "2026-10-02T08:00:00.000Z",
    veredicto,
    origen,
    sello: sello(letra),
  };
}

function sello(letra: string): string {
  return letra.repeat(32);
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function esperar(listo: () => boolean): Promise<void> {
  for (let i = 0; i < 40; i += 1) {
    if (listo()) return;
    await act(async () => {
      await new Promise((resolver) => setTimeout(resolver, 20));
    });
  }
  throw new Error(`Timed out. Screen: ${texto()} sondeos pending`);
}
