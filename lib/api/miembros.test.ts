import assert from "node:assert/strict";
import test from "node:test";
import { crearMemoria } from "@/lib/db/memoria";
import { hashSecreto } from "./invitaciones";
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
      },
    ],
  );
  assert.equal((await pedirOtraFotoHttp(almacen, "ana", "tarea-1")).status, 200);
  assert.equal((await almacen.leerTarea("tarea-1"))?.estado, "pendiente");
  await almacen.actualizarTarea("tarea-1", { estado: "pagado" });
  assert.equal((await pedirOtraFotoHttp(almacen, "ana", "tarea-1")).status, 409);
  assert.equal((await pedirOtraFotoHttp(almacen, "otro", "tarea-1")).status, 403);
});
