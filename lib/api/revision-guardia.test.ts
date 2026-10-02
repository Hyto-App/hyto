import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { crearFotosMemoria } from "../blob/fotos";
import { crearMemoria } from "../db/memoria";
import { asegurarSemilla } from "../db/semilla";
import type { VeredictoFila } from "../db/tipos";
import { desdeFallo, desdeGuion } from "../revision/armar";
import { guardarRevision } from "./evidencias";
import { INTENTOS_REVISION } from "../revision/reintento";
import { leerRevisionHttp, liberarRevision, reiniciarCandadosRevision, reservarRevision } from "./revision";

test("un fallo no borra el monto y la fecha ya guardados", async () => {
  const almacen = crearMemoria();
  await almacen.crearEvidencia({
    id: "ev",
    tareaId: "comida",
    blobId: "memoria/comida",
    monto: null,
    montoConfirmado: null,
    fecha: null,
    creadaEn: "2026-09-28T00:00:00.000Z",
  });
  await guardarRevision(almacen, "ev", "comida", desdeGuion("reembolso", "15"));
  assert.equal((await almacen.leerEvidencia("ev"))?.monto, "12.40");
  assert.equal((await almacen.leerEvidencia("ev"))?.fecha, "2026-09-27");

  await almacen.actualizarEvidencia("ev", { montoConfirmado: "12.40" });
  await guardarRevision(almacen, "ev", "comida", desdeGuion("reembolso", "15"));
  assert.equal((await almacen.leerEvidencia("ev"))?.montoConfirmado, "12.40");

  await guardarRevision(almacen, "ev", "comida", { ...desdeGuion("reembolso", "15"), monto: "9.50" });
  assert.equal((await almacen.leerEvidencia("ev"))?.monto, "9.50");
  assert.equal((await almacen.leerEvidencia("ev"))?.montoConfirmado, null);
  await almacen.actualizarEvidencia("ev", { montoConfirmado: "9.50" });

  await guardarRevision(almacen, "ev", "comida", desdeFallo({ code: "tiempo", mensaje: "La IA no respondió a tiempo" }));
  const evidencia = await almacen.leerEvidencia("ev");
  assert.equal(evidencia?.monto, "9.50");
  assert.equal(evidencia?.fecha, "2026-09-27");
  assert.equal(evidencia?.montoConfirmado, "9.50");
  assert.equal((await almacen.veredictoDe("ev"))?.origen, "error");
  assert.equal((await almacen.veredictoDe("ev"))?.choice, "tiempo");
});

test("el candado de una tarea dura unos 30 segundos", () => {
  reiniciarCandadosRevision();
  assert.equal(reservarRevision("stand", 1_000), true);
  assert.equal(reservarRevision("stand", 1_000), false);
  liberarRevision("stand", 1_000);
  assert.equal(reservarRevision("stand", 30_000), false);
  assert.equal(reservarRevision("stand", 31_000), true);
  liberarRevision("stand", 31_000);
  reiniciarCandadosRevision();
});

describe("reintentar la revisión", { concurrency: false }, () => {
  test("no vuelve a correr si el veredicto no es un error, y sí si lo es", async () => {
    reiniciarCandadosRevision();
    const almacen = crearMemoria();
    await asegurarSemilla(almacen);
    const fotos = crearFotosMemoria();
    const id = await evidenciaReal(almacen, fotos, "stand");
    await veredicto(almacen, id, "stand", "scout", "ya está");
    const previaClave = process.env.GROQ_API_KEY;
    const previaLaya = process.env.LAYA_URL;
    process.env.GROQ_API_KEY = "clave-de-prueba";
    delete process.env.LAYA_URL;
    let llamadas = 0;
    const original = globalThis.fetch;
    globalThis.fetch = async () => {
      llamadas += 1;
      return new Response("no", { status: 500 });
    };
    const previo = console.error;
    console.error = () => undefined;
    try {
      const quieta = await leerRevisionHttp(almacen, fotos, "stand", true);
      assert.equal(quieta.status, 200);
      const vista = (await quieta.json()) as { tarea: { frase: string; origen: string } };
      assert.equal(vista.tarea.frase, "ya está");
      assert.equal(vista.tarea.origen, "scout");
      assert.equal(llamadas, 0);

      await veredicto(almacen, id, "stand", "error", "La IA no está configurada");
      const forzada = await leerRevisionHttp(almacen, fotos, "stand", true);
      assert.equal(forzada.status, 200);
      const otra = (await forzada.json()) as { tarea: { origen: string; codigo: string | null } };
      assert.equal(otra.tarea.origen, "error");
      assert.equal(otra.tarea.codigo, "proveedor");
      assert.equal(llamadas, INTENTOS_REVISION);
      assert.equal((await almacen.leerEvidencia(id))?.monto, "12.40");
    } finally {
      console.error = previo;
      globalThis.fetch = original;
      if (previaClave === undefined) delete process.env.GROQ_API_KEY;
      else process.env.GROQ_API_KEY = previaClave;
      if (previaLaya === undefined) delete process.env.LAYA_URL;
      else process.env.LAYA_URL = previaLaya;
      reiniciarCandadosRevision();
    }
  });

  test("una tarea pagada o con escrow no se vuelve a revisar", async () => {
    reiniciarCandadosRevision();
    const almacen = crearMemoria();
    await asegurarSemilla(almacen);
    const fotos = crearFotosMemoria();
    await evidenciaReal(almacen, fotos, "stand");
    await almacen.actualizarTarea("stand", { estado: "pagado" });
    const pagada = await leerRevisionHttp(almacen, fotos, "stand", true);
    assert.equal(pagada.status, 409);
    assert.equal(((await pagada.json()) as { aviso: string }).aviso, "This task can no longer be reviewed.");

    await almacen.actualizarTarea("stand", { estado: "en revisión", contratoEscrow: "CSTAND" });
    const conContrato = await leerRevisionHttp(almacen, fotos, "stand", true);
    assert.equal(conContrato.status, 409);
  });

  test("un reintento en curso o dentro de la espera responde 429", async () => {
    reiniciarCandadosRevision();
    const almacen = crearMemoria();
    await asegurarSemilla(almacen);
    const fotos = crearFotosMemoria();
    const id = await evidenciaReal(almacen, fotos, "stand");
    await veredicto(almacen, id, "stand", "error", "La IA no respondió a tiempo");
    const previaClave = process.env.GROQ_API_KEY;
    const previaLaya = process.env.LAYA_URL;
    process.env.GROQ_API_KEY = "clave-de-prueba";
    delete process.env.LAYA_URL;
    let soltar: (valor?: void) => void = () => undefined;
    const espera = new Promise<void>((resolver) => {
      soltar = resolver;
    });
    let entro: (valor?: void) => void = () => undefined;
    const adentro = new Promise<void>((resolver) => {
      entro = resolver;
    });
    const original = globalThis.fetch;
    const previo = console.error;
    console.error = () => undefined;
    globalThis.fetch = async () => {
      entro();
      await espera;
      return new Response("no", { status: 500 });
    };
    try {
      const primero = leerRevisionHttp(almacen, fotos, "stand", true);
      await adentro;
      const segundo = await leerRevisionHttp(almacen, fotos, "stand", true);
      assert.equal(segundo.status, 429);
      assert.match(((await segundo.json()) as { aviso: string }).aviso, /Wait a moment/);
      soltar();
      assert.equal((await primero).status, 200);
      const tercero = await leerRevisionHttp(almacen, fotos, "stand", true);
      assert.equal(tercero.status, 429);
    } finally {
      soltar();
      console.error = previo;
      globalThis.fetch = original;
      if (previaClave === undefined) delete process.env.GROQ_API_KEY;
      else process.env.GROQ_API_KEY = previaClave;
      if (previaLaya === undefined) delete process.env.LAYA_URL;
      else process.env.LAYA_URL = previaLaya;
      reiniciarCandadosRevision();
    }
  });
});

async function evidenciaReal(
  almacen: ReturnType<typeof crearMemoria>,
  fotos: ReturnType<typeof crearFotosMemoria>,
  tareaId: string,
): Promise<string> {
  const blobId = await fotos.guardar("evidencia.jpg", new Blob([Uint8Array.from([1])], { type: "image/jpeg" }));
  const id = crypto.randomUUID();
  await almacen.crearEvidencia({
    id,
    tareaId,
    blobId,
    monto: "12.40",
    montoConfirmado: null,
    fecha: "2026-09-27",
    creadaEn: "2026-09-29T00:00:00.000Z",
  });
  return id;
}

async function veredicto(
  almacen: ReturnType<typeof crearMemoria>,
  evidenciaId: string,
  tareaId: string,
  origen: VeredictoFila["origen"],
  frase: string,
): Promise<void> {
  await almacen.guardarVeredicto({
    id: evidenciaId,
    evidenciaId,
    tareaId,
    veredicto: "parcial",
    frase,
    textoScout: frase,
    choice: origen === "error" ? "tiempo" : "stand",
    noul: "si",
    score: "parcial",
    origen,
  });
}
