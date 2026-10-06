import assert from "node:assert/strict";
import test from "node:test";
import type { TareaAdmin } from "../admin/tipos";
import { crearMemoria } from "../db/memoria";
import { asegurarSemilla } from "../db/semilla";
import { cerrar } from "../revision/armar";
import { senalesDeFactura } from "../revision/laya";
import { leerDescripcion } from "../revision/scout";
import { escribirSnapshot } from "../revision/snapshot-razones";
import { guardarRevision } from "./evidencias";
import { armarInforme, tareaAdmin, tareaEnBandeja } from "./informe";
import { marcasDeProyecto } from "./novedades";
import { pedirOtraFotoHttp } from "./pedir";
import { leerProyectoHttp } from "./proyectos";
import { leerRevisionHttp } from "./revision";

const ORGANIZADOR = { usuarioId: "organizador", demo: false };

async function zeekConFotoReal() {
  const almacen = crearMemoria();
  await asegurarSemilla(almacen);
  await almacen.asignarOrganizador("zeek", "organizador");
  await almacen.crearEvidencia({
    id: "ev-real",
    tareaId: "bienvenida",
    blobId: "blob-real",
    monto: null,
    montoConfirmado: null,
    fecha: null,
    creadaEn: "2026-10-02T08:00:00.000Z",
  });
  await almacen.guardarVeredicto({
    id: "ev-real",
    evidenciaId: "ev-real",
    tareaId: "bienvenida",
    veredicto: "parcial",
    frase: "Half of the table is set up.",
    textoScout: "Half of the table is set up.",
    choice: "trabajo",
    noul: "si",
    score: "64",
    origen: "scout",
  });
  await almacen.actualizarTarea("bienvenida", { estado: "en revisión" });
  return almacen;
}

async function pendientesDelEvento(almacen: ReturnType<typeof crearMemoria>): Promise<number | undefined> {
  const respuesta = await leerProyectoHttp(almacen, ORGANIZADOR, { id: "zeek" });
  const cuerpo = (await respuesta.json()) as { proyectos: { id: string; pendientes?: number }[] };
  return cuerpo.proyectos.find((proyecto) => proyecto.id === "zeek")?.pendientes;
}

test("the event card count and the inbox list use the same rule", async () => {
  const almacen = await zeekConFotoReal();
  const informe = await armarInforme(almacen, ORGANIZADOR);
  assert.deepEqual(informe.bandeja.map((tarea) => tarea.id).sort(), ["bienvenida"]);
  assert.equal(await pendientesDelEvento(almacen), informe.bandeja.length);
});

test("asking for another photo hides the old verdict until a new file arrives", async () => {
  const almacen = await zeekConFotoReal();
  assert.equal((await pedirOtraFotoHttp(almacen, "organizador", "bienvenida")).status, 200);

  const tarea = await almacen.leerTarea("bienvenida");
  assert.ok(tarea);
  const vista = await tareaAdmin(almacen, tarea);
  assert.equal(vista.estado, "pendiente");
  assert.equal(vista.veredicto, null);
  assert.equal(vista.nota, null);
  assert.equal(vista.frase, null);
  assert.equal(vista.origen, null);
  assert.deepEqual(vista.etiquetas, []);
  assert.equal(await tareaEnBandeja(almacen, tarea), false);

  const revision = (await (await leerRevisionHttp(almacen, null, "bienvenida")).json()) as {
    tarea: { veredicto: string | null; nota: number | null };
  };
  assert.equal(revision.tarea.veredicto, null);
  assert.equal(revision.tarea.nota, null);

  const marca = (await marcasDeProyecto(almacen, "zeek")).find((item) => item.tareaId === "bienvenida");
  assert.equal(marca?.veredicto, null);
  assert.equal(marca?.origen, null);

  const informe = await armarInforme(almacen, ORGANIZADOR);
  assert.equal(informe.bandeja.some((item) => item.id === "bienvenida"), false);
  assert.equal(await pendientesDelEvento(almacen), informe.bandeja.length);
});

test("a new upload after asking for another photo shows its own verdict", async () => {
  const almacen = await zeekConFotoReal();
  await pedirOtraFotoHttp(almacen, "organizador", "bienvenida");
  await almacen.crearEvidencia({
    id: "ev-nueva",
    tareaId: "bienvenida",
    blobId: "blob-nueva",
    monto: null,
    montoConfirmado: null,
    fecha: null,
    creadaEn: "2026-10-02T09:00:00.000Z",
  });
  await almacen.guardarVeredicto({
    id: "ev-nueva",
    evidenciaId: "ev-nueva",
    tareaId: "bienvenida",
    veredicto: "cumplió",
    frase: "Table set up at the entrance.",
    textoScout: "Table set up at the entrance.",
    choice: "trabajo",
    noul: "si",
    score: "92",
    origen: "scout",
  });
  await almacen.actualizarTarea("bienvenida", { estado: "en revisión" });
  const tarea = await almacen.leerTarea("bienvenida");
  assert.ok(tarea);
  const vista = await tareaAdmin(almacen, tarea);
  assert.equal(vista.veredicto, "cumplió");
  assert.equal(vista.nota, 92);
  assert.equal(await tareaEnBandeja(almacen, tarea), true);
});

test("a saved receipt reading reaches the review screen with the main reason first", async () => {
  const almacen = crearMemoria();
  await asegurarSemilla(almacen);
  await almacen.asignarOrganizador("zeek", "organizador");
  await almacen.crearEvidencia({
    id: "ev-crc",
    tareaId: "comida",
    blobId: "blob-crc",
    monto: null,
    montoConfirmado: null,
    fecha: null,
    creadaEn: "2026-10-02T08:00:00.000Z",
  });
  const descripcion = leerDescripcion(
    JSON.stringify({
      tipo: "recibo",
      pais: "CR",
      moneda: "CRC",
      monto_original: "₡6.900,00",
      monto_usd: null,
      fecha: null,
      comercio: "Soda La Esquina",
      articulos: ["Casado con pollo"],
      texto_completo: "A Soda La Esquina receipt for ₡6.900,00. The top is torn off, so there is no date.",
      legible: true,
      faltantes: ["purchase date"],
    }),
    { condicion: "Photo of the meal receipt", tipoTarea: "reembolso" },
  );
  assert.ok(descripcion);
  const factura = { f1: "coincide_con_lo_pedido", f2: true, f3: false, f4: 1, g1: "comida_o_bebida", g2: true, g3: true, g4: true, g5: 1 } as const;
  const resultado = cerrar(
    "reembolso",
    "15",
    descripcion,
    { ...senalesDeFactura(factura), detalle: escribirSnapshot({ clase: "factura", trabajo: null, factura, cerca: [] }) },
    "scout",
  );
  assert.ok(resultado);
  await guardarRevision(almacen, "ev-crc", "comida", resultado);
  await almacen.actualizarTarea("comida", { estado: "en revisión" });

  const respuesta = await leerRevisionHttp(almacen, null, "comida");
  const { tarea: vista } = (await respuesta.json()) as { tarea: TareaAdmin };
  assert.equal(vista.nota, 78);
  assert.equal(vista.veredicto, "parcial");
  assert.equal(vista.montoRevisado, "13.66");
  assert.equal(vista.fecha, null);
  assert.deepEqual(vista.lectura, { moneda: "CRC", montoOriginal: "₡6.900,00", tasa: 505, fechaImpresa: null, comercio: "Soda La Esquina" });
  assert.equal(vista.etiquetas?.[0]?.id, "date_missing");
  assert.equal((await almacen.veredictoDe("ev-crc"))?.frase.includes("@@"), false);

  await pedirOtraFotoHttp(almacen, "organizador", "comida");
  const tarea = await almacen.leerTarea("comida");
  assert.ok(tarea);
  assert.equal((await tareaAdmin(almacen, tarea)).lectura, null);
});

test("seeded sample tasks keep their sample verdict while pending", async () => {
  const almacen = crearMemoria();
  await asegurarSemilla(almacen);
  const stand = await almacen.leerTarea("stand");
  assert.ok(stand);
  assert.equal(stand.estado, "pendiente");
  const vista = await tareaAdmin(almacen, stand);
  assert.equal(vista.veredicto, "cumplió");
  assert.equal(await tareaEnBandeja(almacen, stand), false);
});
