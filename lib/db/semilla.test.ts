import assert from "node:assert/strict";
import test from "node:test";
import { armarInforme } from "../api/informe";
import { leerFotoHttp, tipoDeFoto } from "../api/evidencias";
import { leerRevisionHttp } from "../api/revision";
import type { Almacen } from "./almacen";
import { crearMemoria } from "./memoria";
import { asegurarSemilla, evidenciasSemilla, MARCA_EJEMPLO, tareasSemilla, veredictosSemilla } from "./semilla";

test("el tipo de la foto sigue los bytes cuando el almacén no dice image", () => {
  const jpeg = Uint8Array.from([0xff, 0xd8, 0xff, 0x00]);
  assert.equal(tipoDeFoto("application/octet-stream", jpeg), "image/jpeg");
  assert.equal(tipoDeFoto("image/png", jpeg), "image/jpeg");
  assert.equal(tipoDeFoto("image/jpg", jpeg), "image/jpeg");
  assert.equal(tipoDeFoto("", Uint8Array.from([1, 2, 3])), "application/octet-stream");
});

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
  assert.equal(veredictos.find((veredicto) => veredicto.tareaId === "stand")?.score, "100");
  assert.equal(veredictos.find((veredicto) => veredicto.tareaId === "registro")?.score, "65");
  assert.equal(veredictos.find((veredicto) => veredicto.tareaId === "comida")?.score, "90");
  assert.equal(veredictos.find((veredicto) => veredicto.tareaId === "stand")?.veredicto, "cumplió");
  assert.equal(veredictos.find((veredicto) => veredicto.tareaId === "registro")?.veredicto, "parcial");
  assert.equal(veredictos.find((veredicto) => veredicto.tareaId === "comida")?.veredicto, "cumplió");
  assert.equal(
    veredictos.every((veredicto) => veredicto.frase.startsWith("Example.")),
    true,
  );
});

test("el informe de ejemplo arma la bandeja de admin", async () => {
  const almacen = crearMemoria();
  await asegurarSemilla(almacen);
  await almacen.asignarOrganizador("zeek", "organizador");
  const informe = await armarInforme(almacen, { usuarioId: "organizador", demo: false });
  assert.equal(informe.nombre, "ZEEK");
  assert.equal(informe.ejemplo, false);
  assert.equal(informe.tareas.find((tarea) => tarea.id === "stand")?.estado, "pendiente");
  assert.deepEqual(informe.bandeja.map((tarea) => tarea.id), []);
  assert.equal(informe.tareas.find((tarea) => tarea.id === "registro")?.nota, 65);
  assert.equal(informe.tareas.find((tarea) => tarea.id === "registro")?.veredicto, "parcial");
  assert.equal(informe.tareas.find((tarea) => tarea.id === "stand")?.nota, 100);
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
    tarea: { veredicto: string; nota: number | null; frase: string; estado: string };
    foto: string | null;
  };
  assert.equal(json.tarea.estado, "pendiente");
  assert.equal(json.tarea.nota, 100);
  assert.equal(json.tarea.veredicto, "cumplió");
  assert.match(json.tarea.frase, /^Example\./);
  assert.equal(json.foto, "/api/evidencias/ejemplo-stand/foto");

  const marcador = await leerFotoHttp(almacen, null, "ejemplo-stand", { usuarioId: "voluntario-1", demo: false });
  assert.equal(marcador.status, 200);
  assert.equal(marcador.headers.get("content-type"), "image/png");
  assert.equal(marcador.headers.get("x-content-type-options"), "nosniff");
  const bytes = new Uint8Array(await marcador.arrayBuffer());
  assert.deepEqual([...bytes.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const vista = new DataView(bytes.buffer, bytes.byteOffset);
  assert.equal(vista.getUint32(16), 480);
  assert.equal(vista.getUint32(20), 360);

  const sinEvidencia = await leerRevisionHttp(almacen, null, "bienvenida");
  const vacia = (await sinEvidencia.json()) as { tarea: { veredicto: string | null; estado: string }; foto: string | null };
  assert.equal(vacia.tarea.estado, "pendiente");
  assert.equal(vacia.tarea.veredicto, null);
  assert.equal(vacia.foto, null);

  const reembolso = (await (await leerRevisionHttp(almacen, null, "comida")).json()) as {
    tarea: { veredicto: string; nota: number | null; montoRevisado: string | null; fecha: string | null };
  };
  assert.equal(reembolso.tarea.nota, 90);
  assert.equal(reembolso.tarea.veredicto, "cumplió");
  assert.equal(reembolso.tarea.montoRevisado, "12.40");
  assert.equal(reembolso.tarea.fecha, "2026-09-27");
});

test("la semilla no toca organizador_id de zeek y el demo es otro proyecto", async () => {
  const anterior = process.env.HYTO_DEMO_LOGIN;
  try {
    const vacio = crearMemoria();
    delete process.env.HYTO_DEMO_LOGIN;
    await asegurarSemilla(vacio);
    assert.equal((await vacio.leerProyecto("zeek"))?.organizadorId, null);
    assert.equal(await vacio.leerProyecto("demo"), null);

    process.env.HYTO_DEMO_LOGIN = "1";
    await asegurarSemilla(vacio);
    assert.equal((await vacio.leerProyecto("zeek"))?.organizadorId, null);
    assert.equal((await vacio.leerProyecto("demo"))?.organizadorId, "demo-organizador");
    const demoTareas = (await vacio.listarTareas()).filter((tarea) => tarea.proyectoId === "demo");
    assert.deepEqual(
      demoTareas.map((tarea) => tarea.id).sort(),
      ["demo-bienvenida", "demo-comida", "demo-registro", "demo-stand"],
    );
    assert.equal(demoTareas.every((tarea) => tarea.miembroId === "demo-voluntario"), true);
    assert.equal(
      (await vacio.listarMiembros("demo")).some(
        (miembro) => miembro.usuarioId === "demo-voluntario" && miembro.rol === "volunteer" && miembro.estado === "active",
      ),
      true,
    );

    await vacio.asignarOrganizador("zeek", "ana");
    await vacio.asignarOrganizador("demo", "ana");
    await vacio.actualizarTarea("demo-stand", { miembroId: "persona-real" });
    await vacio.actualizarTarea("demo-registro", { miembroId: "voluntario-2" });
    await vacio.actualizarTarea("demo-bienvenida", { miembroId: "" });
    await asegurarSemilla(vacio);
    assert.equal((await vacio.leerProyecto("zeek"))?.organizadorId, "ana");
    assert.equal((await vacio.leerProyecto("demo"))?.organizadorId, "ana");
    assert.equal((await vacio.leerTarea("demo-stand"))?.miembroId, "persona-real");
    assert.equal((await vacio.leerTarea("demo-registro"))?.miembroId, "demo-voluntario");
    assert.equal((await vacio.leerTarea("demo-bienvenida"))?.miembroId, "demo-voluntario");
    assert.equal((await vacio.leerTarea("demo-bienvenida"))?.estado, "pendiente");
    assert.equal((await vacio.leerTarea("demo-stand"))?.estado, "en revisión");
    assert.equal((await vacio.veredictoDe("ejemplo-demo-stand"))?.veredicto, "cumplió");
  } finally {
    if (anterior === undefined) delete process.env.HYTO_DEMO_LOGIN;
    else process.env.HYTO_DEMO_LOGIN = anterior;
  }
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
    montoConfirmado: null,
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
    montoConfirmado: null,
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
  assert.equal((await base.veredictoDe("ejemplo-stand"))?.score, "100");
  assert.equal((await base.veredictoDe("ejemplo-stand"))?.veredicto, "cumplió");
});

test("sembrar no baja la tarea demo en revisión a pendiente ni un instante", async () => {
  const anterior = process.env.HYTO_DEMO_LOGIN;
  process.env.HYTO_DEMO_LOGIN = "1";
  try {
    const base = crearMemoria();
    await asegurarSemilla(base);
    assert.equal((await base.leerTarea("demo-stand"))?.estado, "en revisión");
    const bajadas: string[] = [];
    const vigilado: Almacen = {
      ...base,
      async actualizarTarea(id, cambio) {
        if (id.startsWith("demo-") && cambio.estado === "pendiente") bajadas.push(id);
        return base.actualizarTarea(id, cambio);
      },
    };
    await asegurarSemilla(vigilado);
    await asegurarSemilla(vigilado);
    assert.deepEqual(bajadas, []);
    assert.equal((await base.leerTarea("demo-stand"))?.estado, "en revisión");
  } finally {
    if (anterior === undefined) delete process.env.HYTO_DEMO_LOGIN;
    else process.env.HYTO_DEMO_LOGIN = anterior;
  }
});

test("una foto guardada como svg u otro image/* se sirve como bytes, no como imagen ejecutable", () => {
  const svg = new TextEncoder().encode("<svg xmlns='http://www.w3.org/2000/svg'><script>alert(1)</script></svg>");
  assert.equal(tipoDeFoto("image/svg+xml", svg), "application/octet-stream");
  assert.equal(tipoDeFoto("image/x-icon", Uint8Array.from([1, 2, 3])), "application/octet-stream");
  assert.equal(tipoDeFoto("image/webp", Uint8Array.from([1, 2, 3])), "image/webp");
});
