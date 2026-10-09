import assert from "node:assert/strict";
import test from "node:test";
import { crearMemoria } from "@/lib/db/memoria";
import { asegurarSemilla } from "@/lib/db/semilla";
import { seguimientoDe } from "@/lib/integrante/actividad";
import type { Veredicto } from "@/lib/admin/tipos";
import { listarTareasHttp } from "./tareas";

test("demo-registro pendiente no trae envío y la línea queda vacía aunque haya nota de ejemplo", async () => {
  const anterior = process.env.HYTO_DEMO_LOGIN;
  process.env.HYTO_DEMO_LOGIN = "1";
  try {
    const almacen = crearMemoria();
    await asegurarSemilla(almacen);
    const respuesta = await listarTareasHttp(almacen, { usuarioId: "demo-voluntario", demo: true }, "mias");
    assert.equal(respuesta.status, 200);
    const cuerpo = (await respuesta.json()) as {
      tareas: {
        id: string;
        estado: string;
        etapa: string | null;
        enviadaEn: string | null;
        nota: number | null;
        veredicto: Veredicto | null;
        hashPago: string | null;
      }[];
    };
    const registro = cuerpo.tareas.find((tarea) => tarea.id === "demo-registro");
    assert.ok(registro);
    assert.equal(registro.estado, "pendiente");
    assert.equal(registro.etapa, null);
    assert.equal(registro.enviadaEn, null);
    const vista = seguimientoDe({
      estado: "pendiente",
      etapa: null,
      hashPago: registro.hashPago,
      enviadaEn: registro.enviadaEn,
      nota: registro.nota,
      veredicto: registro.veredicto,
      revisionFallida: false,
    });
    assert.deepEqual(vista.eventos, []);
    assert.deepEqual(vista.pasos, []);
    assert.equal(typeof registro.nota === "number" || registro.nota === null, true);
  } finally {
    if (anterior === undefined) delete process.env.HYTO_DEMO_LOGIN;
    else process.env.HYTO_DEMO_LOGIN = anterior;
  }
});
