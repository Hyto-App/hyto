import assert from "node:assert/strict";
import test from "node:test";
import { crearMemoria } from "../db/memoria";
import { asegurarSemilla } from "../db/semilla";
import type { SesionFila } from "../db/tipos";
import { cuentaCobroDe, guardarCuentaCobro, walletDeSesiones } from "./cobro";

const CUENTA = "G" + "A".repeat(55);
const OTRA = "G" + "B".repeat(55);

function fila(parcial: Partial<SesionFila> & Pick<SesionFila, "usuarioId" | "wallet" | "expiraEn">): SesionFila {
  return {
    token: parcial.token ?? "tok",
    email: parcial.email ?? "voluntario1@demo.hyto",
    usuarioId: parcial.usuarioId,
    rol: parcial.rol ?? "voluntario",
    expiraEn: parcial.expiraEn,
    wallet: parcial.wallet,
  };
}

test("la cuenta de cobro es la sesión más nueva que no es demo", () => {
  const vieja = fila({ usuarioId: "voluntario-1", wallet: OTRA, expiraEn: "2026-10-01T00:00:00.000Z", token: "vieja" });
  const nueva = fila({ usuarioId: "voluntario-1", wallet: ` ${CUENTA} `, expiraEn: "2026-10-02T00:00:00.000Z", token: "nueva" });
  const demo = fila({
    usuarioId: "voluntario-1",
    email: "demo-voluntario@hyto.demo",
    wallet: "G" + "C".repeat(55),
    expiraEn: "2026-10-03T00:00:00.000Z",
    token: "demo",
  });
  const invalida = fila({
    usuarioId: "voluntario-1",
    wallet: "no-es-cuenta",
    expiraEn: "2026-10-04T00:00:00.000Z",
    token: "mala",
  });
  assert.equal(walletDeSesiones([vieja, demo, invalida, nueva]), CUENTA);
  assert.equal(walletDeSesiones([demo, invalida]), null);
});

test("la cuenta guardada en el usuario va primero y la sesión queda de respaldo", async () => {
  const almacen = crearMemoria();
  await asegurarSemilla(almacen);
  assert.equal(await cuentaCobroDe(almacen, "voluntario-1"), null);
  assert.equal(await cuentaCobroDe(almacen, "  "), null);

  await almacen.crearSesion(fila({ usuarioId: "voluntario-1", wallet: OTRA, expiraEn: "2026-10-02T00:00:00.000Z", token: "previa" }));
  assert.equal(await almacen.walletCobroDeUsuario("voluntario-1"), null);
  assert.equal(await cuentaCobroDe(almacen, "voluntario-1"), OTRA);

  assert.equal(await almacen.guardarWalletCobro("voluntario-1", CUENTA), true);
  assert.equal(await cuentaCobroDe(almacen, " voluntario-1 "), CUENTA);

  await almacen.borrarSesion("previa");
  assert.equal(await almacen.walletDeUsuario("voluntario-1"), null);
  assert.equal(await cuentaCobroDe(almacen, "voluntario-1"), CUENTA);

  // Something that is not an account never reaches the escrow: the session is used instead.
  await almacen.guardarWalletCobro("voluntario-2", "no-es-cuenta");
  await almacen.crearSesion(
    fila({ usuarioId: "voluntario-2", email: "voluntario2@demo.hyto", wallet: OTRA, expiraEn: "2026-10-02T00:00:00.000Z", token: "v2" }),
  );
  assert.equal(await cuentaCobroDe(almacen, "voluntario-2"), OTRA);
});

test("solo una sesión propia con una cuenta válida se copia al usuario", async () => {
  const almacen = crearMemoria();
  await asegurarSemilla(almacen);
  const propia = { email: "voluntario1@demo.hyto", usuarioId: "voluntario-1" };
  assert.equal(await guardarCuentaCobro(almacen, propia, "no-es-cuenta"), false);
  assert.equal(await guardarCuentaCobro(almacen, propia, ""), false);
  assert.equal(await almacen.walletCobroDeUsuario("voluntario-1"), null);

  assert.equal(await guardarCuentaCobro(almacen, propia, ` ${CUENTA} `), true);
  assert.equal(await almacen.walletCobroDeUsuario("voluntario-1"), CUENTA);

  assert.equal(await guardarCuentaCobro(almacen, { email: "demo-voluntario@hyto.demo", usuarioId: "demo-voluntario" }, OTRA), false);
  assert.equal(await guardarCuentaCobro(almacen, { email: "otra@hyto.app", usuarioId: "demo-organizador" }, OTRA), false);
  assert.equal(await almacen.walletCobroDeUsuario("demo-voluntario"), null);
  assert.equal(await almacen.walletCobroDeUsuario("demo-organizador"), null);

  assert.equal(await guardarCuentaCobro(almacen, { email: "nadie@hyto.app", usuarioId: "no-existe" }, OTRA), false);
  assert.equal(await almacen.walletCobroDeUsuario("no-existe"), null);
});
