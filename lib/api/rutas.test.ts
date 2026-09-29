import assert from "node:assert/strict";
import test from "node:test";
import { POST as enviarFirma } from "../../app/api/firma/enviar/route";
import { POST as prepararFirma } from "../../app/api/firma/route";
import { crearFotosMemoria } from "../blob/fotos";
import { crearMemoria } from "../db/memoria";
import { publicarEvidenciaHttp, leerEvidenciaHttp, leerFotoHttp } from "./evidencias";
import { informeHttp } from "./informe";
import { crearProyectoHttp } from "./proyectos";
import { leerRevisionHttp } from "./revision";
import { crearSesionHttp } from "./sesion";
import { listarTareasHttp } from "./tareas";

function token(email: string): string {
  return `aaaa.${Buffer.from(JSON.stringify({ sub: "cavos-1", email })).toString("base64url")}.bbbb`;
}

test("las tareas de ZEEK salen de la base", async () => {
  const respuesta = await listarTareasHttp(crearMemoria());
  assert.equal(respuesta.status, 200);
  assert.match(respuesta.headers.get("content-type") ?? "", /json/);
  const json = (await respuesta.json()) as { tareas: { id: string; tipo: string; monto: string; tope: string | null }[] };
  assert.deepEqual(
    json.tareas.map((tarea) => tarea.id),
    ["stand", "registro", "bienvenida", "comida"],
  );
  assert.equal(json.tareas[0]?.monto, "20");
  assert.equal(json.tareas[3]?.tipo, "reembolso");
  assert.equal(json.tareas[3]?.tope, "15");
});

test("la foto queda guardada y el reembolso trae monto y fecha", async () => {
  const almacen = crearMemoria();
  const fotos = crearFotosMemoria();
  const cuerpo = new FormData();
  cuerpo.set("tareaId", "comida");
  cuerpo.set("foto", new Blob([Uint8Array.from([1, 2, 3])], { type: "image/jpeg" }), "evidencia.jpg");
  const creada = await publicarEvidenciaHttp(new Request("http://local/api/evidencias", { method: "POST", body: cuerpo }), {
    almacen,
    fotos,
  });
  assert.equal(creada.status, 201);
  const json = (await creada.json()) as { evidencia: { id: string; monto: string; fecha: string; blobId: string } };
  assert.equal(json.evidencia.monto, "12.40");
  assert.equal(json.evidencia.fecha, "2026-09-27");

  const lectura = await leerEvidenciaHttp(almacen, json.evidencia.id);
  const leida = (await lectura.json()) as { evidencia: { monto: string } };
  assert.equal(leida.evidencia.monto, "12.40");

  const foto = await leerFotoHttp(almacen, fotos, json.evidencia.id);
  assert.equal(foto.headers.get("content-type"), "image/jpeg");
  assert.equal((await foto.arrayBuffer()).byteLength, 3);

  const tarea = await almacen.leerTarea("comida");
  assert.equal(tarea?.estado, "en revisión");
});

test("un archivo que no es imagen no pasa", async () => {
  const cuerpo = new FormData();
  cuerpo.set("tareaId", "stand");
  cuerpo.set("foto", new Blob(["hola"], { type: "text/plain" }), "nota.txt");
  const respuesta = await publicarEvidenciaHttp(
    new Request("http://local/api/evidencias", { method: "POST", body: cuerpo }),
    { almacen: crearMemoria(), fotos: crearFotosMemoria() },
  );
  assert.equal(respuesta.status, 400);

  const svg = new FormData();
  svg.set("tareaId", "stand");
  svg.set("foto", new Blob(["<svg xmlns='http://www.w3.org/2000/svg'/>"], { type: "image/svg+xml" }), "dibujo.svg");
  const rechazado = await publicarEvidenciaHttp(
    new Request("http://local/api/evidencias", { method: "POST", body: svg }),
    { almacen: crearMemoria(), fotos: crearFotosMemoria() },
  );
  assert.equal(rechazado.status, 400);
});

test("el informe abre sin hash y Ver pago usa el hash cuando existe", async () => {
  const almacen = crearMemoria();
  const vacio = await informeHttp(almacen);
  assert.equal(vacio.status, 200);
  const primero = (await vacio.json()) as { nombre: string; ejemplo: boolean; tareas: { hashPago: string | null }[]; resumen: { presupuesto: string } };
  assert.equal(primero.nombre, "ZEEK");
  assert.equal(primero.ejemplo, false);
  assert.equal(primero.resumen.presupuesto, "75");
  assert.equal(primero.tareas.every((tarea) => tarea.hashPago === null), true);

  const hash = "a".repeat(64);
  await almacen.actualizarTarea("stand", { hashPago: hash, estado: "pagado" });
  const conPago = (await (await informeHttp(almacen)).json()) as {
    tareas: { id: string; hashPago: string | null }[];
  };
  assert.equal(conPago.tareas.find((tarea) => tarea.id === "stand")?.hashPago, hash);

  const revision = (await (await leerRevisionHttp(almacen, crearFotosMemoria(), "stand")).json()) as { enlacePago: string | null };
  assert.equal(revision.enlacePago, `https://stellar.expert/explorer/testnet/tx/${hash}`);
});

test("la revisión de un trabajo sin clave usa el guion", async () => {
  const almacen = crearMemoria();
  const fotos = crearFotosMemoria();
  const cuerpo = new FormData();
  cuerpo.set("tareaId", "stand");
  cuerpo.set("foto", new Blob([Uint8Array.from([9])], { type: "image/png" }), "evidencia.jpg");
  await publicarEvidenciaHttp(new Request("http://local/api/evidencias", { method: "POST", body: cuerpo }), { almacen, fotos });
  const json = (await (await leerRevisionHttp(almacen, fotos, "stand")).json()) as {
    tarea: { veredicto: string; frase: string; estado: string };
    foto: string;
    enlacePago: string | null;
  };
  assert.equal(json.tarea.veredicto, "parcial");
  assert.equal(json.tarea.estado, "en revisión");
  assert.match(json.tarea.frase, /Mesa armada/);
  assert.match(json.foto, /^\/api\/evidencias\/.+\/foto$/);
  assert.equal(json.enlacePago, null);
});

test("un proyecto nuevo entra por la ruta", async () => {
  const almacen = crearMemoria();
  const respuesta = await crearProyectoHttp(
    new Request("http://local/api/proyectos", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        nombre: "Prueba",
        tareas: [{ titulo: "Cajas", tipo: "trabajo", monto: "8", condicion: "Cajas cerradas", miembroId: "voluntario-2" }],
      }),
    }),
    almacen,
  );
  assert.equal(respuesta.status, 201);
  const tareas = (await (await listarTareasHttp(almacen)).json()) as { tareas: { titulo: string }[] };
  assert.equal(tareas.tareas.some((tarea) => tarea.titulo === "Cajas"), true);
});

test("la sesión sale del correo y el pago exige al organizador", async () => {
  const almacen = crearMemoria();
  const ajeno = await crearSesionHttp(
    new Request("http://local/api/sesion", {
      method: "POST",
      body: JSON.stringify({ email: "nadie@demo.hyto", token: token("nadie@demo.hyto") }),
    }),
    almacen,
  );
  assert.equal(ajeno.status, 403);

  const propia = await crearSesionHttp(
    new Request("http://local/api/sesion", {
      method: "POST",
      body: JSON.stringify({ email: "organizador@demo.hyto", token: token("organizador@demo.hyto") }),
    }),
    almacen,
  );
  assert.equal(propia.status, 200);
  assert.match(propia.headers.get("set-cookie") ?? "", /hyto_sesion=/);
  const cuerpo = (await propia.json()) as { rol: string };
  assert.equal(cuerpo.rol, "organizador");

  const sinSesion = await prepararFirma(new Request("http://local/api/firma", { method: "POST", body: "{}" }));
  assert.equal(sinSesion.status, 401);
  const envio = await enviarFirma(new Request("http://local/api/firma/enviar", { method: "POST", body: "{}" }));
  assert.equal(envio.status, 401);
});
