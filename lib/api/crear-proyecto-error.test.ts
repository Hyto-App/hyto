import assert from "node:assert/strict";
import test from "node:test";
import { crearMemoria } from "@/lib/db/memoria";
import { clasificarErrorCrear, crearProyectoHttp, detalleErrorCrear } from "./proyectos";

function pedido(): Request {
  return new Request("http://local/api/proyectos", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ nombre: "Feria", tareas: [{ titulo: "Cajas", tipo: "trabajo", monto: "8" }] }),
  });
}

test("un fallo que no es de la base no se disfraza de base no lista, y el registro no lleva secretos", async () => {
  const almacen = crearMemoria();
  const secreto = "postgres://hyto:super-secret@db.internal/hyto";
  almacen.crearProyecto = async () => {
    throw new TypeError(`Cannot read properties of undefined (${secreto}) for ana@example.com`);
  };
  const lineas: unknown[][] = [];
  const previo = console.error;
  console.error = (...args: unknown[]) => {
    lineas.push(args);
  };
  try {
    const respuesta = await crearProyectoHttp(pedido(), almacen, "ana");
    assert.equal(respuesta.status, 500);
    const cuerpo = (await respuesta.json()) as { aviso: string };
    assert.equal(cuerpo.aviso, "Could not create the event.");
    assert.equal(cuerpo.aviso.includes("super-secret"), false);
    assert.equal(lineas.length > 0, true);
    const registro = lineas.map((linea) => linea.join(" ")).join("\n");
    assert.match(registro, /Cannot read properties/);
    assert.equal(registro.includes("super-secret"), false);
    assert.equal(registro.includes("ana@example.com"), false);
    assert.match(registro, /postgres:\/\/redacted/);
  } finally {
    console.error = previo;
  }
});

test("un corte de conexión sigue diciendo que la base no está lista", () => {
  const error = Object.assign(new Error("connect ECONNREFUSED 127.0.0.1:5432"), { code: "ECONNREFUSED" });
  assert.deepEqual(clasificarErrorCrear(error), { aviso: "The database is not ready.", status: 503 });
  assert.match(detalleErrorCrear(error), /ECONNREFUSED/);
});
