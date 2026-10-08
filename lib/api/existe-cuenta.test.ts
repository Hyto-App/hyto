import assert from "node:assert/strict";
import test from "node:test";
import { crearMemoria } from "../db/memoria";
import { reiniciarLimite } from "../escrow/limite";
import { clienteEstable, existeCuentaHttp } from "./existe-cuenta";

function pedido(cuerpo: unknown): Request {
  return new Request("http://localhost/api/sesion/existe", { method: "POST", body: JSON.stringify(cuerpo) });
}

test("dice si el correo ya tiene cuenta, sin importar mayúsculas", async () => {
  reiniciarLimite();
  const almacen = crearMemoria();
  await almacen.insertarUsuario({ id: "u-1", email: "ana@example.com", nombre: "Ana", rol: "voluntario" });
  const si = await existeCuentaHttp(pedido({ email: " Ana@Example.com " }), almacen);
  assert.deepEqual(await si.json(), { existe: true });
  const no = await existeCuentaHttp(pedido({ email: "nuevo@example.com" }), almacen);
  assert.deepEqual(await no.json(), { existe: false });
});

test("rechaza un correo inválido y limita las consultas", async () => {
  reiniciarLimite();
  const almacen = crearMemoria();
  assert.equal((await existeCuentaHttp(pedido({ email: "no-es-correo" }), almacen)).status, 400);
  let ultima = 200;
  for (let i = 0; i < 12; i += 1) ultima = (await existeCuentaHttp(pedido({ email: "x@example.com" }), almacen)).status;
  assert.equal(ultima, 429);
  reiniciarLimite();
});

test("un x-forwarded-for inventado no abre otro cupo si la IP real es la misma", async () => {
  reiniciarLimite();
  const almacen = crearMemoria();
  const pedidoIp = (adelante: string) =>
    new Request("http://localhost/api/sesion/existe", {
      method: "POST",
      headers: { "x-forwarded-for": adelante, "x-real-ip": "203.0.113.8" },
      body: JSON.stringify({ email: "x@example.com" }),
    });
  assert.equal(clienteEstable(pedidoIp("1.1.1.1, 203.0.113.8")), "203.0.113.8");
  assert.equal(clienteEstable(pedidoIp("8.8.8.8")), "203.0.113.8");
  let ultima = 200;
  for (let i = 0; i < 12; i += 1) {
    ultima = (await existeCuentaHttp(pedidoIp(`${i}.1.1.1, 203.0.113.8`), almacen)).status;
  }
  assert.equal(ultima, 429);
  reiniciarLimite();
});
