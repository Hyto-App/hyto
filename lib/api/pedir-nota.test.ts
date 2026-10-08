import assert from "node:assert/strict";
import test from "node:test";
import { crearMemoria } from "@/lib/db/memoria";
import { asegurarSemilla } from "@/lib/db/semilla";
import { pedirOtraFotoHttp } from "./pedir";
import { listarTareasHttp } from "./tareas";

test("pedir otra foto guarda la nota y quien cobra la ve, sin el correo", async () => {
  const almacen = crearMemoria();
  await asegurarSemilla(almacen);
  await almacen.asignarOrganizador("zeek", "organizador");
  await almacen.actualizarTarea("stand", { estado: "en revisión" });

  const respuesta = await pedirOtraFotoHttp(almacen, "organizador", "stand", {
    nota: "<b>Recorta</b> el puesto",
    rechazo: { nota: "<b>Recorta</b> el puesto", fallidos: ["0", "0", "no vale"], origen: "organizador" },
  });
  assert.equal(respuesta.status, 200);
  const guardada = await almacen.leerTarea("stand");
  assert.equal(guardada?.estado, "pendiente");
  assert.match(guardada?.rechazo ?? "", /Recorta el puesto/);
  assert.equal((guardada?.rechazo ?? "").includes("<b>"), false);

  const propias = await listarTareasHttp(almacen, { usuarioId: "voluntario-1", demo: false }, "mias");
  const cuerpo = (await propias.json()) as {
    tareas: { id: string; rechazada: boolean; rechazo: { nota: string | null } | null; organizador: { nombre: string } | null }[];
  };
  const stand = cuerpo.tareas.find((tarea) => tarea.id === "stand");
  assert.equal(stand?.rechazada, true);
  assert.equal(stand?.rechazo?.nota, "Recorta el puesto");
  assert.equal(stand?.organizador?.nombre, "Organizer");
  assert.equal(JSON.stringify(cuerpo).includes("@"), false);

  const evento = await listarTareasHttp(almacen, { usuarioId: "voluntario-1", demo: false }, "evento");
  const publicas = (await evento.json()) as { tareas: Record<string, unknown>[] };
  assert.equal(publicas.tareas.some((tarea) => "rechazo" in tarea || "organizador" in tarea || "montoRevisado" in tarea), false);
});
