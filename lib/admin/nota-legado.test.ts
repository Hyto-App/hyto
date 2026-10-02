import assert from "node:assert/strict";
import test from "node:test";
import { tareaAdmin } from "@/lib/api/informe";
import { crearMemoria } from "@/lib/db/memoria";
import { asegurarSemilla } from "@/lib/db/semilla";
import { cargarDetalleOrganizador } from "./remoto";

test("una fila vieja con score cumplió conserva la banda y no inventa un porcentaje", async () => {
  const almacen = crearMemoria();
  await asegurarSemilla(almacen);
  const guardado = await almacen.veredictoDe("ejemplo-stand");
  assert.ok(guardado);
  await almacen.guardarVeredicto({ ...guardado, score: "cumplió" });
  const fila = await almacen.leerTarea("stand");
  assert.ok(fila);

  const admin = await tareaAdmin(almacen, fila);
  assert.equal(admin.nota, null);
  assert.equal(admin.veredicto, "cumplió");

  const fetchImpl: typeof fetch = async (input) => {
    const url = String(input);
    if (url === "/api/tareas") {
      return Response.json({ tareas: [{ id: "stand", proyectoId: "zeek" }] });
    }
    if (url === "/api/revision/stand") return Response.json({ tarea: admin, foto: null });
    return new Response("no", { status: 404 });
  };
  const detalle = await cargarDetalleOrganizador("stand", { fetch: fetchImpl });
  assert.equal(detalle?.tarea.nota, null);
  assert.equal(detalle?.tarea.veredicto, "cumplió");
});
