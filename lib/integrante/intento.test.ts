import "../../tests/integracion/dom-global";
import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { LineaRevision } from "@/components/integrante/evidencia/LineaRevision";
import { ProveedorIdioma } from "@/components/ui/Idioma";
import { tareaConNota } from "@/lib/api/tareas";
import { crearMemoria } from "@/lib/db/memoria";
import type { TareaFila } from "@/lib/db/tipos";
import { desmontar, montar, texto } from "../../tests/integracion/montar";
import { numeroIntentoVisible } from "./intento";

const TAREA: TareaFila = {
  id: "comida",
  proyectoId: "p1",
  titulo: "Team meal",
  tipo: "reembolso",
  monto: "15",
  tope: "15",
  condicion: "Photo of the meal receipt",
  miembroId: "ana",
  walletCobro: "",
  estado: "en revisión",
  hashPago: null,
  credencialUrl: null,
  contratoEscrow: null,
  prioridad: "normal",
  dificultad: null,
};

test("el primer envío es el intento 1 aunque haya archivos viejos", () => {
  const filas = [
    { id: "e1", blobId: "evidencias/vieja-1.jpg" },
    { id: "e2", blobId: "ejemplo/comida" },
    { id: "e3", blobId: "evidencias/vieja-2.jpg" },
    { id: "e4", blobId: "evidencias/primera.jpg" },
  ];
  assert.equal(numeroIntentoVisible({ filas, actualId: "e4", reintento: false, guardado: null }), 1);
  assert.equal(numeroIntentoVisible({ filas, actualId: "e4", reintento: false, guardado: 1 }), 1);
  assert.notEqual(numeroIntentoVisible({ filas, actualId: "e4", reintento: false, guardado: null }), 3);
});

test("una tarea con tres archivos y sin rechazo cuenta el envío como 1", async () => {
  const almacen = crearMemoria();
  await almacen.crearProyecto({ id: "p1", nombre: "Event", creadoEn: "2026-10-01T00:00:00Z", organizadorId: null }, [TAREA]);
  const ahora = Date.now();
  for (const [indice, id] of ["e1", "e2", "e3"].entries()) {
    await almacen.crearEvidencia({
      id,
      tareaId: "comida",
      blobId: `evidencias/${id}.jpg`,
      monto: null,
      montoConfirmado: null,
      fecha: null,
      creadaEn: new Date(ahora + indice).toISOString(),
    });
  }
  const tarea = await almacen.leerTarea("comida");
  assert.ok(tarea);
  const vista = await tareaConNota(almacen, tarea);
  assert.equal(vista.intentos, 1);
});

test("el primer envío del voluntario dice Intento 1", async () => {
  await montar(
    createElement(ProveedorIdioma, {
      idioma: "es",
      children: createElement(LineaRevision, {
        tarea: {
          estado: "en revisión",
          nota: 64,
          veredicto: "parcial",
          rechazada: false,
          rechazo: null,
          intentos: 1,
          organizador: { nombre: "Ana" },
          evento: "ZEEK",
        },
        revisionCerrada: true,
        monto: "US$15.00",
      }),
    }),
  );
  assert.match(texto(), /Intento 1/);
  assert.equal(texto().includes("Intento 3"), false);
  await desmontar();
});
