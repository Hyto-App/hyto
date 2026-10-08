import assert from "node:assert/strict";
import test from "node:test";
import { crearMemoria } from "@/lib/db/memoria";
import { reiniciarLimite } from "@/lib/escrow/limite";
import { canjearInvitacionHttp, codigoHumano, crearInvitacionHttp, hashSecreto } from "./invitaciones";
import { pedirOtraFotoHttp } from "./pedir";

const AHORA = "2026-10-01T00:00:00.000Z";

test("el canje respeta vencimiento, usos, correo y no baja a un organizador", async () => {
  const almacen = crearMemoria();
  await almacen.guardarUsuario({ id: "ana", email: "ana@hyto.app", nombre: "Ana", rol: "voluntario" });
  await almacen.guardarUsuario({ id: "luis", email: "luis@hyto.app", nombre: "Luis", rol: "voluntario" });
  await almacen.crearProyecto(
    { id: "feria", nombre: "Feria", creadoEn: AHORA, organizadorId: "ana" },
    [],
  );
  await almacen.crearInvitacion({
    id: "inv-1",
    proyectoId: "feria",
    tipo: "code",
    email: null,
    secretoHash: hashSecreto("HYTO-ABC234"),
    rol: "volunteer",
    maxUsos: 1,
    usos: 0,
    expiraEn: "2026-10-08T00:00:00.000Z",
    creadoPor: "ana",
    creadoEn: AHORA,
  });
  const vencido = await almacen.canjearInvitacion({
    secretoHash: hashSecreto("HYTO-ABC234"),
    usuarioId: "luis",
    email: "luis@hyto.app",
    ahora: "2026-10-09T00:00:00.000Z",
  });
  assert.deepEqual(vencido, { ok: false, motivo: "expired" });
  const ok = await almacen.canjearInvitacion({
    secretoHash: hashSecreto("HYTO-ABC234"),
    usuarioId: "ana",
    email: "ana@hyto.app",
    ahora: AHORA,
  });
  assert.deepEqual(ok, { ok: true, proyectoId: "feria", rol: "organizer" });
  const usado = await almacen.canjearInvitacion({
    secretoHash: hashSecreto("HYTO-ABC234"),
    usuarioId: "luis",
    email: "luis@hyto.app",
    ahora: AHORA,
  });
  assert.deepEqual(usado, { ok: false, motivo: "used" });

  await almacen.crearInvitacion({
    id: "inv-2",
    proyectoId: "feria",
    tipo: "direct",
    email: "luis@hyto.app",
    secretoHash: hashSecreto("token-directo"),
    rol: "team",
    maxUsos: 1,
    usos: 0,
    expiraEn: "2026-10-08T00:00:00.000Z",
    creadoPor: "ana",
    creadoEn: AHORA,
  });
  const ajeno = await almacen.canjearInvitacion({
    secretoHash: hashSecreto("token-directo"),
    usuarioId: "ana",
    email: "ana@hyto.app",
    ahora: AHORA,
  });
  assert.deepEqual(ajeno, { ok: false, motivo: "email" });
  const propio = await almacen.canjearInvitacion({
    secretoHash: hashSecreto("token-directo"),
    usuarioId: "luis",
    email: "luis@hyto.app",
    ahora: AHORA,
  });
  assert.equal(propio.ok, true);

  await almacen.crearInvitacion({
    id: "inv-3",
    proyectoId: "feria",
    tipo: "code",
    email: null,
    secretoHash: hashSecreto("sin-vence"),
    rol: "volunteer",
    maxUsos: 1,
    usos: 0,
    expiraEn: "",
    creadoPor: "ana",
    creadoEn: AHORA,
  });
  const sinVencimiento = await almacen.canjearInvitacion({
    secretoHash: hashSecreto("sin-vence"),
    usuarioId: "luis",
    email: "luis@hyto.app",
    ahora: AHORA,
  });
  assert.deepEqual(sinVencimiento, { ok: false, motivo: "expired" });
});

test("un código de invitación vence a los 7 días y empieza por HYTO-", async () => {
  const almacen = crearMemoria();
  await almacen.guardarUsuario({ id: "ana", email: "ana@hyto.app", nombre: "Ana", rol: "voluntario" });
  await almacen.crearProyecto({ id: "feria", nombre: "Feria", creadoEn: AHORA, organizadorId: "ana" }, []);
  await almacen.guardarMiembro({
    proyectoId: "feria",
    usuarioId: "ana",
    rol: "organizer",
    estado: "active",
    creadoEn: AHORA,
  });
  const antes = Date.now();
  const respuesta = await crearInvitacionHttp(
    new Request("http://local/api/eventos/feria/invitaciones", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tipo: "code", rol: "volunteer" }),
    }),
    almacen,
    "feria",
    "ana",
  );
  assert.equal(respuesta.status, 201);
  const cuerpo = (await respuesta.json()) as { secreto: string; expiraEn: string };
  assert.match(cuerpo.secreto, /^HYTO-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{12}$/);
  const dias = (Date.parse(cuerpo.expiraEn) - antes) / (24 * 60 * 60 * 1000);
  assert.ok(dias > 6.9 && dias < 7.1, `vencía en ${dias} días`);
});

test("el código es largo y cinco fallos bloquean el canje", async () => {
  reiniciarLimite();
  const codigo = codigoHumano();
  assert.equal(codigo.startsWith("HYTO-"), true);
  assert.ok(codigo.length > "HYTO-".length + 6);
  const almacen = crearMemoria();
  const pedido = () =>
    new Request("http://local/api/join", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.8" },
      body: JSON.stringify({ secreto: "no-existe" }),
    });
  for (let i = 0; i < 5; i += 1) {
    assert.equal((await canjearInvitacionHttp(pedido(), almacen, "luis", "luis@hyto.app")).status, 400);
  }
  const bloqueado = await canjearInvitacionHttp(pedido(), almacen, "luis", "luis@hyto.app");
  assert.equal(bloqueado.status, 429);
  assert.match(((await bloqueado.json()) as { aviso: string }).aviso, /15 minutes/);
  reiniciarLimite();
});

test("pedir otra foto vuelve la tarea a pendiente y no toca un pago", async () => {
  const almacen = crearMemoria();
  await almacen.crearProyecto(
    { id: "feria", nombre: "Feria", creadoEn: AHORA, organizadorId: "ana" },
    [
      {
        id: "tarea-1",
        proyectoId: "feria",
        titulo: "Cajas",
        tipo: "trabajo",
        monto: "8",
        tope: null,
        condicion: "",
        miembroId: "",
        walletCobro: "",
        estado: "en revisión",
        hashPago: null,
        contratoEscrow: null,
        credencialUrl: null,
        prioridad: "normal",
        dificultad: null,
      },
    ],
  );
  assert.equal((await pedirOtraFotoHttp(almacen, "ana", "tarea-1")).status, 200);
  assert.equal((await almacen.leerTarea("tarea-1"))?.estado, "pendiente");
  await almacen.actualizarTarea("tarea-1", { estado: "pagado" });
  assert.equal((await pedirOtraFotoHttp(almacen, "ana", "tarea-1")).status, 409);
  assert.equal((await pedirOtraFotoHttp(almacen, "otro", "tarea-1")).status, 403);
});
