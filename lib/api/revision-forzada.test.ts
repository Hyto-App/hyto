import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test, { describe } from "node:test";
import { cerrarRevisionEnFondo } from "@/lib/api/evidencias";
import {
  AVISO_SIN_TIEMPO,
  leerRevisionHttp,
  MAX_DURACION_REVISION_MS,
  MIN_PRESUPUESTO_FORZADO_MS,
  presupuestoForzado,
  reiniciarCandadosRevision,
} from "@/lib/api/revision";
import { ESPERA_VEREDICTO_MS, veredictoAlLeer } from "@/lib/api/revision-vencida";
import { crearFotosMemoria } from "@/lib/blob/fotos";
import { crearMemoria } from "@/lib/db/memoria";
import { asegurarSemilla } from "@/lib/db/semilla";
import type { EvidenciaFila } from "@/lib/db/tipos";
import { desdeGuion } from "@/lib/revision/armar";
import { PRESUPUESTO_REVISION_MS } from "@/lib/revision/reintento";

type Vista = { tarea: { origen: string | null; codigo: string | null } };

test("the forced review route's maxDuration matches the budget it is planned against", () => {
  const ruta = readFileSync(new URL("../../app/api/revision/[id]/route.ts", import.meta.url), "utf8");
  const declarado = /export const maxDuration = (\d+);/.exec(ruta);
  assert.ok(declarado);
  assert.equal(Number(declarado[1]) * 1000, MAX_DURACION_REVISION_MS);
  assert.match(ruta, /const inicio = Date\.now\(\);/);
  assert.match(ruta, /idiomaDePeticion\(request\), inicio\)/);
});

test("the forced budget counts from the request and leaves room to store the verdict", () => {
  const inicio = 5_000_000;
  assert.equal(presupuestoForzado(inicio, inicio), PRESUPUESTO_REVISION_MS);
  assert.equal(presupuestoForzado(inicio, inicio + 40_000), MAX_DURACION_REVISION_MS - 40_000 - 8_000);
  assert.equal(presupuestoForzado(inicio, inicio + MAX_DURACION_REVISION_MS), 0);
});

describe("forced review", { concurrency: false }, () => {
  test("with too little time left it does not start, does not call the AI, and does not take the lock", async () => {
    reiniciarCandadosRevision();
    const { almacen, fotos } = await preparar();
    const entorno = guardarEntorno(["GROQ_API_KEY", "GEMINI_API_KEY", "LAYA_URL"]);
    process.env.GROQ_API_KEY = "clave-de-prueba";
    const original = globalThis.fetch;
    let llamadas = 0;
    globalThis.fetch = (async () => {
      llamadas += 1;
      return new Response("no", { status: 500 });
    }) as typeof fetch;
    try {
      const inicio = Date.now() - (MAX_DURACION_REVISION_MS - 8_000 - MIN_PRESUPUESTO_FORZADO_MS + 1_000);
      const respuesta = await leerRevisionHttp(almacen, fotos, "stand", true, "", "en", inicio);
      assert.equal(respuesta.status, 503);
      assert.equal(((await respuesta.json()) as { aviso: string }).aviso, AVISO_SIN_TIEMPO);
      assert.equal(llamadas, 0);
      assert.equal(await almacen.veredictoDe("ev-forzada"), null);

      delete process.env.GROQ_API_KEY;
      const luego = await silenciar(() => leerRevisionHttp(almacen, fotos, "stand", true, "", "en", Date.now()));
      assert.equal(luego.status, 200, "the lock was not taken by the refused call");
    } finally {
      globalThis.fetch = original;
      entorno();
      reiniciarCandadosRevision();
    }
  });

  test("a failed verdict write stores an error row and returns the review JSON, not a 503", async () => {
    reiniciarCandadosRevision();
    const { almacen, fotos } = await preparar();
    const entorno = guardarEntorno(["GROQ_API_KEY", "GEMINI_API_KEY", "LAYA_URL"]);
    delete process.env.GROQ_API_KEY;
    delete process.env.GEMINI_API_KEY;
    let escrituras = 0;
    const flaky = {
      ...almacen,
      async guardarVeredicto(veredicto: Parameters<typeof almacen.guardarVeredicto>[0]) {
        escrituras += 1;
        if (escrituras === 1) throw new Error("neon dropped");
        return almacen.guardarVeredicto(veredicto);
      },
    };
    try {
      const respuesta = await silenciar(() => leerRevisionHttp(flaky, fotos, "stand", true, "", "en", Date.now()));
      assert.equal(respuesta.status, 200);
      const vista = (await respuesta.json()) as Vista;
      assert.equal(vista.tarea.origen, "error");
      assert.equal(vista.tarea.codigo, "proveedor");
      assert.equal(escrituras, 2);
    } finally {
      entorno();
      reiniciarCandadosRevision();
    }
  });

  test("a photo that cannot be read stores an error row and returns the review JSON", async () => {
    reiniciarCandadosRevision();
    const { almacen, fotos } = await preparar();
    const rotas = {
      ...fotos,
      async leer(): Promise<never> {
        throw new Error("blob unavailable");
      },
    };
    try {
      const respuesta = await silenciar(() => leerRevisionHttp(almacen, rotas, "stand", true, "", "en", Date.now()));
      assert.equal(respuesta.status, 200);
      assert.equal(((await respuesta.json()) as Vista).tarea.origen, "error");
      assert.equal((await almacen.veredictoDe("ev-forzada"))?.origen, "error");
    } finally {
      reiniciarCandadosRevision();
    }
  });

  test("the review gets the time left in the function, not a fixed 45 s", async () => {
    reiniciarCandadosRevision();
    const { almacen, fotos } = await preparar();
    const entorno = guardarEntorno(["GROQ_API_KEY", "GEMINI_API_KEY", "LAYA_URL"]);
    process.env.GROQ_API_KEY = "clave-de-prueba";
    delete process.env.GEMINI_API_KEY;
    delete process.env.LAYA_URL;
    const original = globalThis.fetch;
    globalThis.fetch = (async (_url: unknown, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
      })) as typeof fetch;
    // 46 s are gone: 60 − 46 − 8 = 6 s for Groq, instead of a 20 s attempt.
    const inicio = Date.now() - 46_000;
    try {
      const antes = Date.now();
      const respuesta = await silenciar(() => leerRevisionHttp(almacen, fotos, "stand", true, "", "en", inicio));
      const espera = Date.now() - antes;
      assert.equal(respuesta.status, 200);
      assert.ok(espera < 9_000, `the review took ${espera} ms`);
      assert.ok(Date.now() - inicio < MAX_DURACION_REVISION_MS - 5_000);
      const vista = (await respuesta.json()) as Vista;
      assert.equal(vista.tarea.origen, "error");
      assert.equal(vista.tarea.codigo, "tiempo");
    } finally {
      globalThis.fetch = original;
      entorno();
      reiniciarCandadosRevision();
    }
  });
});

describe("cause 5: both background writes fail", () => {
  test("no row is left, and the first read past ESPERA_VEREDICTO_MS stores the timeout row", async () => {
    const almacen = crearMemoria();
    await asegurarSemilla(almacen);
    const creadaEn = "2026-10-08T01:00:00.000Z";
    const evidencia = evidenciaSuelta("ev-sin-base", "bienvenida", creadaEn);
    await almacen.crearEvidencia(evidencia);
    await almacen.actualizarTarea("bienvenida", { estado: "en revisión" });
    let escrituras = 0;
    const caida = {
      ...almacen,
      async guardarVeredicto(): Promise<void> {
        escrituras += 1;
        throw new Error("neon dropped");
      },
    };
    await silenciar(() => cerrarRevisionEnFondo(caida, evidencia.id, "bienvenida", Promise.resolve(desdeGuion("trabajo", null)), 5_000));
    assert.equal(escrituras, 2);
    assert.equal(await almacen.veredictoDe(evidencia.id), null);

    const tarea = { id: "bienvenida", estado: "en revisión" as const };
    const enviada = Date.parse(creadaEn);
    assert.equal(await veredictoAlLeer(almacen, tarea, evidencia, enviada + ESPERA_VEREDICTO_MS - 1), null);
    assert.equal(await almacen.veredictoDe(evidencia.id), null);

    const fila = await silenciar(() => veredictoAlLeer(almacen, tarea, evidencia, enviada + ESPERA_VEREDICTO_MS + 1));
    assert.equal(fila?.origen, "error");
    assert.equal(fila?.choice, "tiempo");
    assert.equal((await almacen.veredictoDe(evidencia.id))?.choice, "tiempo");
  });

  test("a failed write on read returns null, and the next read retries and stores the row", async () => {
    const almacen = crearMemoria();
    await asegurarSemilla(almacen);
    const creadaEn = "2026-10-08T01:00:00.000Z";
    const evidencia = evidenciaSuelta("ev-reintento", "bienvenida", creadaEn);
    await almacen.crearEvidencia(evidencia);
    const tarea = { id: "bienvenida", estado: "en revisión" as const };
    const tarde = Date.parse(creadaEn) + ESPERA_VEREDICTO_MS + 5_000;
    let fallas = 0;
    const caida = {
      ...almacen,
      async guardarVeredicto(): Promise<void> {
        fallas += 1;
        throw new Error("neon dropped");
      },
    };
    assert.equal(await silenciar(() => veredictoAlLeer(caida, tarea, evidencia, tarde)), null);
    assert.equal(fallas, 1);
    assert.equal(await almacen.veredictoDe(evidencia.id), null);

    const fila = await silenciar(() => veredictoAlLeer(almacen, tarea, evidencia, tarde + 1_000));
    assert.equal(fila?.origen, "error");
    assert.equal(fila?.choice, "tiempo");
  });
});

async function preparar() {
  const almacen = crearMemoria();
  await asegurarSemilla(almacen);
  const fotos = crearFotosMemoria();
  const blobId = await fotos.guardar("evidencia.jpg", new Blob([Uint8Array.from([1])], { type: "image/jpeg" }));
  await almacen.crearEvidencia({
    id: "ev-forzada",
    tareaId: "stand",
    blobId,
    monto: null,
    montoConfirmado: null,
    fecha: null,
    creadaEn: new Date().toISOString(),
  });
  await almacen.actualizarTarea("stand", { estado: "en revisión", contratoEscrow: null, hashPago: null });
  return { almacen, fotos };
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

/** AbortSignal.timeout does not hold the event loop open, so a ref'd timer keeps the test alive. */
async function silenciar<T>(trabajo: () => Promise<T>): Promise<T> {
  const previo = console.error;
  console.error = () => undefined;
  const vivo = setInterval(() => undefined, 1_000);
  try {
    return await trabajo();
  } finally {
    clearInterval(vivo);
    console.error = previo;
  }
}
