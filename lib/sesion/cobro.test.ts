import assert from "node:assert/strict";
import test from "node:test";
import type { SesionFila } from "../db/tipos";
import { walletDeSesiones } from "./cobro";

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
