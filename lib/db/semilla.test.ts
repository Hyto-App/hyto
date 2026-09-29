import assert from "node:assert/strict";
import test from "node:test";
import { armarInforme } from "../api/informe";
import { leerFotoHttp } from "../api/evidencias";
import { leerRevisionHttp } from "../api/revision";
import type { Almacen } from "./almacen";
import { crearMemoria } from "./memoria";
import { asegurarSemilla, evidenciasSemilla, MARCA_EJEMPLO, tareasSemilla, veredictosSemilla } from "./semilla";

test("la semilla marca la evidencia de ZEEK como ejemplo", () => {
  const tareas = tareasSemilla();
  assert.deepEqual(
    tareas.map((tarea) => tarea.id),
    ["stand", "registro", "bienvenida", "comida"],
  );
  assert.equal(tareas.find((tarea) => tarea.id === "stand")?.estado, "pendiente");
  assert.equal(tareas.find((tarea) => tarea.id === "bienvenida")?.estado, "pendiente");
  assert.equal(
    tareas.some((tarea) => tarea.miembroId === "voluntario-1" && tarea.estado === "pendiente"),
    true,
  );
  assert.equal(
    tareas.every((tarea) => tarea.hashPago === null),
    true,
  );

  const evidencias = evidenciasSemilla();
  assert.deepEqual(
    evidencias.map((evidencia) => evidencia.id),
    ["ejemplo-stand", "ejemplo-registro", "ejemplo-comida"],
  );
  assert.equal(
    evidencias.every((evidencia) => evidencia.blobId.startsWith(`${MARCA_EJEMPLO}/`)),
    true,
  );
  assert.equal(evidencias.find((evidencia) => evidencia.tareaId === "comida")?.monto, "12.40");
  assert.equal(evidencias.find((evidencia) => evidencia.tareaId === "comida")?.fecha, "2026-09-27");

  const veredictos = veredictosSemilla();
  assert.equal(veredictos.find((veredicto) => veredicto.tareaId === "stand")?.veredicto, "cumplió");
  assert.equal(veredictos.find((veredicto) => veredicto.tareaId === "registro")?.veredicto, "parcial");
  assert.equal(veredictos.find((veredicto) => veredicto.tareaId === "comida")?.veredicto, "cumplió");
  assert.equal(
    veredictos.every((veredicto) => veredicto.frase.startsWith("Ejemplo.")),
    true,
  );
});

test("el informe de ejemplo arma la bandeja de admin", async () => {
  const almacen = crearMemoria();
  await asegurarSemilla(almacen);
  const informe = await armarInforme(almacen);
  assert.equal(informe.nombre, "ZEEK");
  assert.equal(informe.ejemplo, false);
  assert.equal(informe.tareas.find((tarea) => tarea.id === "stand")?.estado, "pendiente");
  assert.equal(informe.bandeja.find((tarea) => tarea.id === "stand")?.estado, "pendiente");
  assert.deepEqual(
    informe.bandeja.map((tarea) => tarea.id),
    ["stand", "registro", "comida"],
  );
  assert.equal(informe.bandeja.find((tarea) => tarea.id === "registro")?.veredicto, "parcial");
  assert.equal(informe.tareas.find((tarea) => tarea.id === "comida")?.montoRevisado, "12.40");
  assert.equal(informe.tareas.find((tarea) => tarea.id === "comida")?.fecha, "2026-09-27");
  assert.equal(informe.tareas.find((tarea) => tarea.id === "bienvenida")?.veredicto, null);
  assert.deepEqual(informe.resumen, { presupuesto: "75", pagado: "0", pendiente: "75" });
  assert.equal(
    informe.tareas.every((tarea) => tarea.hashPago === null),
    true,
  );
});

test("la revisión de ejemplo trae veredicto sin un modelo", async () => {
  const almacen = crearMemoria();
  const respuesta = await leerRevisionHttp(almacen, null, "stand");
  assert.equal(respuesta.status, 200);
  const json = (await respuesta.json()) as {
    tarea: { veredicto: string; frase: string; estado: string };
    foto: string | null;
  };
  assert.equal(json.tarea.estado, "pendiente");
  assert.equal(json.tarea.veredicto, "cumplió");
  assert.match(json.tarea.frase, /^Ejemplo\./);
  assert.equal(json.foto, null);

  const marcador = await leerFotoHttp(almacen, null, "ejemplo-stand");
  assert.equal(marcador.status, 200);
  assert.match(marcador.headers.get("content-type") ?? "", /image\/svg\+xml/);

  const sinEvidencia = await leerRevisionHttp(almacen, null, "bienvenida");
  const vacia = (await sinEvidencia.json()) as { tarea: { veredicto: string | null; estado: string }; foto: string | null };
  assert.equal(vacia.tarea.estado, "pendiente");
  assert.equal(vacia.tarea.veredicto, null);
  assert.equal(vacia.foto, null);

  const reembolso = (await (await leerRevisionHttp(almacen, null, "comida")).json()) as {
    tarea: { veredicto: string; montoRevisado: string | null; fecha: string | null };
  };
  assert.equal(reembolso.tarea.veredicto, "cumplió");
  assert.equal(reembolso.tarea.montoRevisado, "12.40");
  assert.equal(reembolso.tarea.fecha, "2026-09-27");
});

test("sembrar dos veces no duplica ni pisa un pago", async () => {
  const almacen = crearMemoria();
  await asegurarSemilla(almacen);
  const hash = "ab".repeat(32);
  await almacen.actualizarTarea("stand", { estado: "pagado", hashPago: hash });
  await asegurarSemilla(almacen);
  assert.equal((await almacen.listarTareas()).length, 4);
  const stand = await almacen.leerTarea("stand");
  assert.equal(stand?.estado, "pagado");
  assert.equal(stand?.hashPago, hash);
  assert.equal((await almacen.ultimaEvidencia("stand"))?.id, "ejemplo-stand");
  assert.equal((await almacen.ultimaEvidencia("bienvenida")), null);
});

test("una semilla vieja en revisión vuelve a pendiente sin pago ni foto real", async () => {
  const almacen = crearMemoria();
  await asegurarSemilla(almacen);
  for (const id of ["stand", "registro", "bienvenida", "comida"]) {
    await almacen.actualizarTarea(id, { estado: "en revisión" });
  }
  await almacen.crearEvidencia({
    id: "foto-real",
    tareaId: "registro",
    blobId: "blob/registro.jpg",
    monto: null,
    fecha: null,
    creadaEn: "2026-09-28T12:00:00.000Z",
  });
  await almacen.actualizarTarea("comida", { estado: "pagado" });
  await asegurarSemilla(almacen);
  assert.equal((await almacen.leerTarea("stand"))?.estado, "pendiente");
  assert.equal((await almacen.leerTarea("bienvenida"))?.estado, "pendiente");
  assert.equal((await almacen.leerTarea("comida"))?.estado, "pagado");
  assert.equal((await almacen.leerTarea("registro"))?.estado, "en revisión");
  await asegurarSemilla(almacen);
  assert.equal((await almacen.leerTarea("registro"))?.estado, "en revisión");
  assert.equal((await almacen.leerTarea("stand"))?.estado, "pendiente");
  assert.equal((await almacen.leerTarea("comida"))?.estado, "pagado");
  assert.equal((await almacen.leerTarea("comida"))?.hashPago, null);
});

test("insertar dos veces la evidencia de ejemplo no la pisa", async () => {
  const almacen = crearMemoria();
  await asegurarSemilla(almacen);
  await almacen.actualizarEvidencia("ejemplo-stand", { monto: "9" });
  await almacen.crearEvidencia({
    id: "ejemplo-stand",
    tareaId: "stand",
    blobId: "ejemplo/stand",
    monto: "1",
    fecha: null,
    creadaEn: "2026-09-27T12:00:00.000Z",
  });
  assert.equal((await almacen.leerEvidencia("ejemplo-stand"))?.monto, "9");
});

test("un insert simultáneo de la evidencia de ejemplo no corta la semilla", async () => {
  const base = crearMemoria();
  const error = Object.assign(new Error("llave duplicada"), { code: "23505" });
  let intentos = 0;
  const almacen: Almacen = {
    ...base,
    async leerEvidencia() {
      return null;
    },
    async crearEvidencia() {
      intentos += 1;
      throw error;
    },
  };
  await asegurarSemilla(almacen);
  assert.equal(intentos, 3);
  assert.equal((await base.leerTarea("stand"))?.estado, "pendiente");
  assert.equal((await base.veredictoDe("ejemplo-stand"))?.veredicto, "cumplió");
});
