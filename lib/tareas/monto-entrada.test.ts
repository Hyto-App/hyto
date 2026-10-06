import assert from "node:assert/strict";
import test from "node:test";
import { crearMemoria } from "@/lib/db/memoria";
import { crearProyectoHttp } from "@/lib/api/proyectos";
import { AVISO_MONTO_INVALIDO } from "@/lib/escrow/monto";
import { avisoMontoEntrada, escribirMonto } from "./monto-entrada";

test("el monto escrito solo conserva dígitos y un decimal", () => {
  assert.equal(escribirMonto("12abc"), "12");
  assert.equal(escribirMonto("-5"), "-5");
  assert.equal(escribirMonto("ab"), "");
  assert.equal(escribirMonto("1.2.3"), "1.23");
  assert.equal(escribirMonto("8,5"), "8.5");
  assert.equal(escribirMonto(" 20 "), "20");
});

test("un monto vacío se puede seguir escribiendo y cero o letras no pasan", () => {
  assert.equal(avisoMontoEntrada(""), null);
  assert.equal(avisoMontoEntrada("."), null);
  assert.equal(avisoMontoEntrada("8"), null);
  assert.equal(avisoMontoEntrada("8.50"), null);
  assert.equal(avisoMontoEntrada("-5"), AVISO_MONTO_INVALIDO);
  assert.equal(avisoMontoEntrada("0"), AVISO_MONTO_INVALIDO);
  assert.equal(avisoMontoEntrada("0.00"), AVISO_MONTO_INVALIDO);
});

test("el servidor rechaza un monto que no es un número positivo", async () => {
  const almacen = crearMemoria();
  const pedido = (monto: string) =>
    new Request("http://local/api/proyectos", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ nombre: "Feria", tareas: [{ titulo: "Cajas", tipo: "trabajo", monto }] }),
    });
  const letras = await crearProyectoHttp(pedido("abc"), almacen, "ana");
  assert.equal(letras.status, 400);
  assert.match(((await letras.json()) as { aviso: string }).aviso, /greater than zero/);
  const cero = await crearProyectoHttp(pedido("0"), almacen, "ana");
  assert.equal(cero.status, 400);
  assert.equal((await almacen.listarTareas()).length, 0);
});
