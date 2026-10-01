import assert from "node:assert/strict";
import test from "node:test";
import { POST as aceptar } from "../../app/api/invitaciones/aceptar/route";
import { POST as crearInvitacion } from "../../app/api/proyectos/[id]/invitaciones/route";
import { GET as leerRevision } from "../../app/api/revision/[id]/route";
import { crearMemoria } from "../db/memoria";
import type { Almacen } from "../db/almacen";
import { AVISO_SALDO_EVENTO, AVISO_SALDO_TAREA, AVISO_WALLET_FONDOS, fijarLectorSaldo } from "../escrow/saldo";
import { hashSecreto } from "../invitaciones/secreto";
import { prepararFirmaHttp } from "./firma";
import { crearProyectoHttp } from "./proyectos";

const WALLET = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

function cookie(token: string): string {
  return `hyto_sesion=${token}`;
}

async function sesion(almacen: Almacen, token: string, usuarioId: string, email: string, wallet = WALLET): Promise<void> {
  await almacen.crearSesion({
    token,
    email,
    usuarioId,
    rol: "voluntario",
    expiraEn: new Date(Date.now() + 60_000).toISOString(),
    wallet,
  });
}

async function evento(almacen: Almacen, usuarioId: string): Promise<string> {
  const respuesta = await crearProyectoHttp(
    new Request("http://local/api/proyectos", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ nombre: "Feria", tareas: [{ titulo: "Cajas", tipo: "trabajo", monto: "8" }] }),
    }),
    almacen,
    usuarioId,
    { wallet: WALLET, leerSaldo: async () => "100" },
  );
  assert.equal(respuesta.status, 201);
  return ((await respuesta.json()) as { proyecto: { id: string } }).proyecto.id;
}

test("crear un evento exige saldo y deja al creador como organizer", async () => {
  const almacen = crearMemoria();
  const sinWallet = await crearProyectoHttp(
    new Request("http://local/api/proyectos", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ nombre: "Feria", tareas: [{ titulo: "Cajas", tipo: "trabajo", monto: "8" }] }),
    }),
    almacen,
    "ana",
    { wallet: "", leerSaldo: async () => "100" },
  );
  assert.equal(sinWallet.status, 400);
  assert.equal(((await sinWallet.json()) as { aviso: string }).aviso, AVISO_WALLET_FONDOS);

  const corto = await crearProyectoHttp(
    new Request("http://local/api/proyectos", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ nombre: "Feria", tareas: [{ titulo: "Cajas", tipo: "trabajo", monto: "8" }] }),
    }),
    almacen,
    "ana",
    { wallet: WALLET, leerSaldo: async () => "8" },
  );
  assert.equal(corto.status, 402);
  assert.equal(((await corto.json()) as { aviso: string }).aviso, AVISO_SALDO_EVENTO);

  const id = await evento(almacen, "ana");
  const miembros = await almacen.listarMiembros(id);
  assert.equal(miembros.length, 1);
  assert.equal(miembros[0]?.rol, "organizer");
  assert.equal(miembros[0]?.usuarioId, "ana");
  assert.equal((await almacen.leerProyecto(id))?.organizadorId, "ana");
});

test("el código vence, se agota y el directo exige el correo", async () => {
  const almacen = crearMemoria();
  const id = await evento(almacen, "ana");
  await sesion(almacen, "ana", "ana", "ana@hyto.app");
  await sesion(almacen, "bia", "bia", "bia@hyto.app");
  await sesion(almacen, "otra", "otra", "otra@hyto.app");
  const gancho = (globalThis as { __HYTO_ALMACEN_PRUEBA?: () => Promise<Almacen | null> }).__HYTO_ALMACEN_PRUEBA;
  (globalThis as { __HYTO_ALMACEN_PRUEBA?: () => Promise<Almacen | null> }).__HYTO_ALMACEN_PRUEBA = async () => almacen;
  try {
    const codigo = await crearInvitacion(
      new Request("http://local/api/proyectos/" + id + "/invitaciones", {
        method: "POST",
        headers: { cookie: cookie("ana"), "content-type": "application/json" },
        body: JSON.stringify({ tipo: "code", rol: "volunteer", maxUsos: 1 }),
      }),
      { params: Promise.resolve({ id }) },
    );
    assert.equal(codigo.status, 201);
    const secreto = ((await codigo.json()) as { secreto: string }).secreto;
    const ajeno = await crearInvitacion(
      new Request("http://local/api/proyectos/" + id + "/invitaciones", {
        method: "POST",
        headers: { cookie: cookie("bia"), "content-type": "application/json" },
        body: JSON.stringify({ tipo: "code", rol: "team" }),
      }),
      { params: Promise.resolve({ id }) },
    );
    assert.equal(ajeno.status, 403);

    const unido = await aceptar(
      new Request("http://local/api/invitaciones/aceptar", {
        method: "POST",
        headers: { cookie: cookie("bia"), "content-type": "application/json" },
        body: JSON.stringify({ secreto }),
      }),
    );
    assert.equal(unido.status, 200);
    assert.equal((await almacen.listarMiembrosDe("bia")).some((miembro) => miembro.rol === "volunteer"), true);
    const agotado = await aceptar(
      new Request("http://local/api/invitaciones/aceptar", {
        method: "POST",
        headers: { cookie: cookie("otra"), "content-type": "application/json" },
        body: JSON.stringify({ secreto: secreto.toLowerCase() }),
      }),
    );
    assert.equal(agotado.status, 403);
    assert.match(((await agotado.json()) as { aviso: string }).aviso, /already been used/);

    const fila = await almacen.invitacionPorHash(hashSecreto(secreto));
    assert.ok(fila);
    fila.expiraEn = "2000-01-01T00:00:00.000Z";
    fila.usos = 0;
    const vencido = await aceptar(
      new Request("http://local/api/invitaciones/aceptar", {
        method: "POST",
        headers: { cookie: cookie("otra"), "content-type": "application/json" },
        body: JSON.stringify({ secreto }),
      }),
    );
    assert.equal(vencido.status, 403);
    assert.match(((await vencido.json()) as { aviso: string }).aviso, /expired/);

    const directo = await crearInvitacion(
      new Request("http://local/api/proyectos/" + id + "/invitaciones", {
        method: "POST",
        headers: { cookie: cookie("ana"), "content-type": "application/json" },
        body: JSON.stringify({ tipo: "direct", rol: "team", email: "bia@hyto.app" }),
      }),
      { params: Promise.resolve({ id }) },
    );
    const cuerpoDirecto = (await directo.json()) as { secreto: string; enlace: string };
    const link = cuerpoDirecto.secreto;
    assert.match(cuerpoDirecto.enlace, /\/invitar\//);
    const malCorreo = await aceptar(
      new Request("http://local/api/invitaciones/aceptar", {
        method: "POST",
        headers: { cookie: cookie("otra"), "content-type": "application/json" },
        body: JSON.stringify({ secreto: link }),
      }),
    );
    assert.equal(malCorreo.status, 403);
    assert.match(((await malCorreo.json()) as { aviso: string }).aviso, /different email/);
    const bien = await aceptar(
      new Request("http://local/api/invitaciones/aceptar", {
        method: "POST",
        headers: { cookie: cookie("bia"), "content-type": "application/json" },
        body: JSON.stringify({ secreto: link }),
      }),
    );
    assert.equal(bien.status, 200);
    assert.equal((await almacen.listarMiembrosDe("bia")).some((miembro) => miembro.rol === "team"), true);

    const revision = await leerRevision(new Request("http://local/api/revision/x", { headers: { cookie: cookie("bia") } }), {
      params: Promise.resolve({ id: "no-existe" }),
    });
    assert.equal(revision.status, 403);
  } finally {
    (globalThis as { __HYTO_ALMACEN_PRUEBA?: () => Promise<Almacen | null> }).__HYTO_ALMACEN_PRUEBA = gancho;
  }
});

test("desplegar rechaza un saldo menor que el hito más la reserva", async () => {
  const almacen = crearMemoria();
  const id = await evento(almacen, "ana");
  const tarea = (await almacen.listarTareas()).find((item) => item.proyectoId === id);
  assert.ok(tarea);
  await almacen.actualizarTarea(tarea.id, { walletCobro: "GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB" });
  const anterior = {
    plataforma: process.env.HYTO_ESCROW_PLATFORM,
    resolutor: process.env.HYTO_ESCROW_RESOLVER,
    admin: process.env.HYTO_ESCROW_ADMIN,
  };
  process.env.HYTO_ESCROW_PLATFORM = "GDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD";
  process.env.HYTO_ESCROW_RESOLVER = "GEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE";
  process.env.HYTO_ESCROW_ADMIN = "GCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC";
  fijarLectorSaldo(async () => "1");
  try {
    const respuesta = await prepararFirmaHttp(
      {
        token: "tok",
        email: "ana@hyto.app",
        usuarioId: "ana",
        rol: "voluntario",
        expiraEn: new Date(Date.now() + 60_000).toISOString(),
        wallet: WALLET,
      },
      new Request("http://local/api/firma", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ accion: "desplegar", tareaId: tarea.id }),
      }),
      almacen,
    );
    assert.equal(respuesta.status, 402);
    assert.equal(((await respuesta.json()) as { aviso: string }).aviso, AVISO_SALDO_TAREA);
  } finally {
    fijarLectorSaldo(null);
    if (anterior.plataforma === undefined) delete process.env.HYTO_ESCROW_PLATFORM;
    else process.env.HYTO_ESCROW_PLATFORM = anterior.plataforma;
    if (anterior.resolutor === undefined) delete process.env.HYTO_ESCROW_RESOLVER;
    else process.env.HYTO_ESCROW_RESOLVER = anterior.resolutor;
    if (anterior.admin === undefined) delete process.env.HYTO_ESCROW_ADMIN;
    else process.env.HYTO_ESCROW_ADMIN = anterior.admin;
  }
});
