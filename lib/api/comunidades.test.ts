import assert from "node:assert/strict";
import test from "node:test";
import { crearComunidadHttp, listarComunidadesHttp, leerComunidadHttp, resolverSolicitudHttp, unirseComunidadHttp, unirsePorCodigoHttp, vincularEventoHttp } from "@/lib/api/comunidades";
import { crearProyectoHttp } from "@/lib/api/proyectos";
import { comunidadesActivas } from "@/lib/comunidades/bandera";
import { codigoComunidad, filtrarPublicas, leerAltaComunidad, normalizarCodigo } from "@/lib/comunidades/reglas";
import { crearMemoria } from "@/lib/db/memoria";
import type { Almacen } from "@/lib/db/almacen";
import type { Comunidad } from "@/lib/db/tipos";

const ENV = "HYTO_COMUNIDADES";

function conInterruptor(valor: string | undefined, trabajo: () => Promise<void>): Promise<void> {
  const previo = process.env[ENV];
  if (valor === undefined) delete process.env[ENV];
  else process.env[ENV] = valor;
  return trabajo().finally(() => {
    if (previo === undefined) delete process.env[ENV];
    else process.env[ENV] = previo;
  });
}

test("el interruptor solo se enciende con on", () => {
  assert.equal(comunidadesActivas({}), false);
  assert.equal(comunidadesActivas({ HYTO_COMUNIDADES: "" }), false);
  assert.equal(comunidadesActivas({ HYTO_COMUNIDADES: "off" }), false);
  assert.equal(comunidadesActivas({ HYTO_COMUNIDADES: "true" }), false);
  assert.equal(comunidadesActivas({ HYTO_COMUNIDADES: "ON" }), true);
  assert.equal(comunidadesActivas({ HYTO_COMUNIDADES: " on " }), true);
});

test("el código no usa caracteres que se confunden y la búsqueda deja fuera las privadas", () => {
  const codigo = codigoComunidad(Uint8Array.from({ length: 10 }, () => 0));
  assert.equal(codigo.length, 10);
  assert.equal(normalizarCodigo(` ${codigo.toLowerCase()} `), codigo);
  assert.equal(normalizarCodigo("IIIIIIIIII"), null);
  assert.equal(normalizarCodigo("corto"), null);
  const publica: Comunidad = {
    id: "c1",
    nombre: "Feria verde",
    descripcion: "Comida de la calle",
    fotoUrl: null,
    visibilidad: "publica",
    codigo: "AAAAAAAAAA",
    creadoEn: "2026-10-08T00:00:00.000Z",
    creadorId: "ana",
  };
  const privada: Comunidad = { ...publica, id: "c2", nombre: "Feria privada", visibilidad: "privada" };
  assert.deepEqual(filtrarPublicas([publica, privada], "verde").map((item) => item.id), ["c1"]);
  assert.deepEqual(filtrarPublicas([publica, privada], "").map((item) => item.id), ["c1"]);
  const alta = leerAltaComunidad({ nombre: "  Norte ", descripcion: "Ayuda", visibilidad: "privada", fotoUrl: "https://example.com/a.png" });
  assert.equal("aviso" in alta, false);
  assert.equal(leerAltaComunidad({ nombre: "Norte", fotoUrl: "http://example.com/a.png" }) && "aviso" in leerAltaComunidad({ nombre: "Norte", fotoUrl: "http://example.com/a.png" }), true);
});

async function sembrar(almacen: Almacen) {
  await almacen.insertarUsuario({ id: "ana", email: "ana@hyto.test", nombre: "Ana", rol: "organizador" });
  await almacen.insertarUsuario({ id: "leo", email: "leo@hyto.test", nombre: "Leo", rol: "voluntario" });
  await almacen.insertarUsuario({ id: "sol", email: "sol@hyto.test", nombre: "Sol", rol: "voluntario" });
}

test("apagado no consulta comunidades y crear un evento sigue igual", async () => {
  await conInterruptor(undefined, async () => {
    const almacen = crearMemoria();
    let consultas = 0;
    almacen.listarComunidades = async () => {
      consultas += 1;
      return [];
    };
    almacen.leerComunidad = async () => {
      consultas += 1;
      return null;
    };
    const lista = await listarComunidadesHttp(almacen, "ana", "");
    assert.equal(lista.status, 404);
    assert.equal(consultas, 0);
    await sembrar(almacen);
    const creado = await crearProyectoHttp(
      pedido({ nombre: "ZEEK", tareas: [{ titulo: "Montar", tipo: "trabajo", monto: "20", condicion: "Foto del stand" }] }),
      almacen,
      "ana",
    );
    assert.equal(creado.status, 201);
    const proyectos = await almacen.listarProyectos();
    assert.equal(proyectos.length, 1);
    assert.equal(proyectos[0]?.comunidadId ?? null, null);
    assert.equal(consultas, 0);
    const miembros = await almacen.listarMiembros(proyectos[0]!.id);
    assert.equal(miembros.find((miembro) => miembro.usuarioId === "ana")?.rol, "organizer");
  });
});

const APAGADOS = ["", "off", "OFF", "true", "yes", "1", "enabled", "onn", " onn "] as const;

test("un valor que no es on no consulta comunidades ni guarda comunidad_id", async () => {
  for (const valor of APAGADOS) {
    await conInterruptor(valor, async () => {
      assert.equal(comunidadesActivas(), false, valor);
      const almacen = crearMemoria();
      await sembrar(almacen);
      const lista = await listarComunidadesHttp(almacen, "ana", "norte");
      assert.equal(lista.status, 404, valor);
      const creado = await crearProyectoHttp(
        pedido({
          nombre: "ZEEK",
          comunidadId: "c-ajena",
          tareas: [{ titulo: "Montar", tipo: "trabajo", monto: "20", condicion: "Foto del stand" }],
        }),
        almacen,
        "ana",
      );
      assert.equal(creado.status, 201, valor);
      const proyectos = await almacen.listarProyectos();
      assert.equal(proyectos.length, 1);
      assert.equal(proyectos[0]?.comunidadId ?? null, null);
      await almacen.crearProyecto(
        {
          id: "directo",
          nombre: "Directo",
          creadoEn: "2026-10-08T00:00:00.000Z",
          organizadorId: "ana",
          comunidadId: "c-ajena",
        },
        [],
      );
      assert.equal((await almacen.leerProyecto("directo"))?.comunidadId ?? null, null);
      await almacen.crearComunidad({
        id: "c-ajena",
        nombre: "Ajena",
        descripcion: "",
        fotoUrl: null,
        visibilidad: "publica",
        codigo: "AAAAAAAAAA",
        creadoEn: "2026-10-08T00:00:00.000Z",
        creadorId: "ana",
      });
      await almacen.guardarMiembroComunidad({
        comunidadId: "c-ajena",
        usuarioId: "ana",
        rol: "admin",
        creadoEn: "2026-10-08T00:00:00.000Z",
      });
      await almacen.fijarComunidadProyecto("directo", "c-ajena");
      assert.equal(await almacen.leerComunidad("c-ajena"), null);
      assert.deepEqual(await almacen.listarComunidades(), []);
      assert.deepEqual(await almacen.comunidadesDeUsuario("ana"), []);
      assert.equal((await almacen.leerProyecto("directo"))?.comunidadId ?? null, null);
      assert.equal((await almacen.leerUsuario("ana"))?.rol, "organizador");
    });
  }
});

test("pública se une directo, privada pide aprobación y el código entra", async () => {
  await conInterruptor("on", async () => {
    const almacen = crearMemoria();
    await sembrar(almacen);
    const creada = await crearComunidadHttp(almacen, "ana", { nombre: "Norte", descripcion: "Empresa", visibilidad: "publica" });
    assert.equal(creada.status, 201);
    const cuerpo = (await creada.json()) as { comunidad: { id: string; codigo: string } };
    const unido = await unirseComunidadHttp(almacen, "leo", cuerpo.comunidad.id);
    assert.equal(unido.status, 201);
    assert.equal((await almacen.miembroComunidad(cuerpo.comunidad.id, "leo"))?.rol, "miembro");
    const otra = await unirseComunidadHttp(almacen, "leo", cuerpo.comunidad.id);
    assert.equal(otra.status, 200);

    const privada = await crearComunidadHttp(almacen, "ana", { nombre: "Sur", visibilidad: "privada" });
    const sur = (await privada.json()) as { comunidad: { id: string; codigo: string } };
    const pide = await unirseComunidadHttp(almacen, "sol", sur.comunidad.id);
    assert.equal((await pide.json()).estado, "pendiente");
    const repetida = await unirseComunidadHttp(almacen, "sol", sur.comunidad.id);
    assert.equal(repetida.status, 200);
    assert.equal((await almacen.listarSolicitudesComunidad(sur.comunidad.id)).length, 1);
    const ajena = await resolverSolicitudHttp(almacen, "leo", sur.comunidad.id, {
      solicitudId: (await almacen.listarSolicitudesComunidad(sur.comunidad.id))[0]?.id,
      decision: "aprobada",
    });
    assert.equal(ajena.status, 403);
    const solicitudId = (await almacen.listarSolicitudesComunidad(sur.comunidad.id))[0]!.id;
    const aprobada = await resolverSolicitudHttp(almacen, "ana", sur.comunidad.id, { solicitudId, decision: "aprobada" });
    assert.equal(aprobada.status, 200);
    assert.equal((await almacen.miembroComunidad(sur.comunidad.id, "sol"))?.rol, "miembro");

    const porCodigo = await unirsePorCodigoHttp(almacen, "leo", { codigo: sur.comunidad.codigo.toLowerCase() });
    assert.equal(porCodigo.status, 201);
    assert.equal((await almacen.miembroComunidad(sur.comunidad.id, "leo"))?.rol, "miembro");
    const detalle = await leerComunidadHttp(almacen, "leo", sur.comunidad.id);
    const vista = (await detalle.json()) as { comunidad: { codigo?: string }; miembros: { usuarioId: string }[] };
    assert.equal(vista.comunidad.codigo, undefined);
    assert.ok(vista.miembros.some((miembro) => miembro.usuarioId === "leo"));
  });
});

test("el rol de la comunidad no cambia el rol de la cuenta ni el del evento", async () => {
  await conInterruptor("on", async () => {
    const almacen = crearMemoria();
    await sembrar(almacen);
    const creado = await crearProyectoHttp(
      pedido({
        nombre: "Feria",
        tareas: [{ titulo: "Cocinar", tipo: "trabajo", monto: "15", condicion: "Foto de la cocina" }],
      }),
      almacen,
      "ana",
    );
    assert.equal(creado.status, 201);
    const eventoId = ((await creado.json()) as { proyecto: { id: string } }).proyecto.id;
    await almacen.guardarMiembro({
      proyectoId: eventoId,
      usuarioId: "leo",
      rol: "volunteer",
      estado: "active",
      creadoEn: "2026-10-08T00:00:00.000Z",
    });
    const comunidad = await crearComunidadHttp(almacen, "ana", { nombre: "Norte", visibilidad: "publica" });
    const comunidadId = ((await comunidad.json()) as { comunidad: { id: string } }).comunidad.id;
    const unido = await unirseComunidadHttp(almacen, "leo", comunidadId);
    assert.equal(unido.status, 201);
    assert.equal((await almacen.leerUsuario("ana"))?.rol, "organizador");
    assert.equal((await almacen.leerUsuario("leo"))?.rol, "voluntario");
    assert.equal((await almacen.miembroComunidad(comunidadId, "ana"))?.rol, "admin");
    assert.equal((await almacen.miembroComunidad(comunidadId, "leo"))?.rol, "miembro");
    assert.equal((await almacen.listarMiembros(eventoId)).find((miembro) => miembro.usuarioId === "ana")?.rol, "organizer");
    assert.equal((await almacen.listarMiembros(eventoId)).find((miembro) => miembro.usuarioId === "leo")?.rol, "volunteer");
  });
});

test("vincular un evento no cambia el rol por evento", async () => {
  await conInterruptor("on", async () => {
    const almacen = crearMemoria();
    await sembrar(almacen);
    const comunidad = await crearComunidadHttp(almacen, "ana", { nombre: "Norte", visibilidad: "publica" });
    const comunidadId = ((await comunidad.json()) as { comunidad: { id: string } }).comunidad.id;
    await unirseComunidadHttp(almacen, "leo", comunidadId);
    const creado = await crearProyectoHttp(
      pedido({
        nombre: "Feria",
        comunidadId,
        tareas: [{ titulo: "Cocinar", tipo: "trabajo", monto: "15", condicion: "Foto de la cocina" }],
      }),
      almacen,
      "ana",
    );
    assert.equal(creado.status, 201);
    const eventoId = ((await creado.json()) as { proyecto: { id: string } }).proyecto.id;
    assert.equal((await almacen.leerProyecto(eventoId))?.comunidadId, comunidadId);
    assert.equal((await almacen.listarMiembros(eventoId)).find((miembro) => miembro.usuarioId === "ana")?.rol, "organizer");
    await almacen.guardarMiembro({
      proyectoId: eventoId,
      usuarioId: "leo",
      rol: "volunteer",
      estado: "active",
      creadoEn: "2026-10-08T00:00:00.000Z",
    });
    const bloqueado = await vincularEventoHttp(almacen, "leo", comunidadId, { proyectoId: eventoId }, true);
    assert.equal(bloqueado.status, 403);
    assert.equal((await almacen.leerProyecto(eventoId))?.comunidadId, comunidadId);
    assert.equal((await almacen.listarMiembros(eventoId)).find((miembro) => miembro.usuarioId === "leo")?.rol, "volunteer");
    const quitado = await vincularEventoHttp(almacen, "ana", comunidadId, { proyectoId: eventoId }, true);
    assert.equal(quitado.status, 200);
    assert.equal((await almacen.leerProyecto(eventoId))?.comunidadId, null);
    assert.equal((await almacen.listarMiembros(eventoId)).find((miembro) => miembro.usuarioId === "ana")?.rol, "organizer");
    assert.equal((await almacen.listarMiembros(eventoId)).find((miembro) => miembro.usuarioId === "leo")?.rol, "volunteer");
  });
});

function pedido(body: unknown): Request {
  return new Request("http://local/api/proyectos", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}
