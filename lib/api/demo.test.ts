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
import { SESION_SIN_EXP_SEGUNDOS } from "../sesion/cookie";
import { AVISO_PAGO_DEMO_SIN_FOTO, crearDemoHttp, estadoDemoHttp, pagarDemoHttp } from "./demo";
import { cerrarSesionHttp, leerSesionHttp } from "./sesion";

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
    wallet: "",
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
    assert.match(ajeno.headers.get("set-cookie") ?? "", new RegExp(`hyto_sesion=.*Max-Age=${SESION_SIN_EXP_SEGUNDOS}`));

    const organizador = await crearDemoHttp(pedido("organizador", "203.0.113.12"), almacen, ENV_ON);
    assert.equal(organizador.status, 200);
    const cuerpo = (await organizador.json()) as { email: string; rol: string };
    assert.equal(cuerpo.email, "demo-organizador@hyto.demo");
    assert.equal(cuerpo.rol, "organizador");

    const otra = await crearDemoHttp(pedido("organizador", "203.0.113.13"), almacen, ENV_ON);
    assert.equal(otra.status, 200);
    const filas = (await almacen.listarUsuarios()).filter((usuario) => usuario.email === "demo-organizador@hyto.demo");
    assert.equal(filas.length, 1);
    assert.equal(filas[0]?.nombre, "Organizer (demo)");
  });

  test("la semilla deja las filas demo aunque ya haya equipo", async () => {
    const almacen = crearMemoria();
    await almacen.insertarUsuario({
      id: "organizador",
      email: "organizador@demo.hyto",
      nombre: "Organizer",
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

  test("cerrar sesión borra la fila y expira la cookie", async () => {
    const almacen = crearMemoria();
    await almacen.crearSesion(sesion({ token: "tok-cerrar" }));
    const respuesta = await cerrarSesionHttp(
      new Request("http://local/api/sesion", { method: "DELETE", headers: { cookie: "hyto_sesion=tok-cerrar" } }),
      almacen,
    );
    assert.equal(respuesta.status, 200);
    assert.equal(await almacen.leerSesion("tok-cerrar"), null);
    const cookie = respuesta.headers.get("set-cookie") ?? "";
    assert.match(cookie, /hyto_sesion=/);
    assert.match(cookie, /Max-Age=0/);

    const vacia = await cerrarSesionHttp(new Request("http://local/api/sesion", { method: "DELETE" }), almacen);
    assert.equal(vacia.status, 200);
    assert.match(vacia.headers.get("set-cookie") ?? "", /Max-Age=0/);

    await almacen.crearSesion(sesion({ token: "tok-vieja", expiraEn: new Date(Date.now() - 1000).toISOString() }));
    const lectura = await leerSesionHttp(
      new Request("http://local/api/sesion", { headers: { cookie: "hyto_sesion=tok-vieja" } }),
      almacen,
    );
    assert.equal(lectura.status, 401);
    assert.equal((await lectura.json()).aviso, "Sign in to continue.");
    const borrada = await cerrarSesionHttp(
      new Request("http://local/api/sesion", { method: "DELETE", headers: { cookie: "hyto_sesion=tok-vieja" } }),
      almacen,
    );
    assert.equal(borrada.status, 200);
    assert.equal(await almacen.leerSesion("tok-vieja"), null);

    const viva = await leerSesionHttp(
      new Request("http://local/api/sesion", { headers: { cookie: "hyto_sesion=tok-viva" } }),
      almacen,
    );
    assert.equal(viva.status, 401);
    await almacen.crearSesion(sesion({ token: "tok-viva", email: "organizador@demo.hyto", usuarioId: "organizador" }));
    const activa = await leerSesionHttp(
      new Request("http://local/api/sesion", { headers: { cookie: "hyto_sesion=tok-viva" } }),
      almacen,
    );
    assert.equal(activa.status, 200);
    assert.deepEqual(await activa.json(), { ok: true, rol: "organizador", demo: false });
  });

  test("cambiar de rol invalida la sesión demo anterior", async () => {
    reiniciarLimite();
    const almacen = crearMemoria();
    const primera = await crearDemoHttp(pedido("organizador", "203.0.113.40"), almacen, ENV_ON);
    assert.equal(primera.status, 200);
    const cookie = primera.headers.get("set-cookie") ?? "";
    const token = decodeURIComponent(/hyto_sesion=([^;]+)/.exec(cookie)?.[1] ?? "");
    assert.equal((await almacen.leerSesion(token))?.rol, "organizador");

    await almacen.crearSesion(
      sesion({
        token: "sesion-real",
        email: "organizador@demo.hyto",
        usuarioId: "organizador",
        rol: "organizador",
      }),
    );
    const real = await crearDemoHttp(
      new Request("http://local/api/sesion/demo", {
        method: "POST",
        headers: { cookie: "hyto_sesion=sesion-real", "content-type": "application/json", "x-forwarded-for": "203.0.113.42" },
        body: JSON.stringify({ rol: "voluntario" }),
      }),
      almacen,
      ENV_ON,
    );
    assert.equal(real.status, 200);
    assert.equal((await almacen.leerSesion("sesion-real"))?.email, "organizador@demo.hyto");

    const cambio = await crearDemoHttp(
      new Request("http://local/api/sesion/demo", {
        method: "POST",
        headers: { cookie: `hyto_sesion=${token}`, "content-type": "application/json", "x-forwarded-for": "203.0.113.41" },
        body: JSON.stringify({ rol: "voluntario" }),
      }),
      almacen,
      ENV_ON,
    );
    assert.equal(cambio.status, 200);
    assert.equal(((await cambio.json()) as { rol: string }).rol, "voluntario");
    assert.equal(await almacen.leerSesion(token), null);
    const nuevo = decodeURIComponent(/hyto_sesion=([^;]+)/.exec(cambio.headers.get("set-cookie") ?? "")?.[1] ?? "");
    assert.notEqual(nuevo, token);
    assert.equal((await almacen.leerSesion(nuevo))?.rol, "voluntario");
    assert.equal((await almacen.leerSesion(nuevo))?.wallet, "");
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

  test("el pago demo solo existe con la bandera y para el organizador demo del evento demo", async () => {
    const anterior = process.env.HYTO_DEMO_LOGIN;
    process.env.HYTO_DEMO_LOGIN = "1";
    try {
      const almacen = crearMemoria();
      await asegurarSemilla(almacen);
      const organizador = sesion();
      const voluntario = sesion({ email: "demo-voluntario@hyto.demo", usuarioId: "demo-voluntario", rol: "voluntario" });
      const real = sesion({ email: "organizador@demo.hyto", usuarioId: "organizador", rol: "organizador" });
      assert.equal((await almacen.leerTarea("demo-stand"))?.estado, "en revisión");

      assert.equal((await pagarDemoHttp(almacen, organizador, "demo-stand", ENV_OFF)).status, 404);
      assert.equal((await pagarDemoHttp(almacen, real, "demo-stand", ENV_ON)).status, 404);
      assert.equal((await pagarDemoHttp(almacen, real, "stand", ENV_ON)).status, 404);
      assert.equal((await pagarDemoHttp(almacen, voluntario, "demo-stand", ENV_ON)).status, 403);
      assert.equal((await pagarDemoHttp(almacen, organizador, "stand", ENV_ON)).status, 403);
      assert.equal((await pagarDemoHttp(almacen, organizador, "no-existe", ENV_ON)).status, 404);
      assert.equal((await almacen.leerTarea("demo-stand"))?.estado, "en revisión");
      assert.equal((await almacen.leerTarea("stand"))?.estado, "pendiente");

      const sinFoto = await pagarDemoHttp(almacen, organizador, "demo-bienvenida", ENV_ON);
      assert.equal(sinFoto.status, 409);
      assert.equal(((await sinFoto.json()) as { aviso: string }).aviso, AVISO_PAGO_DEMO_SIN_FOTO);
      assert.equal((await almacen.leerTarea("demo-bienvenida"))?.estado, "pendiente");

      const pagada = await pagarDemoHttp(almacen, organizador, "demo-stand", ENV_ON);
      assert.equal(pagada.status, 200);
      assert.deepEqual(await pagada.json(), { estado: "pagado", demo: true });
      const fila = await almacen.leerTarea("demo-stand");
      assert.equal(fila?.estado, "pagado");
      assert.equal(fila?.hashPago ?? null, null);
      assert.equal(fila?.contratoEscrow ?? null, null);

      const otraVez = await pagarDemoHttp(almacen, organizador, "demo-stand", ENV_ON);
      assert.equal(otraVez.status, 200);
    } finally {
      if (anterior === undefined) delete process.env.HYTO_DEMO_LOGIN;
      else process.env.HYTO_DEMO_LOGIN = anterior;
    }
  });

  test("el pago demo de un reembolso deja un monto confirmado dentro del tope", async () => {
    const anterior = process.env.HYTO_DEMO_LOGIN;
    process.env.HYTO_DEMO_LOGIN = "1";
    try {
      const almacen = crearMemoria();
      await asegurarSemilla(almacen);
      const tarea = await almacen.leerTarea("demo-comida");
      assert.equal(tarea?.tipo, "reembolso");
      await almacen.actualizarTarea("demo-comida", { estado: "en revisión" });
      const evidencia = await almacen.ultimaEvidencia("demo-comida");
      assert.ok(evidencia);
      await almacen.actualizarEvidencia(evidencia.id, { monto: "999", montoConfirmado: null });

      const pagada = await pagarDemoHttp(almacen, sesion(), "demo-comida", ENV_ON);
      assert.equal(pagada.status, 200);
      assert.equal((await almacen.leerTarea("demo-comida"))?.estado, "pagado");
      const confirmado = (await almacen.ultimaEvidencia("demo-comida"))?.montoConfirmado;
      assert.ok(confirmado);
      assert.ok(Number(confirmado) > 0 && Number(confirmado) <= Number(tarea?.tope ?? tarea?.monto));
    } finally {
      if (anterior === undefined) delete process.env.HYTO_DEMO_LOGIN;
      else process.env.HYTO_DEMO_LOGIN = anterior;
    }
  });
});
