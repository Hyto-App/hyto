import assert from "node:assert/strict";
import test from "node:test";
import { publicarEvidenciaHttp } from "@/lib/api/evidencias";
import { leerRevisionHttp } from "@/lib/api/revision";
import { crearFotosMemoria } from "@/lib/blob/fotos";
import { crearMemoria } from "@/lib/db/memoria";
import { asegurarSemilla } from "@/lib/db/semilla";
import { desdeGuion } from "@/lib/revision/armar";
import { MOTIVO_COPIA } from "./copia";
import { sha256De } from "./huella";
import { reiniciarTokensEvidencia } from "./token";
import { PDF_MINIMO, jpegDePrueba, jpegDistinto, tokenDePrueba } from "./muestras";
import { phashDe } from "./phash";

test("un trabajo exige cámara, JPEG y frescura; un reembolso acepta PDF y rechaza el duplicado", async () => {
  reiniciarTokensEvidencia();
  const almacen = crearMemoria();
  await asegurarSemilla(almacen);
  const fotos = crearFotosMemoria();
  const jpeg = await jpegDePrueba();
  const actor = { usuarioId: "voluntario-1", rol: "voluntario" as const };

  const sinToken = new FormData();
  sinToken.set("tareaId", "stand");
  sinToken.set("foto", new Blob([jpeg], { type: "image/jpeg" }), "evidencia.jpg");
  assert.equal((await publicarEvidenciaHttp(pedido(sinToken), { almacen, fotos, actor })).status, 400);

  const png = new FormData();
  png.set("tareaId", "stand");
  png.set("token", tokenDePrueba("voluntario-1", "stand"));
  png.set("capturadaEn", new Date().toISOString());
  png.set("foto", new Blob([Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0])], { type: "image/png" }), "evidencia.png");
  assert.equal((await publicarEvidenciaHttp(pedido(png), { almacen, fotos, actor })).status, 400);

  const trabajo = new FormData();
  trabajo.set("tareaId", "stand");
  trabajo.set("token", tokenDePrueba("voluntario-1", "stand"));
  trabajo.set("capturadaEn", new Date().toISOString());
  trabajo.set("foto", new Blob([jpeg], { type: "" }), "evidencia.jpg");
  const creada = await publicarEvidenciaHttp(pedido(trabajo), { almacen, fotos, actor });
  assert.equal(creada.status, 201);
  const guardada = await almacen.ultimaEvidencia("stand");
  assert.equal(guardada?.tipoArchivo, "image/jpeg");
  assert.equal(guardada?.frescura, "captura");
  assert.equal(guardada?.sha256?.length, 64);

  const vieja = new FormData();
  vieja.set("tareaId", "registro");
  vieja.set("token", tokenDePrueba("voluntario-2", "registro"));
  vieja.set("capturadaEn", new Date(Date.now() - 60 * 60 * 1000).toISOString());
  vieja.set("foto", new Blob([await jpegDistinto()], { type: "image/jpeg" }), "evidencia.jpg");
  const rechazada = await publicarEvidenciaHttp(pedido(vieja), {
    almacen,
    fotos,
    actor: { usuarioId: "voluntario-2", rol: "voluntario" },
  });
  assert.equal(rechazada.status, 400);
  assert.match(((await rechazada.json()) as { aviso: string }).aviso, /not a fresh camera capture/);

  const pdf = new FormData();
  pdf.set("tareaId", "comida");
  pdf.set("foto", new Blob([PDF_MINIMO], { type: "application/octet-stream" }), "factura.pdf");
  const previo = console.error;
  console.error = () => undefined;
  try {
    const subida = await publicarEvidenciaHttp(pedido(pdf), { almacen, fotos, actor });
    assert.equal(subida.status, 201);
    const factura = await almacen.ultimaEvidencia("comida");
    assert.equal(factura?.tipoArchivo, "application/pdf");
    assert.equal(factura?.frescura ?? null, null);
    const foto = await fotos.leer(factura?.blobId ?? "");
    assert.equal(foto?.tipo, "application/pdf");
    const revision = (await (await leerRevisionHttp(almacen, fotos, "comida")).json()) as {
      foto: string;
      tarea: { origen: string; codigo: string | null; veredicto: string | null; frase: string; tipoArchivo: string | null };
    };
    assert.equal(revision.tarea.origen, "error");
    assert.equal(revision.tarea.codigo, "sin_texto");
    assert.equal(revision.tarea.veredicto, null);
    assert.match(revision.tarea.frase, /no readable text/);
    assert.equal(revision.tarea.tipoArchivo, "application/pdf");
    assert.match(revision.foto, /\/foto$/);

    const idFactura = factura?.id ?? "";
    const otra = new FormData();
    otra.set("tareaId", "comida");
    otra.set("foto", new Blob([PDF_MINIMO], { type: "application/pdf" }), "factura.pdf");
    const duplicada = await publicarEvidenciaHttp(pedido(otra), { almacen, fotos, actor });
    assert.equal(duplicada.status, 200);
    assert.equal((await almacen.ultimaEvidencia("comida"))?.id, idFactura);
    assert.equal((await almacen.veredictoDe(idFactura))?.origen, "error");
    assert.equal((await almacen.veredictoDe(idFactura))?.choice, "sin_texto");
  } finally {
    console.error = previo;
  }
});

test("un reembolso acepta un txt y un html y no les calcula phash", async () => {
  const almacen = crearMemoria();
  await asegurarSemilla(almacen);
  const fotos = crearFotosMemoria();
  const actor = { usuarioId: "voluntario-1", rol: "voluntario" as const };
  const listo = async () => ({ ...desdeGuion("reembolso", "15"), origen: "scout" as const });

  const txt = new FormData();
  txt.set("tareaId", "comida");
  txt.set("foto", new Blob(["Team meal receipt"], { type: "text/plain" }), "nota.txt");
  assert.equal((await publicarEvidenciaHttp(pedido(txt), { almacen, fotos, actor, revisarTarea: listo })).status, 201);
  assert.equal((await almacen.ultimaEvidencia("comida"))?.tipoArchivo, "text/plain");
  assert.equal((await almacen.ultimaEvidencia("comida"))?.phash ?? null, null);

  const html = new FormData();
  html.set("tareaId", "comida");
  html.set("foto", new Blob(["<p>Another receipt</p>"], { type: "text/html" }), "nota.html");
  assert.equal((await publicarEvidenciaHttp(pedido(html), { almacen, fotos, actor, revisarTarea: listo })).status, 201);
  const guardada = await almacen.ultimaEvidencia("comida");
  assert.equal(guardada?.tipoArchivo, "text/html");
  assert.equal(guardada?.phash ?? null, null);
  assert.equal(guardada?.sha256?.length, 64);
});

test("el mismo archivo se vuelve a revisar si no hay nota o la nota es un error, y sigue bloqueado en otro caso", async () => {
  reiniciarTokensEvidencia();
  const almacen = crearMemoria();
  await asegurarSemilla(almacen);
  const fotos = crearFotosMemoria();
  const jpeg = await jpegDePrueba();
  const actor = { usuarioId: "voluntario-1", rol: "voluntario" as const };
  const form = () => {
    const cuerpo = new FormData();
    cuerpo.set("tareaId", "stand");
    cuerpo.set("token", tokenDePrueba("voluntario-1", "stand"));
    cuerpo.set("capturadaEn", new Date().toISOString());
    cuerpo.set("foto", new Blob([jpeg], { type: "image/jpeg" }), "evidencia.jpg");
    return pedido(cuerpo);
  };

  const sinNota = await fotos.guardar("evidencia.jpg", new Blob([jpeg], { type: "image/jpeg" }));
  await almacen.crearEvidencia({
    id: "ev-vacia",
    tareaId: "stand",
    blobId: sinNota,
    monto: null,
    montoConfirmado: null,
    fecha: null,
    creadaEn: "2026-10-01T00:00:00.000Z",
    sha256: sha256De(jpeg),
    tipoArchivo: "image/jpeg",
    capturadaEn: null,
    frescura: "captura",
    phash: null,
    motivoCopia: null,
  });
  await almacen.actualizarTarea("stand", { estado: "en revisión" });
  const antes = await almacen.contarEvidencias("stand");
  const reintentoVacio = await publicarEvidenciaHttp(form(), {
    almacen,
    fotos,
    actor,
    revisarTarea: async () => ({ ...desdeGuion("trabajo", null), origen: "error", score: "error", veredicto: "insuficiente", nota: null, codigo: "tiempo" }),
  });
  assert.equal(reintentoVacio.status, 200);
  assert.equal(await almacen.contarEvidencias("stand"), antes);
  assert.equal((await almacen.ultimaEvidencia("stand"))?.id, "ev-vacia");
  assert.notEqual((await almacen.ultimaEvidencia("stand"))?.creadaEn, "2026-10-01T00:00:00.000Z");
  assert.equal((await almacen.veredictoDe("ev-vacia"))?.origen, "error");

  const reintentoError = await publicarEvidenciaHttp(form(), {
    almacen,
    fotos,
    actor,
    revisarTarea: async () => ({ ...desdeGuion("trabajo", null), origen: "scout", score: "80", veredicto: "cumplió", nota: 80, codigo: null }),
  });
  assert.equal(reintentoError.status, 200);
  assert.equal(await almacen.contarEvidencias("stand"), antes);
  assert.equal((await almacen.veredictoDe("ev-vacia"))?.origen, "scout");
  assert.equal((await almacen.veredictoDe("ev-vacia"))?.score, "80");

  const repetida = await publicarEvidenciaHttp(form(), {
    almacen,
    fotos,
    actor,
    revisarTarea: async () => desdeGuion("trabajo", null),
  });
  assert.equal(repetida.status, 409);
  assert.match(((await repetida.json()) as { aviso: string }).aviso, /already submitted/);
  assert.equal((await almacen.veredictoDe("ev-vacia"))?.score, "80");

  const ajena = new FormData();
  ajena.set("tareaId", "registro");
  ajena.set("token", tokenDePrueba("voluntario-2", "registro"));
  ajena.set("capturadaEn", new Date().toISOString());
  ajena.set("foto", new Blob([jpeg], { type: "image/jpeg" }), "evidencia.jpg");
  const cuentasRegistro = await almacen.contarEvidencias("registro");
  const cruce = await publicarEvidenciaHttp(pedido(ajena), {
    almacen,
    fotos,
    actor: { usuarioId: "voluntario-2", rol: "voluntario" },
    revisarTarea: async () => desdeGuion("trabajo", null),
  });
  assert.equal(cruce.status, 409);
  assert.match(((await cruce.json()) as { aviso: string }).aviso, /already submitted/);
  assert.equal(await almacen.contarEvidencias("registro"), cuentasRegistro);
});

test("una foto cercana deja el veredicto en insuficiente", async () => {
  reiniciarTokensEvidencia();
  const almacen = crearMemoria();
  await asegurarSemilla(almacen);
  const fotos = crearFotosMemoria();
  const primero = await jpegDePrueba();
  const segundo = await jpegDistinto();
  const actor = { usuarioId: "voluntario-1", rol: "voluntario" as const };
  const cuerpo = new FormData();
  cuerpo.set("tareaId", "stand");
  cuerpo.set("token", tokenDePrueba("voluntario-1", "stand"));
  cuerpo.set("capturadaEn", new Date().toISOString());
  cuerpo.set("foto", new Blob([primero], { type: "image/jpeg" }), "evidencia.jpg");
  assert.equal((await publicarEvidenciaHttp(pedido(cuerpo), { almacen, fotos, actor, revisarTarea: async () => cumplio() })).status, 201);
  const previa = await almacen.ultimaEvidencia("stand");
  assert.ok(previa);
  previa.phash = await phashDe(segundo);

  const copia = new FormData();
  copia.set("tareaId", "registro");
  copia.set("token", tokenDePrueba("voluntario-2", "registro"));
  copia.set("capturadaEn", new Date().toISOString());
  copia.set("foto", new Blob([segundo], { type: "image/jpeg" }), "evidencia.jpg");
  const creada = await publicarEvidenciaHttp(pedido(copia), {
    almacen,
    fotos,
    actor: { usuarioId: "voluntario-2", rol: "voluntario" },
    revisarTarea: async () => cumplio(),
  });
  assert.equal(creada.status, 201);
  const evidencia = await almacen.ultimaEvidencia("registro");
  assert.equal(evidencia?.motivoCopia, MOTIVO_COPIA);
  assert.equal((await almacen.veredictoDe(evidencia?.id ?? ""))?.veredicto, "insuficiente");
  assert.match((await almacen.veredictoDe(evidencia?.id ?? ""))?.frase ?? "", /earlier submission/);
});

test("sin la migración 0005 no se guarda el archivo y la lectura sigue", async () => {
  const base = crearMemoria();
  await asegurarSemilla(base);
  const almacen = { ...base, async listaParaAntifraude() { return false; } };
  const cuerpo = new FormData();
  cuerpo.set("tareaId", "comida");
  cuerpo.set("foto", new Blob([PDF_MINIMO], { type: "application/pdf" }), "factura.pdf");
  const respuesta = await publicarEvidenciaHttp(pedido(cuerpo), { almacen, fotos: crearFotosMemoria() });
  assert.equal(respuesta.status, 503);
  assert.match(((await respuesta.json()) as { aviso: string }).aviso, /0005_evidencia_antifraude/);
  assert.equal((await base.ultimaEvidencia("comida"))?.id, "ejemplo-comida");
});

function pedido(cuerpo: FormData): Request {
  return new Request("http://local/api/evidencias", { method: "POST", body: cuerpo });
}

function cumplio() {
  return { ...desdeGuion("trabajo", null), veredicto: "cumplió" as const, origen: "scout" as const, score: "cumplió" };
}
