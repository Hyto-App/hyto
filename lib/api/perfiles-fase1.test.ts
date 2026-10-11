import assert from "node:assert/strict";
import test from "node:test";
import { crearMemoria } from "@/lib/db/memoria";
import type { Almacen } from "@/lib/db/almacen";
import type { Proyecto, ProyectoMiembro, TareaFila } from "@/lib/db/tipos";
import { calcularCifras } from "@/lib/perfil/cifras";
import { esEventoDePrueba } from "@/lib/perfil/prueba";
import { leerFicha } from "@/lib/perfil/reglas";
import { calcularSugeridos } from "@/lib/perfil/sugeridos";
import { validarBio, validarNombre } from "@/lib/perfil/validar";
import { crearInvitacionHttp } from "./invitaciones";
import { pedirOtraFotoHttp } from "./pedir";
import { guardarAjustesPerfilHttp, leerAjustesPerfilHttp, leerVistaPerfil, sugeridosDeEvento } from "./perfil-publico";

const HASH = "a".repeat(64);

function tarea(id: string, proyectoId: string, miembroId: string, cambio: Partial<TareaFila> = {}): TareaFila {
  return {
    id,
    proyectoId,
    titulo: `Tarea ${id}`,
    tipo: "trabajo",
    monto: "20",
    tope: null,
    condicion: "",
    miembroId,
    walletCobro: "",
    estado: "pagado",
    hashPago: HASH,
    credencialUrl: null,
    contratoEscrow: "CABC",
    prioridad: "normal",
    dificultad: null,
    ...cambio,
  } as TareaFila;
}

function proyecto(id: string, organizadorId: string, nombre = `Evento ${id}`): Proyecto {
  return { id, nombre, creadoEn: "2026-10-01T12:00:00.000Z", organizadorId };
}

function miembro(proyectoId: string, usuarioId: string, rol: ProyectoMiembro["rol"] = "volunteer"): ProyectoMiembro {
  return { proyectoId, usuarioId, rol, estado: "active", creadoEn: "2026-10-01T12:00:00.000Z" };
}

test("nombre y bio: largo, sin HTML ni scripts, sin correo ni teléfono", () => {
  assert.deepEqual(validarNombre("  María   Rojas "), { ok: true, valor: "María Rojas" });
  assert.equal(validarNombre("M").ok, false);
  assert.equal(validarNombre("x".repeat(61)).ok, false);
  assert.deepEqual(validarNombre("<script>alert(1)</script>"), { ok: false, motivo: "html" });
  assert.deepEqual(validarNombre("Ana <b>"), { ok: false, motivo: "html" });
  assert.deepEqual(validarNombre("Ana javascript:alert(1)"), { ok: false, motivo: "html" });
  assert.deepEqual(validarNombre("Ana &lt;b&gt;"), { ok: false, motivo: "html" });
  assert.deepEqual(validarNombre("ana@hyto.dev"), { ok: false, motivo: "contacto" });
  assert.deepEqual(validarNombre("Ana 8888 1234"), { ok: false, motivo: "contacto" });
  assert.deepEqual(validarNombre(42), { ok: false, motivo: "tipo" });
  assert.deepEqual(validarBio(""), { ok: true, valor: "" });
  assert.deepEqual(validarBio("Cocino desde 2019."), { ok: true, valor: "Cocino desde 2019." });
  assert.equal(validarBio("x".repeat(281)).ok, false);
  assert.deepEqual(validarBio('<img src=x onerror="alert(1)">'), { ok: false, motivo: "html" });
  assert.ok("aviso" in leerFicha({ experiencia: "<script>x</script>", etiquetas: [] }));
  assert.ok("aviso" in leerFicha({ experiencia: "Escríbame a ana@hyto.dev", etiquetas: [] }));
  assert.ok(!("aviso" in leerFicha({ experiencia: "Cocina y montaje", etiquetas: ["equipo"] })));
});

test("eventos demo o de prueba no cuentan; un evento real con «Prueba» en el nombre sí", () => {
  assert.equal(esEventoDePrueba({ id: "demo", nombre: "Demo", organizadorId: "demo-organizador" }), true);
  assert.equal(esEventoDePrueba({ id: "demo-12-oct", nombre: "GDG", organizadorId: "demo-12-oct-org" }), true);
  assert.equal(esEventoDePrueba({ id: "zeek", nombre: "ZEEK", organizadorId: null, creadoEn: "2026-09-27T12:00:00.000Z" }), true);
  assert.equal(esEventoDePrueba({ id: "p1", nombre: "Prueba", organizadorId: "o" }), true);
  assert.equal(esEventoDePrueba({ id: "p1", nombre: "[Test] ZEEK", organizadorId: "o" }), true);
  assert.equal(esEventoDePrueba({ id: "p1", nombre: "Demo - GDG", organizadorId: "o" }), true);
  assert.equal(esEventoDePrueba({ id: "p1", nombre: "Prueba de sonido", organizadorId: "o" }), false);
  assert.equal(esEventoDePrueba({ id: "p1", nombre: "GDG Esparza", organizadorId: "o" }), false);
});

test("las cifras solo cuentan tareas aprobadas por una persona y pagadas", () => {
  const proyectos = [
    proyecto("e1", "org"),
    proyecto("e2", "org"),
    proyecto("propio", "ana"),
    proyecto("demo", "demo-organizador", "Demo"),
    proyecto("e3", "org", "Prueba"),
  ];
  const tareas = [
    tarea("t1", "e1", "ana"),
    tarea("t2", "e1", "ana"),
    tarea("t3", "e2", "ana", { tipo: "reembolso", monto: "15", hashPago: "PLACEHOLDER-NOT-A-LEDGER-TX" }),
    tarea("t4", "e2", "ana", { hashPago: null }),
    tarea("enrevision", "e1", "ana", { estado: "en revisión", hashPago: null }),
    tarea("autoasignada", "propio", "ana"),
    tarea("demo", "demo", "ana"),
    tarea("prueba", "e3", "ana"),
    tarea("demolock", "e1", "ana", { contratoEscrow: "demo-lock-x" }),
    tarea("deotra", "e1", "luis"),
  ];
  const miembros = [miembro("e1", "ana"), miembro("e2", "ana"), miembro("propio", "ana", "organizer")];
  const cifras = calcularCifras({
    usuarioId: "ana",
    proyectos,
    tareas,
    miembros,
    cambios: { t1: 1 },
    evidencias: { t1: { creadaEn: "2026-10-10T15:00:00.000Z", montoConfirmado: null }, t2: { creadaEn: "2026-10-02T15:00:00.000Z", montoConfirmado: null } },
  });
  // t3 has a placeholder hash: a sample row, not a real payment.
  assert.deepEqual(
    cifras.historial.map((item) => item.tareaId),
    ["t1", "t2", "t4"],
  );
  assert.equal(cifras.tareasHechas, 3);
  assert.equal(cifras.eventos, 2);
  assert.equal(cifras.aprobadasSinCambios, 67);
  // Amounts hidden by default.
  assert.equal(cifras.historial.every((item) => item.monto === null), true);
  assert.equal(cifras.historial[0].enlace, `https://stellar.expert/explorer/testnet/tx/${HASH}`);
  assert.equal(cifras.historial.find((item) => item.tareaId === "t4")?.enlace, null);
  const conMontos = calcularCifras({ usuarioId: "ana", proyectos, tareas, miembros, mostrarMontos: true });
  assert.equal(conMontos.historial[0].monto, "20");
  const vacia = calcularCifras({ usuarioId: "nadie", proyectos, tareas, miembros });
  assert.deepEqual([vacia.tareasHechas, vacia.eventos, vacia.aprobadasSinCambios, vacia.historial.length], [0, 0, null, 0]);
});

test("un reintento por una falla de Mile no resta: solo cuenta lo que pidió una persona", async () => {
  process.env.HYTO_PERFIL_PUBLICO = "on";
  const almacen = crearMemoria();
  await almacen.insertarUsuario({ id: "org", email: "org@hyto.dev", nombre: "Org", rol: "voluntario" });
  await almacen.crearProyecto(proyecto("e1", "org"), [tarea("t1", "e1", "ana", { estado: "en revisión", hashPago: null })]);
  // Mile's own send-back writes `rechazo` on the task but never the change log.
  await almacen.actualizarTarea("t1", { rechazo: JSON.stringify({ origen: "mile", nota: "foto borrosa" }) });
  assert.deepEqual(await almacen.contarCambiosPedidos(["t1"]), {});
  const respuesta = await pedirOtraFotoHttp(almacen, "org", "t1", { nota: "Recorte el puesto" });
  assert.equal(respuesta.status, 200);
  assert.deepEqual(await almacen.contarCambiosPedidos(["t1"]), { t1: 1 });
});

async function almacenConGente(): Promise<Almacen> {
  const almacen = crearMemoria();
  for (const [id, nombre] of [
    ["org", "Olga Org"],
    ["otra", "Otra Organizadora"],
    ["ana", "Ana Castro"],
    ["dan", "Daniel Solís"],
    ["eva", "Eva Nueva"],
    ["ajena", "Persona Ajena"],
  ]) {
    await almacen.insertarUsuario({ id, email: `${id}@hyto.dev`, nombre, rol: "voluntario" });
  }
  await almacen.crearProyecto(proyecto("pasado1", "org"), [tarea("p1a", "pasado1", "ana"), tarea("p1b", "pasado1", "dan")]);
  await almacen.crearProyecto(proyecto("pasado2", "org"), [tarea("p2a", "pasado2", "ana")]);
  await almacen.crearProyecto(proyecto("ahora", "org"), [tarea("nueva", "ahora", "", { estado: "pendiente", hashPago: null })]);
  await almacen.guardarMiembro(miembro("ahora", "dan"));
  await almacen.guardarMiembro(miembro("ahora", "eva"));
  await almacen.crearProyecto(proyecto("ajeno", "otra"), [tarea("x1", "ajeno", "ajena")]);
  await almacen.crearProyecto(proyecto("demo-12-oct", "org"), [tarea("d1", "demo-12-oct", "ajena")]);
  return almacen;
}

test("sugeridos: primero quien ya trabajó con usted, nunca contactos de otros organizadores", async () => {
  process.env.HYTO_PERFIL_PUBLICO = "on";
  const almacen = await almacenConGente();
  const lista = await sugeridosDeEvento(almacen, "org", "ahora");
  assert.deepEqual(
    lista.map((persona) => [persona.usuarioId, persona.yaTrabajo, persona.enEsteEvento, persona.eventosEnComun, persona.tareasHechas]),
    [
      ["ana", true, false, 2, 2],
      ["dan", true, true, 1, 1],
      ["eva", false, true, 0, 0],
    ],
  );
  assert.equal(lista[0].iniciales, "AC");
  assert.equal(lista.some((persona) => persona.usuarioId === "ajena"), false);
  // A new organizer has nobody to suggest: only «Invitar por correo».
  await almacen.crearProyecto(proyecto("primero", "otra2"), []);
  assert.deepEqual(await sugeridosDeEvento(almacen, "otra2", "primero"), []);
  // Somebody else's event is not this organizer's.
  assert.deepEqual(await sugeridosDeEvento(almacen, "org", "ajeno"), []);
  assert.deepEqual(
    calcularSugeridos({ organizadorId: "org", proyectoId: "nope", proyectos: [], miembros: [], tareas: [], usuarios: [] }),
    [],
  );
});

test("invitar por id solo a gente de los propios eventos; el correo lo pone el servidor", async () => {
  process.env.HYTO_PERFIL_PUBLICO = "on";
  const almacen = await almacenConGente();
  const pedir = (usuarioId: string) =>
    new Request("http://x/api", { method: "POST", body: JSON.stringify({ tipo: "direct", usuarioId, rol: "volunteer" }) });
  const bien = await crearInvitacionHttp(pedir("ana"), almacen, "ahora", "org");
  assert.equal(bien.status, 201);
  const cuerpo = (await bien.json()) as Record<string, unknown>;
  assert.equal(JSON.stringify(cuerpo).includes("ana@hyto.dev"), false);
  const ajena = await crearInvitacionHttp(pedir("ajena"), almacen, "ahora", "org");
  assert.equal(ajena.status, 403);
});

test("perfil público: sin correo, privado se ve igual que inexistente, montos ocultos por defecto", async () => {
  process.env.HYTO_PERFIL_PUBLICO = "on";
  const almacen = await almacenConGente();
  const visto = await leerVistaPerfil(almacen, "ana", null);
  assert.equal(visto.estado, "ok");
  if (visto.estado !== "ok") return;
  assert.equal(visto.vista.nombre, "Ana Castro");
  assert.equal(visto.vista.cifras.tareasHechas, 2);
  assert.equal(visto.vista.cifras.eventos, 2);
  assert.equal(visto.vista.privacidad.mostrarMontos, false);
  assert.equal(JSON.stringify(visto).includes("@"), false);

  const privado = await guardarAjustesPerfilHttp(almacen, "ana", { publico: false });
  assert.equal(privado.status, 200);
  assert.deepEqual(await leerVistaPerfil(almacen, "ana", null), { estado: "no_disponible" });
  assert.deepEqual(await leerVistaPerfil(almacen, "ana", "dan"), { estado: "no_disponible" });
  assert.deepEqual(await leerVistaPerfil(almacen, "no-existe", null), { estado: "no_disponible" });
  const propio = await leerVistaPerfil(almacen, "ana", "ana");
  assert.equal(propio.estado, "ok");

  await guardarAjustesPerfilHttp(almacen, "ana", { publico: true, mostrarMontos: true });
  const conMontos = await leerVistaPerfil(almacen, "ana", null);
  assert.equal(conMontos.estado === "ok" && conMontos.vista.cifras.historial[0].monto, "20");

  const malo = await guardarAjustesPerfilHttp(almacen, "ana", { nombre: "<script>alert(1)</script>" });
  assert.equal(malo.status, 400);
  assert.equal(((await malo.json()) as { clave: string }).clave, "perfilPublico.errorHtml");
  assert.equal((await almacen.leerUsuario("ana"))?.nombre, "Ana Castro");
  const tipo = await guardarAjustesPerfilHttp(almacen, "ana", { publico: "si" });
  assert.equal(tipo.status, 400);
  const bien = await guardarAjustesPerfilHttp(almacen, "ana", { nombre: "Ana María Castro" });
  assert.equal(bien.status, 200);
  assert.equal((await almacen.leerUsuario("ana"))?.nombre, "Ana María Castro");
  const ajustes = (await (await leerAjustesPerfilHttp(almacen, "ana")).json()) as Record<string, unknown>;
  assert.deepEqual(ajustes, { nombre: "Ana María Castro", publico: true, mostrarMontos: true, enlace: "/p/ana" });
});

test("con el interruptor apagado no hay perfil ni sugeridos", async () => {
  process.env.HYTO_PERFIL_PUBLICO = "off";
  try {
    const almacen = await almacenConGente();
    assert.deepEqual(await leerVistaPerfil(almacen, "ana", null), { estado: "no_disponible" });
    assert.deepEqual(await sugeridosDeEvento(almacen, "org", "ahora"), []);
    assert.equal((await guardarAjustesPerfilHttp(almacen, "ana", { publico: false })).status, 404);
    const pedido = new Request("http://x/api", { method: "POST", body: JSON.stringify({ tipo: "direct", usuarioId: "ana", rol: "volunteer" }) });
    assert.equal((await crearInvitacionHttp(pedido, almacen, "ahora", "org")).status, 400);
  } finally {
    process.env.HYTO_PERFIL_PUBLICO = "on";
  }
});
