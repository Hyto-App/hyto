import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { pedirReintentoRevision } from "@/lib/admin/remoto";
import {
  correrReintento,
  crearMemoriaFondo,
  DEMORA_PRIMER_FONDO_MS,
  esperaFondo,
  ESPERA_SI_OCUPADO_MS,
  MAX_INTENTOS_FONDO,
  PAUSA_FONDO_MS,
  reiniciarReintentoFondo,
} from "@/lib/admin/reintento-fondo";

describe("reintento en segundo plano", { concurrency: false }, () => {
  test("abre una vez, espera, y no pasa de dos corridas", () => {
    const memoria = crearMemoriaFondo();
    let ahora = 0;
    const marcas: number[] = [];
    for (let paso = 0; paso < 8; paso += 1) {
      const espera = esperaFondo("stand", ahora, memoria);
      if (espera === null) break;
      if (espera > 0) {
        ahora += espera;
        continue;
      }
      marcas.push(ahora);
      memoria.enCurso.add("stand");
      memoria.ultimo.set("stand", ahora);
      memoria.intentos.set("stand", (memoria.intentos.get("stand") ?? 0) + 1);
      memoria.enCurso.delete("stand");
    }
    assert.deepEqual(marcas, [DEMORA_PRIMER_FONDO_MS, DEMORA_PRIMER_FONDO_MS + PAUSA_FONDO_MS]);
    assert.equal(marcas.length, MAX_INTENTOS_FONDO);
    assert.equal(esperaFondo("stand", marcas[1] ?? 0, memoria), null);
    assert.equal(esperaFondo("  ", 0, memoria), null);
    memoria.enCurso.add("otra");
    assert.equal(esperaFondo("otra", 0, memoria), ESPERA_SI_OCUPADO_MS);
  });

  test("un clic manual no se duplica y sigue disponible después del tope automático", async () => {
    reiniciarReintentoFondo();
    let posts = 0;
    const pendiente: { soltar: (() => void) | null } = { soltar: null };
    const fetchImpl: typeof fetch = async (input, init) => {
      posts += 1;
      assert.equal(String(input), "/api/revision/stand");
      assert.equal(init?.method, "POST");
      if (!pendiente.soltar) {
        return new Promise((resolve) => {
          pendiente.soltar = () => resolve(json(cuerpo("error"), 500));
        });
      }
      return json({ aviso: "no" }, 500);
    };
    try {
      const primero = correrReintento("stand", "manual", fetchImpl);
      const segundo = await correrReintento("stand", "manual", fetchImpl);
      assert.equal(posts, 1);
      assert.equal(segundo?.ok, false);
      if (segundo && !segundo.ok) assert.match(segundo.aviso, /30 seconds/);
      pendiente.soltar?.();
      assert.equal((await primero)?.ok, false);
      for (let i = 0; i < MAX_INTENTOS_FONDO + 1; i += 1) await correrReintento("stand", "fondo", fetchImpl);
      assert.equal(posts, 1 + MAX_INTENTOS_FONDO);
      const manual = await correrReintento("stand", "manual", fetchImpl);
      assert.equal(manual?.ok, false);
      if (manual && !manual.ok) assert.equal(manual.aviso, "The review could not be retried.");
      assert.equal(posts, 2 + MAX_INTENTOS_FONDO);
    } finally {
      pendiente.soltar?.();
      reiniciarReintentoFondo();
    }
  });

  test("el aviso largo del servidor se muestra y uno corto no", async () => {
    const organizador = await pedirReintentoRevision("stand", {
      fetch: async () => json({ aviso: "Only the organizer reviews." }, 403),
    });
    assert.equal(organizador.ok, false);
    if (!organizador.ok) assert.equal(organizador.aviso, "Only the organizer reviews.");
    const corto = await pedirReintentoRevision("stand", {
      fetch: async () => json({ aviso: "no" }, 500),
    });
    assert.equal(corto.ok, false);
    if (!corto.ok) assert.equal(corto.aviso, "The review could not be retried.");
    const listo = await pedirReintentoRevision("stand", {
      fetch: async (input, init) => {
        assert.equal(String(input), "/api/revision/stand");
        assert.equal(init?.method, "POST");
        return json(cuerpo("scout"));
      },
    });
    assert.equal(listo.ok, true);
    if (listo.ok) assert.equal(listo.detalle.tarea.frase, "Banner ready.");
  });
});

function cuerpo(origen: "error" | "scout") {
  return {
    tarea: {
      id: "stand",
      titulo: "Set up the booth",
      tipo: "trabajo",
      monto: "20",
      estado: "en revisión",
      origen,
      veredicto: origen === "error" ? "insuficiente" : "parcial",
      frase: origen === "error" ? "The AI did not respond in time" : "Banner ready.",
    },
    foto: null,
    contratoEscrow: null,
    wallet: "GORGANIZADOR",
  };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
