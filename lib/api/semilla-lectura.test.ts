import assert from "node:assert/strict";
import test from "node:test";
import { listarTareasHttp } from "@/lib/api/tareas";
import { informeHttp } from "@/lib/api/informe";
import { leerProyectoHttp } from "@/lib/api/proyectos";
import type { Almacen } from "@/lib/db/almacen";
import { crearMemoria } from "@/lib/db/memoria";
import { asegurarSemilla } from "@/lib/db/semilla";

test("leer tareas, el informe y el evento no escribe", async () => {
  const base = crearMemoria();
  await asegurarSemilla(base);
  let escrituras = 0;
  const marcar = () => {
    escrituras += 1;
  };
  const almacen = new Proxy(base, {
    get(target, prop, receiver) {
      const valor = Reflect.get(target, prop, receiver);
      if (
        prop === "actualizarTarea" ||
        prop === "crearEvidencia" ||
        prop === "guardarVeredicto" ||
        prop === "crearProyecto" ||
        prop === "insertarUsuario" ||
        prop === "guardarUsuario" ||
        prop === "guardarMiembro" ||
        prop === "crearSesion"
      ) {
        return async (...args: unknown[]) => {
          marcar();
          return (valor as (...entrada: unknown[]) => unknown).apply(target, args);
        };
      }
      return valor;
    },
  }) as Almacen;

  const visor = { usuarioId: "voluntario-1", demo: false };
  assert.equal((await listarTareasHttp(almacen, visor, "mias")).status, 200);
  assert.equal((await informeHttp(almacen, visor)).status, 200);
  assert.equal((await leerProyectoHttp(almacen, visor)).status, 200);
  assert.equal(escrituras, 0);
});
