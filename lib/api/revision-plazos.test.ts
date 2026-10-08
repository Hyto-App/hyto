import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test, { describe } from "node:test";
import { publicarEvidenciaHttp } from "@/lib/api/evidencias";
import {
  esperarCorte,
  HOLGURA_TOPE_MS,
  MARGEN_GUARDADO_MS,
  MAX_DURACION_SUBIDA_MS,
  planRevision,
  PLAZO_RESPUESTA_MS,
  usaCorte,
} from "@/lib/api/plazo-revision";
import { ESPERA_VEREDICTO_MS, revisionVencida, veredictoAlLeer } from "@/lib/api/revision-vencida";
import { listarTareasHttp } from "@/lib/api/tareas";
import { crearFotosMemoria } from "@/lib/blob/fotos";
import { crearMemoria } from "@/lib/db/memoria";
import { asegurarSemilla } from "@/lib/db/semilla";
import type { EvidenciaFila } from "@/lib/db/tipos";
import { jpegDePrueba, tokenDePrueba } from "@/lib/evidencia/muestras";
import { reiniciarTokensEvidencia } from "@/lib/evidencia/token";
import { PRESUPUESTO_REVISION_MS } from "@/lib/revision/reintento";

const ACTOR = { usuarioId: "voluntario-1", rol: "voluntario" as const };

test("the upload route's maxDuration matches the budget the review is planned against", () => {
  const ruta = readFileSync(new URL("../../app/api/evidencias/route.ts", import.meta.url), "utf8");
  const declarado = /export const maxDuration = (\d+);/.exec(ruta);
  assert.ok(declarado);
  assert.equal(Number(declarado[1]) * 1000, MAX_DURACION_SUBIDA_MS);
  assert.match(ruta, /inicio,/);
});

test("the review budget and the hard stop count from the request, not from the response", () => {
  const inicio = 1_000_000;
  const alEntrar = planRevision(inicio, inicio);
  assert.equal(alEntrar.topeFondoMs, MAX_DURACION_SUBIDA_MS - MARGEN_GUARDADO_MS);
  assert.equal(alEntrar.presupuestoMs, PRESUPUESTO_REVISION_MS);

  const tarde = planRevision(inicio, inicio + 20_000);
  assert.equal(tarde.topeFondoMs, MAX_DURACION_SUBIDA_MS - MARGEN_GUARDADO_MS - 20_000);
  assert.equal(tarde.presupuestoMs, tarde.topeFondoMs - HOLGURA_TOPE_MS);
  assert.ok(20_000 + tarde.topeFondoMs + MARGEN_GUARDADO_MS <= MAX_DURACION_SUBIDA_MS);

  assert.deepEqual(planRevision(inicio, inicio + MAX_DURACION_SUBIDA_MS), { presupuestoMs: 0, topeFondoMs: 0 });
});

test("the 2.8 s cutoff applies when Gemini describes the photo", () => {
  assert.equal(PLAZO_RESPUESTA_MS, 2_800);
  assert.equal(usaCorte({ claveGroq: null, claveGemini: "clave", layaUrl: null }, false), true);
  assert.equal(usaCorte({ claveGroq: "clave", claveGemini: null, layaUrl: null }, false), true);
  assert.equal(usaCorte({ claveGroq: null, claveGemini: "  ", layaUrl: null }, false), false);
  assert.equal(usaCorte({ claveGroq: null, claveGemini: null, layaUrl: null }, false), false);
  assert.equal(usaCorte({ claveGroq: null, claveGemini: "clave", layaUrl: null }, true), false);
  assert.equal(usaCorte({ claveGroq: null, claveGemini: null, layaUrl: "https://laya.example" }, true), true);
});

test("a rejection inside the window is a failure, not 'still running'", async () => {
  assert.deepEqual(await esperarCorte(Promise.resolve(7), 50), { estado: "listo", valor: 7 });
  const error = new Error("groq dropped");
  assert.deepEqual(await esperarCorte(Promise.reject(error), 50), { estado: "fallo", error });
  assert.deepEqual(await esperarCorte(new Promise(() => undefined), 10), { estado: "en_curso" });
  assert.deepEqual(await esperarCorte(Promise.reject(error), null), { estado: "fallo", error });
});

describe("upload", { concurrency: false }, () => {
  test("a review that fails fast stores the error verdict before the response", async () => {
    const { almacen, fotos } = await preparar();
    let fondo = 0;
    const respuesta = await silenciar(async () =>
      publicarEvidenciaHttp(await pedidoSubida(), {
        almacen,
        fotos,
        actor: ACTOR,
        revisarTarea: async () => {
          throw new Error("groq dropped");
        },
        continuar: () => {
          fondo += 1;
        },
      }),
    );
    assert.equal(respuesta.status, 201);
    assert.equal(fondo, 0);
    const evidencia = await almacen.ultimaEvidencia("stand");
    assert.ok(evidencia);
    const fila = await almacen.veredictoDe(evidencia.id);
    assert.equal(fila?.origen, "error");
    assert.equal(fila?.choice, "proveedor");
  });

  test("with only Gemini, the response leaves at the cutoff and the background stores a row before the deadline", async () => {
    const { almacen, fotos } = await preparar();
    const entorno = guardarEntorno(["GROQ_API_KEY", "GEMINI_API_KEY", "LAYA_URL"]);
    delete process.env.GROQ_API_KEY;
    delete process.env.LAYA_URL;
    process.env.GEMINI_API_KEY = "clave-de-prueba";
    const original = globalThis.fetch;
    let llamadas = 0;
    globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
      llamadas += 1;
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
      });
    }) as typeof fetch;
    let fondo: Promise<void> | null = null;
    // 47 s of the 60 s are already gone: 7 s to the hard stop, 5 s for the review itself.
    const inicio = Date.now() - 47_000;
    try {
      const antes = Date.now();
      const respuesta = await silenciar(async () =>
        publicarEvidenciaHttp(await pedidoSubida(), {
          almacen,
          fotos,
          actor: ACTOR,
          inicio,
          continuar: (trabajo) => {
            fondo = trabajo;
          },
        }),
      );
      const espera = Date.now() - antes;
      assert.equal(respuesta.status, 201);
      assert.ok(espera >= PLAZO_RESPUESTA_MS - 50, `answered after ${espera} ms`);
      assert.ok(espera < PLAZO_RESPUESTA_MS + 1_500, `answered after ${espera} ms`);
      const evidencia = await almacen.ultimaEvidencia("stand");
      assert.ok(evidencia);
      assert.equal(await almacen.veredictoDe(evidencia.id), null);
      assert.ok(fondo, "the rest of the review runs in after()");

      await silenciar(() => fondo!);
      assert.ok(Date.now() - inicio < MAX_DURACION_SUBIDA_MS - MARGEN_GUARDADO_MS + 500);
      const fila = await almacen.veredictoDe(evidencia.id);
      assert.equal(fila?.origen, "error");
      assert.equal(fila?.choice, "tiempo");
      assert.ok(llamadas >= 1);
    } finally {
      globalThis.fetch = original;
      entorno();
    }
  });
});

test("a photo in review past the upload's lifetime with no row is stale", () => {
  const ahora = Date.parse("2026-10-07T12:00:00.000Z");
  const vieja = { blobId: "blob/real", creadaEn: new Date(ahora - ESPERA_VEREDICTO_MS - 1).toISOString() };
  const nueva = { blobId: "blob/real", creadaEn: new Date(ahora - ESPERA_VEREDICTO_MS + 1_000).toISOString() };
  const enRevision = { estado: "en revisión" as const };
  assert.equal(ESPERA_VEREDICTO_MS, 60_000);
  assert.equal(revisionVencida(enRevision, vieja, null, ahora), true);
  assert.equal(revisionVencida(enRevision, nueva, null, ahora), false);
  assert.equal(revisionVencida({ estado: "pendiente" as const }, vieja, null, ahora), false);
  assert.equal(revisionVencida({ estado: "pagado" as const }, vieja, null, ahora), false);
  assert.equal(revisionVencida(enRevision, { ...vieja, blobId: "ejemplo/stand.jpg" }, null, ahora), false);
  assert.equal(revisionVencida(enRevision, { ...vieja, creadaEn: "not a date" }, null, ahora), false);
  assert.equal(revisionVencida(enRevision, null, null, ahora), false);
});

test("reading a stale photo stores a timeout verdict, and My tasks stops saying Mile is still checking", async () => {
  const almacen = crearMemoria();
  await asegurarSemilla(almacen);
  await almacen.crearEvidencia(evidenciaSuelta("foto-vieja", "bienvenida", new Date(Date.now() - 61_000).toISOString()));
  await almacen.actualizarTarea("bienvenida", { estado: "en revisión" });
  const cuerpo = (await (
    await silenciar(() => listarTareasHttp(almacen, { usuarioId: "voluntario-3", demo: false }, "mias"))
  ).json()) as { tareas: { id: string; etapa: string | null; revisionFallida: boolean; nota: number | null }[] };
  const tarea = cuerpo.tareas.find((item) => item.id === "bienvenida");
  assert.equal(tarea?.revisionFallida, true);
  assert.equal(tarea?.nota, null);
  assert.notEqual(tarea?.etapa, "en_revision");
  const fila = await almacen.veredictoDe("foto-vieja");
  assert.equal(fila?.origen, "error");
  assert.equal(fila?.choice, "tiempo");
  assert.equal((await almacen.leerTarea("bienvenida"))?.estado, "en revisión");
});

test("a stored verdict is never replaced on read, and a failed write leaves no row for the next read", async () => {
  const almacen = crearMemoria();
  await asegurarSemilla(almacen);
  const vieja = new Date(Date.now() - 120_000).toISOString();
  const evidencia = evidenciaSuelta("foto-con-nota", "bienvenida", vieja);
  await almacen.crearEvidencia(evidencia);
  const tarea = { id: "bienvenida", estado: "en revisión" as const };
  const nota = {
    id: evidencia.id,
    evidenciaId: evidencia.id,
    tareaId: "bienvenida",
    veredicto: "cumplió" as const,
    frase: "ok",
    textoScout: "ok",
    choice: "trabajo",
    noul: "si" as const,
    score: "90",
    origen: "scout" as const,
  };
  await almacen.guardarVeredicto(nota);
  assert.equal((await veredictoAlLeer(almacen, tarea, evidencia))?.score, "90");

  const otra = evidenciaSuelta("foto-sin-base", "bienvenida", vieja);
  const caida = {
    ...almacen,
    async guardarVeredicto() {
      throw new Error("neon dropped");
    },
  };
  assert.equal(await silenciar(() => veredictoAlLeer(caida, tarea, otra)), null);
  assert.equal(await almacen.veredictoDe(otra.id), null);
});

async function preparar() {
  reiniciarTokensEvidencia();
  const almacen = crearMemoria();
  await asegurarSemilla(almacen);
  return { almacen, fotos: crearFotosMemoria() };
}

async function pedidoSubida(): Promise<Request> {
  const cuerpo = new FormData();
  cuerpo.set("tareaId", "stand");
  cuerpo.set("token", tokenDePrueba("voluntario-1", "stand"));
  cuerpo.set("capturadaEn", new Date().toISOString());
  cuerpo.set("foto", new Blob([await jpegDePrueba()], { type: "image/jpeg" }), "evidencia.jpg");
  return new Request("http://local/api/evidencias", { method: "POST", body: cuerpo });
}

function evidenciaSuelta(id: string, tareaId: string, creadaEn: string): EvidenciaFila {
  return { id, tareaId, blobId: `blob/${id}`, monto: null, montoConfirmado: null, fecha: null, creadaEn };
}

function guardarEntorno(nombres: string[]): () => void {
  const previos = new Map(nombres.map((nombre) => [nombre, process.env[nombre]]));
  return () => {
    for (const [nombre, valor] of previos) {
      if (valor === undefined) delete process.env[nombre];
      else process.env[nombre] = valor;
    }
  };
}

async function silenciar<T>(trabajo: () => Promise<T>): Promise<T> {
  const previo = console.error;
  console.error = () => undefined;
  try {
    return await trabajo();
  } finally {
    console.error = previo;
  }
}
