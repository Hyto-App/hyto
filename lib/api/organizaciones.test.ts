import assert from "node:assert/strict";
import test from "node:test";
import { crearMemoria } from "@/lib/db/memoria";
import type { Almacen } from "@/lib/db/almacen";
import { reiniciarLimite } from "@/lib/escrow/limite";
import { esAdminDeOrganizacion, registrarInvitado, registrarParticipacion, veCorreosDelEvento } from "@/lib/organizaciones/contactos";
import { canjearInvitacionHttp, crearInvitacionHttp } from "./invitaciones";
import {
  agregarAdminHttp,
  agregarContactoHttp,
  contactosDeEventoHttp,
  crearOrganizacionHttp,
  editarContactoHttp,
  editarOrganizacionHttp,
  leerOrganizacionHttp,
  listarAdminsHttp,
  listarContactosHttp,
  listarOrganizacionesHttp,
  quitarAdminHttp,
  quitarContactoHttp,
} from "./organizaciones";
import { crearProyectoHttp, leerProyectoHttp } from "./proyectos";

const AHORA = "2026-10-08T00:00:00.000Z";

function pedido(cuerpo: unknown): Request {
  return new Request("http://local/api", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(cuerpo),
  });
}

async function conBandera<T>(valor: string | undefined, trabajo: () => Promise<T>): Promise<T> {
  const previo = process.env.HYTO_ORGANIZACIONES;
  if (valor === undefined) delete process.env.HYTO_ORGANIZACIONES;
  else process.env.HYTO_ORGANIZACIONES = valor;
  try {
    return await trabajo();
  } finally {
    if (previo === undefined) delete process.env.HYTO_ORGANIZACIONES;
    else process.env.HYTO_ORGANIZACIONES = previo;
  }
}

async function escenario() {
  reiniciarLimite();
  const almacen = crearMemoria();
  for (const [id, nombre] of [["ana", "Ana"], ["luis", "Luis"], ["bea", "Bea"], ["cami", "Cami"]] as const) {
    await almacen.guardarUsuario({ id, email: `${id}@hyto.app`, nombre, rol: "voluntario" });
  }
  const creada = await crearOrganizacionHttp(almacen, "ana", { nombre: "Norte", descripcion: "Becas", etiquetas: ["becas", "Costa Rica"] });
  assert.equal(creada.status, 201);
  const organizacionId = ((await creada.json()) as { organizacion: { id: string } }).organizacion.id;
  return { almacen, organizacionId };
}

async function crearEvento(almacen: Almacen, organizadorId: string, extra: Record<string, unknown>, tareas?: unknown[]) {
  const respuesta = await crearProyectoHttp(
    pedido({ nombre: "Feria", tareas: tareas ?? [{ titulo: "Cajas", tipo: "trabajo", monto: "5" }], ...extra }),
    almacen,
    organizadorId,
  );
  return respuesta;
}

async function idDe(respuesta: Response): Promise<string> {
  return ((await respuesta.json()) as { proyecto: { id: string } }).proyecto.id;
}

async function unir(almacen: Almacen, proyectoId: string, organizadorId: string, usuarioId: string, secreto?: string) {
  let codigo = secreto;
  if (!codigo) {
    const invitacion = await crearInvitacionHttp(pedido({ tipo: "code", rol: "volunteer" }), almacen, proyectoId, organizadorId);
    codigo = ((await invitacion.json()) as { secreto: string }).secreto;
  }
  const respuesta = await canjearInvitacionHttp(pedido({ secreto: codigo }), almacen, usuarioId, `${usuarioId}@hyto.app`);
  assert.equal(respuesta.status, 200);
  return codigo;
}

test("con el interruptor apagado las rutas responden 404 y no se toca ninguna tabla de organizaciones", async () => {
  await conBandera(undefined, async () => {
    const real = crearMemoria();
    await real.guardarUsuario({ id: "ana", email: "ana@hyto.app", nombre: "Ana", rol: "voluntario" });
    const llamadas: string[] = [];
    const espia = new Proxy(real, {
      get(objetivo, propiedad, receptor) {
        if (typeof propiedad === "string") llamadas.push(propiedad);
        return Reflect.get(objetivo, propiedad, receptor);
      },
    }) as Almacen;
    for (const respuesta of [
      await listarOrganizacionesHttp(espia, "ana"),
      await crearOrganizacionHttp(espia, "ana", { nombre: "Norte" }),
      await leerOrganizacionHttp(espia, "ana", "o1"),
      await listarContactosHttp(espia, "ana", "o1"),
      await listarAdminsHttp(espia, "ana", "o1"),
      await contactosDeEventoHttp(espia, "ana", "p1"),
    ]) {
      assert.equal(respuesta.status, 404);
    }
    // An event created with an organization id behaves exactly as today: the id is ignored.
    const creado = await crearEvento(espia, "ana", { organizacionId: "o1" });
    assert.equal(creado.status, 201);
    const id = await idDe(creado);
    await unir(espia, id, "ana", "ana");
    await registrarParticipacion(espia, id, "ana", false);
    await registrarInvitado(espia, id, "x@hyto.app");
    assert.equal(await esAdminDeOrganizacion(espia, "o1", "ana"), false);
    assert.equal((await real.leerProyecto(id))?.organizacionId ?? null, null);
    const tocadas = llamadas.filter((nombre) =>
      /Organizacion|Admin|Voluntario/.test(nombre),
    );
    assert.deepEqual(tocadas, []);
  });
});

test("un valor distinto de on deja las organizaciones apagadas", async () => {
  for (const valor of ["", "off", "1", "true", "yes"]) {
    await conBandera(valor, async () => {
      const respuesta = await listarOrganizacionesHttp(crearMemoria(), "ana");
      assert.equal(respuesta.status, 404, valor);
    });
  }
  await conBandera("on", async () => {
    assert.equal((await listarOrganizacionesHttp(crearMemoria(), "ana")).status, 200);
  });
});

test("quien no administra la organización recibe 403 en contactos y administradores", async () => {
  await conBandera("on", async () => {
    const { almacen, organizacionId } = await escenario();
    await agregarContactoHttp(almacen, "ana", organizacionId, { email: "vol@hyto.app" });
    const respuestas = [
      await leerOrganizacionHttp(almacen, "luis", organizacionId),
      await editarOrganizacionHttp(almacen, "luis", organizacionId, { nombre: "Otro" }),
      await listarContactosHttp(almacen, "luis", organizacionId),
      await agregarContactoHttp(almacen, "luis", organizacionId, { email: "x@hyto.app" }),
      await editarContactoHttp(almacen, "luis", organizacionId, { email: "vol@hyto.app", etiquetas: ["x"] }),
      await quitarContactoHttp(almacen, "luis", organizacionId, { email: "vol@hyto.app" }),
      await listarAdminsHttp(almacen, "luis", organizacionId),
      await agregarAdminHttp(almacen, "luis", organizacionId, { email: "bea@hyto.app" }),
      await quitarAdminHttp(almacen, "luis", organizacionId, { usuarioId: "ana" }),
    ];
    for (const respuesta of respuestas) assert.equal(respuesta.status, 403);
    // Nothing changed.
    assert.equal((await almacen.leerOrganizacion(organizacionId))?.nombre, "Norte");
    assert.equal((await almacen.listarVoluntarios(organizacionId)).length, 1);
    assert.equal((await almacen.listarAdmins(organizacionId)).length, 1);
    assert.equal((await listarOrganizacionesHttp(almacen, "luis").then((r) => r.json())).organizaciones.length, 0);
  });
});

test("el creador es el primer administrador y la última persona administradora no se puede quitar", async () => {
  await conBandera("on", async () => {
    const { almacen, organizacionId } = await escenario();
    assert.equal(await esAdminDeOrganizacion(almacen, organizacionId, "ana"), true);

    const sinCuenta = await agregarAdminHttp(almacen, "ana", organizacionId, { email: "nadie@hyto.app" });
    assert.equal(sinCuenta.status, 404);
    const cuerpo = (await sinCuenta.json()) as { aviso: string; codigo: string };
    assert.equal(cuerpo.aviso, "This person needs a Hyto account first.");
    assert.equal(cuerpo.codigo, "sin_cuenta");

    const ultimo = await quitarAdminHttp(almacen, "ana", organizacionId, { usuarioId: "ana" });
    assert.equal(ultimo.status, 409);
    assert.equal(((await ultimo.json()) as { codigo: string }).codigo, "ultimo_admin");
    assert.equal((await almacen.listarAdmins(organizacionId)).length, 1);

    const agregado = await agregarAdminHttp(almacen, "ana", organizacionId, { email: "BEA@hyto.app" });
    assert.equal(agregado.status, 200);
    assert.equal(await esAdminDeOrganizacion(almacen, organizacionId, "bea"), true);

    const quitado = await quitarAdminHttp(almacen, "bea", organizacionId, { usuarioId: "ana" });
    assert.equal(quitado.status, 200);
    assert.equal(await esAdminDeOrganizacion(almacen, organizacionId, "ana"), false);
    const otraVez = await quitarAdminHttp(almacen, "bea", organizacionId, { usuarioId: "bea" });
    assert.equal(otraVez.status, 409);
    assert.equal(await esAdminDeOrganizacion(almacen, organizacionId, "bea"), true);
  });
});

test("el contacto se guarda con el correo en minúsculas y una persona puede estar en dos organizaciones", async () => {
  await conBandera("on", async () => {
    const { almacen, organizacionId } = await escenario();
    const otra = await crearOrganizacionHttp(almacen, "ana", { nombre: "Sur" });
    const otraId = ((await otra.json()) as { organizacion: { id: string } }).organizacion.id;

    const alta = await agregarContactoHttp(almacen, "ana", organizacionId, {
      email: "  Vol.Uno@Gmail.com ",
      nombre: "Vol Uno",
      etiquetas: ["Tech", "tech", " becas "],
    });
    assert.equal(alta.status, 201);
    const contacto = ((await alta.json()) as { contacto: { email: string; etiquetas: string[]; origen: string } }).contacto;
    assert.equal(contacto.email, "vol.uno@gmail.com");
    assert.deepEqual(contacto.etiquetas, ["Tech", "becas"]);
    assert.equal(contacto.origen, "manual");

    const repetido = await agregarContactoHttp(almacen, "ana", organizacionId, { email: "VOL.UNO@gmail.com" });
    assert.equal(repetido.status, 200);
    assert.equal((await almacen.listarVoluntarios(organizacionId)).length, 1);

    await agregarContactoHttp(almacen, "ana", otraId, { email: "vol.uno@gmail.com" });
    assert.equal((await almacen.listarVoluntarios(organizacionId)).length, 1);
    assert.equal((await almacen.listarVoluntarios(otraId)).length, 1);
    assert.equal((await agregarContactoHttp(almacen, "ana", organizacionId, { email: "no es correo" })).status, 400);

    const editado = await editarContactoHttp(almacen, "ana", organizacionId, { email: "VOL.UNO@gmail.com", etiquetas: ["nuevo"] });
    assert.equal(editado.status, 200);
    assert.deepEqual((await almacen.leerVoluntario(organizacionId, "vol.uno@gmail.com"))?.etiquetas, ["nuevo"]);
    assert.deepEqual((await almacen.leerVoluntario(otraId, "vol.uno@gmail.com"))?.etiquetas, []);

    const quitado = await quitarContactoHttp(almacen, "ana", organizacionId, { email: "vol.uno@gmail.com" });
    assert.equal(quitado.status, 200);
    assert.equal((await almacen.listarVoluntarios(organizacionId)).length, 0);
    assert.equal((await almacen.listarVoluntarios(otraId)).length, 1);
  });
});

test("al unirse a un evento de la organización se guarda el contacto y solo suma la primera vez por evento", async () => {
  await conBandera("on", async () => {
    const { almacen, organizacionId } = await escenario();
    const evento = await idDe(await crearEvento(almacen, "ana", { organizacionId }));
    const codigo = await unir(almacen, evento, "ana", "luis");

    let contacto = await almacen.leerVoluntario(organizacionId, "luis@hyto.app");
    assert.equal(contacto?.origen, "evento");
    assert.equal(contacto?.usuarioId, "luis");
    assert.equal(contacto?.nombre, "Luis");
    assert.equal(contacto?.participaciones, 1);
    assert.ok(contacto?.ultimaParticipacion);

    // The same person redeems again, and with a second code: still one participation in this event.
    await unir(almacen, evento, "ana", "luis", codigo);
    await unir(almacen, evento, "ana", "luis");
    contacto = await almacen.leerVoluntario(organizacionId, "luis@hyto.app");
    assert.equal(contacto?.participaciones, 1);

    // A second event of the organization adds one more.
    const segundo = await idDe(await crearEvento(almacen, "ana", { organizacionId }));
    await unir(almacen, segundo, "ana", "luis");
    assert.equal((await almacen.leerVoluntario(organizacionId, "luis@hyto.app"))?.participaciones, 2);

    // The organizer is never a contact of their own organization through joining.
    await unir(almacen, evento, "ana", "ana");
    assert.equal(await almacen.leerVoluntario(organizacionId, "ana@hyto.app"), null);
  });
});

test("un evento sin organización no guarda contactos y una tarea asignada cuenta una sola vez por evento", async () => {
  await conBandera("on", async () => {
    const { almacen, organizacionId } = await escenario();
    const libre = await idDe(await crearEvento(almacen, "ana", {}));
    await unir(almacen, libre, "ana", "luis");
    assert.equal((await almacen.listarVoluntarios(organizacionId)).length, 0);

    const dosTareas = [
      { titulo: "Cajas", tipo: "trabajo", monto: "5", asignado: "bea@hyto.app" },
      { titulo: "Mesas", tipo: "trabajo", monto: "5", asignado: "bea@hyto.app" },
    ];
    await crearEvento(almacen, "ana", { organizacionId }, dosTareas);
    const bea = await almacen.leerVoluntario(organizacionId, "bea@hyto.app");
    assert.equal(bea?.participaciones, 1);
    assert.equal(bea?.origen, "evento");
  });
});

test("invitar un correo nuevo desde un evento de la organización lo guarda como invitación", async () => {
  await conBandera("on", async () => {
    const { almacen, organizacionId } = await escenario();
    const evento = await idDe(await crearEvento(almacen, "ana", { organizacionId }));
    const invitacion = await crearInvitacionHttp(
      pedido({ tipo: "direct", email: "Nueva.Persona@Example.com", rol: "volunteer" }),
      almacen,
      evento,
      "ana",
    );
    assert.equal(invitacion.status, 201);
    const contacto = await almacen.leerVoluntario(organizacionId, "nueva.persona@example.com");
    assert.equal(contacto?.origen, "invitacion");
    assert.equal(contacto?.usuarioId, null);
    assert.equal(contacto?.participaciones, 0);

    // A code does not name anyone, so it saves nothing.
    await crearInvitacionHttp(pedido({ tipo: "code", rol: "volunteer" }), almacen, evento, "ana");
    assert.equal((await almacen.listarVoluntarios(organizacionId)).length, 1);

    // When that person later joins with an account, the same contact is updated, not duplicated.
    await almacen.guardarUsuario({ id: "nueva", email: "nueva.persona@example.com", nombre: "Nueva", rol: "voluntario" });
    const secreto = ((await (await crearInvitacionHttp(pedido({ tipo: "direct", email: "nueva.persona@example.com" }), almacen, evento, "ana")).json()) as { secreto: string }).secreto;
    const canje = await canjearInvitacionHttp(pedido({ secreto }), almacen, "nueva", "nueva.persona@example.com");
    assert.equal(canje.status, 200);
    const lista = await almacen.listarVoluntarios(organizacionId);
    assert.equal(lista.length, 1);
    assert.equal(lista[0]?.usuarioId, "nueva");
    assert.equal(lista[0]?.participaciones, 1);
    assert.equal(lista[0]?.origen, "invitacion");
  });
});

test("un evento solo se crea en una organización donde la persona es administradora", async () => {
  await conBandera("on", async () => {
    const { almacen, organizacionId } = await escenario();
    const ajena = await crearEvento(almacen, "luis", { organizacionId });
    assert.equal(ajena.status, 403);
    assert.equal((await almacen.listarProyectos()).length, 0);

    const inexistente = await crearEvento(almacen, "ana", { organizacionId: "no-existe" });
    assert.equal(inexistente.status, 404);
    const mala = await crearEvento(almacen, "ana", { organizacionId: 12 });
    assert.equal(mala.status, 400);

    const propia = await crearEvento(almacen, "ana", { organizacionId });
    assert.equal(propia.status, 201);
    assert.equal((await almacen.leerProyecto(await idDe(propia)))?.organizacionId, organizacionId);

    const sinOrg = await crearEvento(almacen, "luis", {});
    assert.equal(sinOrg.status, 201);
    assert.equal((await almacen.leerProyecto(await idDe(sinOrg)))?.organizacionId ?? null, null);

    const detalle = await leerOrganizacionHttp(almacen, "ana", organizacionId);
    assert.equal(((await detalle.json()) as { eventos: unknown[] }).eventos.length, 1);
  });
});

test("el selector del evento solo lo recibe quien organiza el evento y administra la organización", async () => {
  await conBandera("on", async () => {
    const { almacen, organizacionId } = await escenario();
    for (let i = 0; i < 10; i += 1) {
      await agregarContactoHttp(almacen, "ana", organizacionId, { email: `vol${i}@hyto.app` });
    }
    const evento = await idDe(await crearEvento(almacen, "ana", { organizacionId }));
    const sinOrg = await idDe(await crearEvento(almacen, "ana", {}));

    const ok = await contactosDeEventoHttp(almacen, "ana", evento);
    assert.equal(ok.status, 200);
    const cuerpo = (await ok.json()) as { sugeridos: unknown[]; guardados: unknown[]; organizacion: { id: string } };
    assert.equal(cuerpo.sugeridos.length, 8);
    assert.equal(cuerpo.guardados.length, 10);
    assert.equal(cuerpo.organizacion.id, organizacionId);

    assert.equal((await contactosDeEventoHttp(almacen, "luis", evento)).status, 403);
    assert.equal((await contactosDeEventoHttp(almacen, "ana", sinOrg)).status, 404);

    // A member who organizes but is not an admin of the organization gets no list.
    await agregarAdminHttp(almacen, "ana", organizacionId, { email: "bea@hyto.app" });
    await unir(almacen, evento, "ana", "bea");
    await almacen.guardarMiembro({ proyectoId: evento, usuarioId: "bea", rol: "organizer", estado: "active", creadoEn: AHORA });
    await quitarAdminHttp(almacen, "ana", organizacionId, { usuarioId: "bea" });
    assert.equal((await contactosDeEventoHttp(almacen, "bea", evento)).status, 403);
  });
});

test("quien no administra la organización ve los correos del evento enmascarados", async () => {
  await conBandera("on", async () => {
    const { almacen, organizacionId } = await escenario();
    const evento = await idDe(await crearEvento(almacen, "ana", { organizacionId }));
    await unir(almacen, evento, "ana", "luis");
    await agregarAdminHttp(almacen, "ana", organizacionId, { email: "bea@hyto.app" });
    await almacen.guardarMiembro({ proyectoId: evento, usuarioId: "bea", rol: "organizer", estado: "active", creadoEn: AHORA });

    const correos = async (usuarioId: string) => {
      const lectura = await leerProyectoHttp(almacen, { usuarioId, demo: false }, { id: evento });
      const cuerpo = (await lectura.json()) as { miembros: { usuarioId: string; email: string }[] };
      return Object.fromEntries(cuerpo.miembros.map((miembro) => [miembro.usuarioId, miembro.email]));
    };

    assert.equal((await correos("bea"))["luis"], "luis@hyto.app");
    assert.equal(await veCorreosDelEvento(almacen, { organizacionId }, "bea"), true);

    await quitarAdminHttp(almacen, "ana", organizacionId, { usuarioId: "bea" });
    const enmascarados = await correos("bea");
    assert.equal(enmascarados["luis"], "l•••@hyto.app");
    assert.equal(enmascarados["ana"], "a•••@hyto.app");
    assert.equal(enmascarados["bea"], "bea@hyto.app");
    assert.equal(await veCorreosDelEvento(almacen, { organizacionId }, "bea"), false);
    assert.equal(await veCorreosDelEvento(almacen, { organizacionId: null }, "bea"), true);
  });
});
