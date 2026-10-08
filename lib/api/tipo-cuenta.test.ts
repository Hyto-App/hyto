import assert from "node:assert/strict";
import test from "node:test";
import { guardarTipoCuentaHttp, leerTipoCuentaHttp, organizacionDeEvento } from "@/lib/api/tipo-cuenta";
import { tipoCuentaActivo } from "@/lib/cuenta/bandera";
import { leerPerfilCuenta } from "@/lib/cuenta/reglas";
import { crearMemoria } from "@/lib/db/memoria";
import type { Almacen } from "@/lib/db/almacen";
import { pedidoVision } from "@/lib/revision/scout";

function conInterruptor(valor: string | undefined, trabajo: () => Promise<void> | void): Promise<void> | void {
  const previo = process.env.HYTO_TIPO_CUENTA;
  if (valor === undefined) delete process.env.HYTO_TIPO_CUENTA;
  else process.env.HYTO_TIPO_CUENTA = valor;
  const hecho = trabajo();
  const restaurar = () => {
    if (previo === undefined) delete process.env.HYTO_TIPO_CUENTA;
    else process.env.HYTO_TIPO_CUENTA = previo;
  };
  if (hecho instanceof Promise) return hecho.finally(restaurar);
  restaurar();
}

test("el tipo de cuenta solo se enciende con on", () => {
  assert.equal(tipoCuentaActivo({}), false);
  assert.equal(tipoCuentaActivo({ HYTO_TIPO_CUENTA: "off" }), false);
  assert.equal(tipoCuentaActivo({ HYTO_TIPO_CUENTA: "true" }), false);
  assert.equal(tipoCuentaActivo({ HYTO_TIPO_CUENTA: "ON" }), true);
  assert.equal(tipoCuentaActivo({ HYTO_TIPO_CUENTA: " on " }), true);
});

test("apagado no lee el perfil y el pedido de Mile no cambia", async () => {
  await conInterruptor(undefined, async () => {
    const almacen = crearMemoria();
    let lecturas = 0;
    almacen.leerUsuario = async () => {
      lecturas += 1;
      return null;
    };
    const lista = await leerTipoCuentaHttp(almacen, "ana");
    assert.equal(lista.status, 404);
    const guardado = await guardarTipoCuentaHttp(almacen, "ana", { tipo: "voluntario" });
    assert.equal(guardado.status, 404);
    assert.equal(await organizacionDeEvento(almacen, "evt"), null);
    assert.equal(lecturas, 0);
    const base = pedidoVision({ condicion: "Photo of the booth", tipoTarea: "trabajo" });
    assert.equal(pedidoVision({ condicion: "Photo of the booth", tipoTarea: "trabajo", organizacion: "We cook for the fair." }), base);
  });
});

test("empresa guarda el perfil, no cambia el rol, y Mile recibe la descripción", async () => {
  await conInterruptor("on", async () => {
    const alto = leerPerfilCuenta({
      tipo: "empresa",
      nombre: "Norte",
      actividad: "Ferias",
      descripcion: "We cook for the fair.",
      fotoUrl: "https://example.com/norte.png",
    });
    assert.equal("aviso" in alto, false);
    assert.equal(leerPerfilCuenta({ tipo: "empresa", nombre: "Norte", actividad: "Ferias", descripcion: "Hola", fotoUrl: "http://example.com/a.png" }) && "aviso" in leerPerfilCuenta({ tipo: "empresa", nombre: "Norte", actividad: "Ferias", descripcion: "Hola", fotoUrl: "http://example.com/a.png" }), true);

    const almacen = crearMemoria();
    await almacen.insertarUsuario({ id: "ana", email: "ana@hyto.test", nombre: "Ana", rol: "organizador" });
    await almacen.crearProyecto(
      { id: "evt", nombre: "Feria", creadoEn: "2026-10-08T00:00:00.000Z", organizadorId: "ana" },
      [],
    );
    await almacen.guardarMiembro({
      proyectoId: "evt",
      usuarioId: "ana",
      rol: "organizer",
      estado: "active",
      creadoEn: "2026-10-08T00:00:00.000Z",
    });
    const guardado = await guardarTipoCuentaHttp(almacen, "ana", {
      tipo: "empresa",
      nombre: "Norte",
      actividad: "Ferias",
      descripcion: "We cook for the fair.",
      fotoUrl: "https://example.com/norte.png",
    });
    assert.equal(guardado.status, 200);
    const usuario = await almacen.leerUsuario("ana");
    assert.equal(usuario?.rol, "organizador");
    assert.equal(usuario?.tipoCuenta, "empresa");
    assert.equal((await almacen.listarMiembros("evt")).find((miembro) => miembro.usuarioId === "ana")?.rol, "organizer");
    assert.equal(await organizacionDeEvento(almacen, "evt"), "We cook for the fair.");
    const base = pedidoVision({ condicion: "Photo of the booth", tipoTarea: "trabajo" });
    const conEmpresa = pedidoVision({
      condicion: "Photo of the booth",
      tipoTarea: "trabajo",
      organizacion: "We cook for the fair.",
    });
    assert.notEqual(conEmpresa, base);
    assert.match(conEmpresa, /<org_context>[\s\S]*We cook for the fair\./);
    assert.equal(pedidoVision({ condicion: "Photo of the booth", tipoTarea: "trabajo", organizacion: "   " }), base);

    const voluntario = await guardarTipoCuentaHttp(almacen, "ana", { tipo: "voluntario" });
    assert.equal(voluntario.status, 200);
    assert.equal((await almacen.leerUsuario("ana"))?.tipoCuenta, "voluntario");
    assert.equal((await almacen.leerUsuario("ana"))?.empresaDescripcion ?? null, null);
    assert.equal((await almacen.leerUsuario("ana"))?.rol, "organizador");
    assert.equal(await organizacionDeEvento(almacen, "evt"), null);
  });
});
