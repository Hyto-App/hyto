import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { GET as estadoDemo, POST as entrarDemo } from "../../app/api/sesion/demo/route";
import { atenderEnviar } from "../../app/api/firma/enviar/route";
import { atenderPreparar } from "../../app/api/firma/route";
import { crearMemoria } from "../db/memoria";
import { asegurarSemilla } from "../db/semilla";
import type { SesionFila } from "../db/tipos";
import { reiniciarLimite } from "../escrow/limite";
import { AVISO_FIRMA_DEMO } from "../sesion/demo";
import { crearDemoHttp, estadoDemoHttp } from "./demo";

const ENV_ON = { HYTO_DEMO_LOGIN: "1" };
const ENV_OFF = { HYTO_DEMO_LOGIN: "" };

function pedido(rol: unknown, ip = "203.0.113.10"): Request {
  return new Request("http://local/api/sesion/demo", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify({ rol }),
  });
}

function sesion(parcial: Partial<SesionFila> = {}): SesionFila {
  return {
    token: "token-demo",
    email: "demo-organizador@hyto.demo",
    usuarioId: "demo-organizador",
    rol: "organizador",
    expiraEn: new Date(Date.now() + 60_000).toISOString(),
    ...parcial,
  };
}

describe("ingreso demo", { concurrency: false }, () => {
  test("la ruta responde 404 cuando la bandera está apagada", async () => {
    const anterior = process.env.HYTO_DEMO_LOGIN;
    delete process.env.HYTO_DEMO_LOGIN;
    try {
      for (const valor of [undefined, "", "0", "true", "yes"]) {
        if (valor === undefined) delete process.env.HYTO_DEMO_LOGIN;
        else process.env.HYTO_DEMO_LOGIN = valor;
        const respuesta = await entrarDemo(pedido("organizador"));
        assert.equal(respuesta.status, 404);
        const estado = await estadoDemo();
        assert.equal(estado.status, 200);
        assert.deepEqual(await estado.json(), { habilitado: false });
      }
    } finally {
      if (anterior === undefined) delete process.env.HYTO_DEMO_LOGIN;
      else process.env.HYTO_DEMO_LOGIN = anterior;
    }
  });

  test("GET publica la bandera sin llevarla al cliente como NEXT_PUBLIC", async () => {
    const apagado = await estadoDemoHttp(ENV_OFF);
    assert.deepEqual(await apagado.json(), { habilitado: false });
    const prendido = await estadoDemoHttp(ENV_ON);
    assert.deepEqual(await prendido.json(), { habilitado: true });
  });

  test("con la bandera crea la sesión del rol y no acepta otro", async () => {
    reiniciarLimite();
    const almacen = crearMemoria();
    const desconocido = await crearDemoHttp(pedido("admin"), almacen, ENV_ON);
    assert.equal(desconocido.status, 400);
    assert.equal((await almacen.listarUsuarios()).some((usuario) => usuario.email.endsWith("@hyto.demo")), false);

    const raro = await crearDemoHttp(pedido("organizador "), almacen, ENV_ON);
    assert.equal(raro.status, 400);

    const ajeno = await crearDemoHttp(
      new Request("http://local/api/sesion/demo?rol=organizador", {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.11" },
        body: JSON.stringify({ rol: "voluntario", email: "organizador@demo.hyto" }),
      }),
      almacen,
      ENV_ON,
    );
    assert.equal(ajeno.status, 200);
    const voluntario = (await ajeno.json()) as { email: string; rol: string; usuarioId: string; nombre: string; demo: boolean };
    assert.equal(voluntario.rol, "voluntario");
    assert.equal(voluntario.email, "demo-voluntario@hyto.demo");
    assert.equal(voluntario.usuarioId, "demo-voluntario");
    assert.match(voluntario.nombre, /demo/i);
    assert.equal(voluntario.demo, true);
    assert.match(ajeno.headers.get("set-cookie") ?? "", /hyto_sesion=/);

    const organizador = await crearDemoHttp(pedido("organizador", "203.0.113.12"), almacen, ENV_ON);
    assert.equal(organizador.status, 200);
    const cuerpo = (await organizador.json()) as { email: string; rol: string };
    assert.equal(cuerpo.email, "demo-organizador@hyto.demo");
    assert.equal(cuerpo.rol, "organizador");

    const otra = await crearDemoHttp(pedido("organizador", "203.0.113.13"), almacen, ENV_ON);
    assert.equal(otra.status, 200);
    const filas = (await almacen.listarUsuarios()).filter((usuario) => usuario.email === "demo-organizador@hyto.demo");
    assert.equal(filas.length, 1);
    assert.equal(filas[0]?.nombre, "Organizador (demo)");
  });

  test("la semilla deja las filas demo aunque ya haya equipo", async () => {
    const almacen = crearMemoria();
    await almacen.insertarUsuario({
      id: "organizador",
      email: "organizador@demo.hyto",
      nombre: "Organizador",
      rol: "organizador",
    });
    await asegurarSemilla(almacen);
    await asegurarSemilla(almacen);
    const demo = await almacen.usuarioPorEmail("demo-voluntario@hyto.demo");
    assert.equal(demo?.rol, "voluntario");
    assert.match(demo?.nombre ?? "", /demo/i);
    assert.equal((await almacen.listarUsuarios()).filter((usuario) => usuario.id === "demo-voluntario").length, 1);
    const real = await almacen.usuarioPorEmail("organizador@demo.hyto");
    assert.equal(real?.id, "organizador");
  });

  test("el límite por IP corta el ingreso demo", async () => {
    reiniciarLimite();
    const almacen = crearMemoria();
    for (let i = 0; i < 30; i += 1) {
      const respuesta = await crearDemoHttp(pedido("voluntario", "198.51.100.8"), almacen, ENV_ON);
      assert.equal(respuesta.status, 200);
    }
    const tope = await crearDemoHttp(pedido("voluntario", "198.51.100.8"), almacen, ENV_ON);
    assert.equal(tope.status, 429);
    const otraIp = await crearDemoHttp(pedido("organizador", "198.51.100.9"), almacen, ENV_ON);
    assert.equal(otraIp.status, 200);
    reiniciarLimite();
  });

  test("preparar y enviar rechazan la sesión demo", async () => {
    const cuerpo = new Request("http://local/api/firma", { method: "POST", body: "{}" });
    const envio = new Request("http://local/api/firma/enviar", { method: "POST", body: JSON.stringify({ xdr: "FIRMADO" }) });
    for (const actual of [
      sesion(),
      sesion({ email: "demo-voluntario@hyto.demo", usuarioId: "demo-voluntario", rol: "voluntario" }),
    ]) {
      const preparar = await atenderPreparar(cuerpo, actual);
      const enviar = await atenderEnviar(envio, actual);
      assert.equal(preparar.status, 403);
      assert.equal(enviar.status, 403);
      assert.equal(((await preparar.json()) as { aviso: string }).aviso, AVISO_FIRMA_DEMO);
      assert.equal(((await enviar.json()) as { aviso: string }).aviso, AVISO_FIRMA_DEMO);
    }

    const real = sesion({ email: "organizador@demo.hyto", usuarioId: "organizador", rol: "organizador" });
    const preparar = await atenderPreparar(new Request("http://local/api/firma", { method: "POST", body: "{}" }), real);
    const enviar = await atenderEnviar(new Request("http://local/api/firma/enviar", { method: "POST", body: "{}" }), real);
    assert.notEqual(preparar.status, 403);
    assert.equal(enviar.status, 400);
    assert.notEqual(((await preparar.json()) as { aviso: string }).aviso, AVISO_FIRMA_DEMO);
  });
});
