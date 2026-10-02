import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { GET as leerNovedadesHttp } from "../../app/api/eventos/[id]/novedades/route";
import type { Almacen } from "../db/almacen";
import { crearMemoria } from "../db/memoria";
import { asegurarSemilla } from "../db/semilla";
import type { SesionFila } from "../db/tipos";
import { novedadesHttp } from "./novedades";

describe("novedades del organizador", { concurrency: false }, () => {
  test("el organizador recibe ids y tiempos, y el mismo cursor responde 304", async () => {
    const almacen = crearMemoria();
    await asegurarSemilla(almacen);
    await almacen.asignarOrganizador("zeek", "organizador");
    const primero = await novedadesHttp(almacen, organizador(), "zeek", pedido("/api/eventos/zeek/novedades"));
    assert.equal(primero.status, 200);
    assert.match(primero.headers.get("cache-control") ?? "", /private, no-store/);
    const cuerpo = (await primero.json()) as { cursor: string; hasta: string | null; cambios: Marca[] };
    assert.match(cuerpo.cursor, /^[a-f0-9]{32}$/);
    assert.equal(primero.headers.get("etag"), `"${cuerpo.cursor}"`);
    const stand = cuerpo.cambios.find((item) => item.tareaId === "stand");
    assert.equal(stand?.evidenciaId, "ejemplo-stand");
    assert.equal(stand?.veredicto, "cumplió");
    assert.equal(stand?.origen, "guion");
    assert.ok(stand?.creadaEn);
    assert.equal(JSON.stringify(cuerpo).includes("frase"), false);
    assert.equal(JSON.stringify(cuerpo).includes("foto"), false);

    const igual = await novedadesHttp(
      almacen,
      organizador(),
      "zeek",
      pedido(`/api/eventos/zeek/novedades?since=${cuerpo.cursor}`, { "if-none-match": `W/"${cuerpo.cursor}"` }),
    );
    assert.equal(igual.status, 304);
    assert.equal(await igual.text(), "");
    assert.equal(igual.headers.get("etag"), `"${cuerpo.cursor}"`);
  });

  test("una foto nueva y un veredicto nuevo cambian el cursor aunque la fecha de la foto no avance", async () => {
    const almacen = crearMemoria();
    await asegurarSemilla(almacen);
    await almacen.asignarOrganizador("zeek", "organizador");
    const antes = await leer(almacen);
    await almacen.crearEvidencia({
      id: "ev-nueva",
      tareaId: "bienvenida",
      blobId: "blob-real",
      monto: null,
      montoConfirmado: null,
      fecha: null,
      creadaEn: "2026-10-02T08:00:00.000Z",
    });
    await almacen.actualizarTarea("bienvenida", { estado: "en revisión" });
    const conFoto = await leer(almacen);
    assert.notEqual(conFoto.cursor, antes.cursor);
    const nueva = conFoto.cambios.find((item) => item.tareaId === "bienvenida");
    assert.equal(nueva?.evidenciaId, "ev-nueva");
    assert.equal(nueva?.creadaEn, "2026-10-02T08:00:00.000Z");
    assert.equal(nueva?.veredicto, null);

    const previo = await almacen.veredictoDe("ejemplo-stand");
    assert.ok(previo);
    await almacen.guardarVeredicto({
      ...previo,
      veredicto: "insuficiente",
      frase: "NO-DEBE-SALIR-EN-EL-SONDEO",
      origen: "scout",
    });
    const conNota = await novedadesHttp(
      almacen,
      organizador(),
      "zeek",
      pedido("/api/eventos/zeek/novedades?since=2099-01-01T00:00:00.000Z"),
    );
    assert.equal(conNota.status, 200);
    const cuerpo = (await conNota.json()) as { cursor: string; cambios: Marca[] };
    assert.notEqual(cuerpo.cursor, conFoto.cursor);
    assert.equal(JSON.stringify(cuerpo).includes("NO-DEBE-SALIR-EN-EL-SONDEO"), false);
    assert.equal(cuerpo.cambios.find((item) => item.tareaId === "stand")?.veredicto, "insuficiente");
    assert.equal(cuerpo.cambios.find((item) => item.tareaId === "stand")?.origen, "scout");
  });

  test("el sondeo no reescribe el estado de una tarea de ejemplo", async () => {
    const almacen = crearMemoria();
    await asegurarSemilla(almacen);
    await almacen.asignarOrganizador("zeek", "organizador");
    await almacen.actualizarTarea("stand", { estado: "en revisión" });
    const respuesta = await novedadesHttp(almacen, organizador(), "zeek", pedido("/api/eventos/zeek/novedades"));
    assert.equal(respuesta.status, 200);
    assert.equal((await almacen.leerTarea("stand"))?.estado, "en revisión");
  });

  test("solo el organizador del evento puede leer", async () => {
    const almacen = crearMemoria();
    await asegurarSemilla(almacen);
    await almacen.asignarOrganizador("zeek", "organizador");
    await almacen.guardarMiembro({
      proyectoId: "zeek",
      usuarioId: "voluntario-2",
      rol: "team",
      estado: "active",
      creadoEn: "2026-09-27T12:00:00.000Z",
    });
    for (const sesion of [
      { usuarioId: "voluntario-1", email: "voluntario1@demo.hyto" },
      { usuarioId: "voluntario-2", email: "voluntario2@demo.hyto" },
      { usuarioId: "nadie", email: "nadie@hyto.app" },
    ]) {
      const respuesta = await novedadesHttp(almacen, sesion, "zeek", pedido("/api/eventos/zeek/novedades"));
      assert.equal(respuesta.status, 403);
    }
    const vacio = await novedadesHttp(almacen, organizador(), " ", pedido("/api/eventos/%20/novedades"));
    assert.equal(vacio.status, 400);
    const ajeno = await novedadesHttp(almacen, organizador(), "otro", pedido("/api/eventos/otro/novedades"));
    assert.equal(ajeno.status, 403);
  });

  test("la demo del organizador lee su evento y no el de otra persona", async () => {
    const anterior = process.env.HYTO_DEMO_LOGIN;
    process.env.HYTO_DEMO_LOGIN = "1";
    try {
      const almacen = crearMemoria();
      await asegurarSemilla(almacen);
      await almacen.asignarOrganizador("zeek", "organizador");
      const demo = await novedadesHttp(
        almacen,
        { usuarioId: "demo-organizador", email: "demo-organizador@hyto.demo" },
        "demo",
        pedido("/api/eventos/demo/novedades"),
      );
      assert.equal(demo.status, 200);
      const cuerpo = (await demo.json()) as { cambios: { tareaId: string }[] };
      assert.equal(cuerpo.cambios.some((item) => item.tareaId === "demo-stand"), true);
      assert.equal(cuerpo.cambios.some((item) => item.tareaId === "stand"), false);

      const real = await novedadesHttp(almacen, organizador(), "zeek", pedido("/api/eventos/zeek/novedades"));
      assert.equal(real.status, 200);

      await almacen.asignarOrganizador("zeek", "demo-organizador");
      const cruzado = await novedadesHttp(
        almacen,
        { usuarioId: "demo-organizador", email: "demo-organizador@hyto.demo" },
        "zeek",
        pedido("/api/eventos/zeek/novedades"),
      );
      assert.equal(cruzado.status, 403);
      const voluntario = await novedadesHttp(
        almacen,
        { usuarioId: "demo-voluntario", email: "demo-voluntario@hyto.demo" },
        "demo",
        pedido("/api/eventos/demo/novedades"),
      );
      assert.equal(voluntario.status, 403);
    } finally {
      if (anterior === undefined) delete process.env.HYTO_DEMO_LOGIN;
      else process.env.HYTO_DEMO_LOGIN = anterior;
    }
  });

  test("la ruta exige la sesión y responde al organizador", async () => {
    const almacen = crearMemoria();
    await asegurarSemilla(almacen);
    await almacen.asignarOrganizador("zeek", "organizador");
    await almacen.crearSesion(filaSesion());
    const anterior = usar(almacen);
    try {
      const anon = await leerNovedadesHttp(pedido("/api/eventos/zeek/novedades"), { params: Promise.resolve({ id: "zeek" }) });
      assert.equal(anon.status, 401);
      const ok = await leerNovedadesHttp(pedido("/api/eventos/zeek/novedades", { cookie: "hyto_sesion=org" }), {
        params: Promise.resolve({ id: "zeek" }),
      });
      assert.equal(ok.status, 200);
      const cuerpo = (await ok.json()) as { cambios: { tareaId: string }[] };
      assert.equal(cuerpo.cambios.some((item) => item.tareaId === "stand"), true);
    } finally {
      restaurar(anterior);
    }
  });
});

type Marca = { tareaId: string; evidenciaId: string | null; creadaEn: string | null; veredicto: string | null; origen: string | null };

function organizador(): Pick<SesionFila, "usuarioId" | "email"> {
  return { usuarioId: "organizador", email: "organizador@demo.hyto" };
}

function pedido(ruta: string, headers: Record<string, string> = {}): Request {
  return new Request(`http://local${ruta}`, { headers });
}

async function leer(almacen: Almacen): Promise<{ cursor: string; cambios: Marca[] }> {
  const respuesta = await novedadesHttp(almacen, organizador(), "zeek", pedido("/api/eventos/zeek/novedades"));
  assert.equal(respuesta.status, 200);
  return (await respuesta.json()) as { cursor: string; cambios: Marca[] };
}

function filaSesion(): SesionFila {
  return {
    token: "org",
    email: "organizador@demo.hyto",
    usuarioId: "organizador",
    rol: "organizador",
    expiraEn: new Date(Date.now() + 60_000).toISOString(),
    wallet: "",
  };
}

type Gancho = () => Promise<Almacen | null>;

function usar(almacen: Almacen): Gancho | undefined {
  const tabla = globalThis as typeof globalThis & { __HYTO_ALMACEN_PRUEBA?: Gancho };
  const anterior = tabla.__HYTO_ALMACEN_PRUEBA;
  tabla.__HYTO_ALMACEN_PRUEBA = async () => almacen;
  return anterior;
}

function restaurar(anterior: Gancho | undefined): void {
  const tabla = globalThis as typeof globalThis & { __HYTO_ALMACEN_PRUEBA?: Gancho };
  tabla.__HYTO_ALMACEN_PRUEBA = anterior;
}
