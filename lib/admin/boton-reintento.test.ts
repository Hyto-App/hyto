import "../../tests/integracion/dom-global";
import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { act } from "react";
import { Bandeja } from "@/components/admin/Bandeja";
import { Revision } from "@/components/admin/Revision";
import { reiniciarReintentoFondo } from "@/lib/admin/reintento-fondo";
import { desmontar, montar, pulsar, texto } from "../../tests/integracion/montar";

test("la bandeja muestra un botón de reintento en cada revisión fallida", async () => {
  reiniciarReintentoFondo();
  const posts: string[] = [];
  const anterior = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (init?.method === "POST") {
      posts.push(url);
      return json({
        tarea: tarea({ origen: "scout", veredicto: "parcial", frase: "Banner ready." }),
        foto: null,
      });
    }
    if (url === "/api/tareas") return json({ tareas: [{ id: "stand" }, { id: "comida" }] });
    if (url === "/api/proyectos") return json({ proyecto: { nombre: "ZEEK" } });
    if (url.startsWith("/api/revision/comida")) {
      return json({
        tarea: tarea({
          id: "comida",
          titulo: "Team meal",
          tipo: "reembolso",
          origen: "scout",
          veredicto: "cumplió",
          frase: "Receipt visible.",
        }),
        foto: null,
      });
    }
    if (url.startsWith("/api/revision/")) {
      return json({
        tarea: tarea({ origen: "error", veredicto: "insuficiente", frase: "The AI did not respond in time" }),
        foto: null,
      });
    }
    return json({ aviso: "no" }, 404);
  }) as typeof fetch;
  try {
    await montar(createElement(Bandeja));
    await act(async () => {
      await new Promise((resolver) => setTimeout(resolver, 40));
    });
    const boton = botonReintento();
    assert.ok(boton);
    assert.equal(boton?.className.includes("hyto-btn-line"), true);
    assert.equal(boton?.parentElement?.closest("button"), null);
    await pulsar("Team meal");
    assert.equal(botonReintento(), undefined);
    await pulsar("Set up the booth");
    await pulsar("Retry review");
    await act(async () => {
      await new Promise((resolver) => setTimeout(resolver, 30));
    });
    assert.deepEqual(posts, ["/api/revision/stand"]);
    assert.match(texto(), /Banner ready/);
    assert.equal(botonReintento(), undefined);
  } finally {
    globalThis.fetch = anterior;
    await desmontar();
    reiniciarReintentoFondo();
  }
});

test("el botón avisa si el reintento falla y muestra que está cargando", async () => {
  reiniciarReintentoFondo();
  const pendiente: { soltar: ((respuesta: Response) => void) | null } = { soltar: null };
  const urls: string[] = [];
  const anterior = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    urls.push(`${init?.method ?? "GET"} ${url}`);
    if (init?.method === "POST") {
      return new Promise((resolve) => {
        pendiente.soltar = resolve;
      });
    }
    if (url === "/api/tareas") return json({ tareas: [{ id: "stand" }] });
    return json({
      tarea: tarea({ origen: "error", veredicto: null, frase: "The AI did not respond in time" }),
      foto: null,
      contratoEscrow: null,
      wallet: "GORGANIZADOR",
    });
  }) as typeof fetch;
  try {
    await montar(createElement(Revision, { tareaId: "stand" }));
    await act(async () => {
      await new Promise((resolver) => setTimeout(resolver, 30));
    });
    const boton = botonReintento();
    assert.ok(boton);
    assert.equal(boton?.disabled, false);
    await pulsar("Retry review");
    assert.equal(botonReintento()?.textContent, "Retrying…");
    assert.equal(botonReintento()?.disabled, true);
    assert.equal(urls.some((url) => url.startsWith("POST /api/firma")), false);
    await act(async () => {
      pendiente.soltar?.(json({ aviso: "Only the organizer reviews." }, 403));
      await new Promise((resolver) => setTimeout(resolver, 30));
    });
    assert.match(texto(), /Only the organizer reviews/);
    assert.equal(botonReintento()?.textContent, "Retry review");
    assert.equal(botonReintento()?.disabled, false);
  } finally {
    pendiente.soltar?.(json({ aviso: "no" }, 500));
    globalThis.fetch = anterior;
    await desmontar();
    reiniciarReintentoFondo();
  }
});

test("una tarea pagada o con presupuesto bloqueado no ofrece reintentar la revisión", async () => {
  reiniciarReintentoFondo();
  const anterior = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url === "/api/tareas") return json({ tareas: [{ id: "stand" }] });
    return json({
      tarea: tarea({ origen: "error", estado: "pagado", veredicto: null, frase: "The AI did not respond in time" }),
      foto: null,
      contratoEscrow: "CSTAND",
      wallet: "GORGANIZADOR",
    });
  }) as typeof fetch;
  try {
    await montar(createElement(Revision, { tareaId: "stand" }));
    await act(async () => {
      await new Promise((resolver) => setTimeout(resolver, 30));
    });
    assert.equal(botonReintento(), undefined);
  } finally {
    globalThis.fetch = anterior;
    await desmontar();
    reiniciarReintentoFondo();
  }
});

function botonReintento(): HTMLButtonElement | undefined {
  return [...document.querySelectorAll("button")].find((item) => item.textContent?.includes("Retry")) as HTMLButtonElement | undefined;
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
