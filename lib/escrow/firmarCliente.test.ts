import assert from "node:assert/strict";
import test from "node:test";
import { aprobarYPagar, desplegarYFondear, firmarYEnviar } from "./firmarCliente";

const CONTRATO = "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
const HASH = "ab".repeat(32);

test("firma el XDR de la API y lo envía", async () => {
  const llamadas: string[] = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    const url = String(input);
    llamadas.push(url);
    if (url === "/api/firma") return Response.json({ xdr: "SIN-FIRMAR", contrato: CONTRATO, monto: 20 });
    const cuerpo = JSON.parse(String(init?.body)) as { xdr: string; accion: string; contrato: string };
    assert.equal(cuerpo.xdr, "FIRMADO");
    assert.equal(cuerpo.accion, "fondear");
    assert.equal(cuerpo.contrato, CONTRATO);
    return Response.json({ hash: HASH, contrato: CONTRATO, ledger: 3 });
  };
  const resultado = await firmarYEnviar(
    { accion: "fondear", tareaId: "stand", contrato: CONTRATO, firmante: "G", monto: 1 },
    { fetch: fetchImpl, firmar: async () => "FIRMADO" },
  );
  assert.equal(resultado.hash, HASH);
  assert.equal(resultado.contrato, CONTRATO);
  assert.equal(resultado.aviso, null);
  assert.deepEqual(llamadas, ["/api/firma", "/api/firma/enviar"]);
});

test("el aviso de XLM insuficiente llega en español", async () => {
  const fetchImpl: typeof fetch = async (input) => {
    if (String(input) === "/api/firma") return Response.json({ xdr: "X" });
    return Response.json(
      { aviso: "La cuenta no tiene XLM suficiente para la comisión. Fondeala con Friendbot en testnet y volvé a intentar." },
      { status: 400 },
    );
  };
  await assert.rejects(
    () => firmarYEnviar({ accion: "fondear" }, { fetch: fetchImpl, firmar: async () => "F" }),
    /Friendbot/,
  );
});

test("desplegar y fondear usa el monto que devolvió el alta", async () => {
  const acciones: { accion: string; monto?: number }[] = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    const url = String(input);
    if (url !== "/api/firma") return Response.json({ hash: HASH, contrato: CONTRATO });
    const cuerpo = JSON.parse(String(init?.body)) as { accion: string; monto?: number };
    acciones.push(cuerpo);
    return Response.json({ xdr: "X", contrato: CONTRATO, monto: cuerpo.accion === "desplegar" ? 12.4 : undefined });
  };
  await desplegarYFondear("comida", "GORGANIZADOR", { fetch: fetchImpl, firmar: async () => "F" });
  assert.equal(acciones[0]?.accion, "desplegar");
  assert.equal(acciones[1]?.accion, "fondear");
  assert.equal(acciones[1]?.monto, 12.4);
});

test("aprobar y pagar no vuelve a marcar un hito completed", async () => {
  const acciones: string[] = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    const url = String(input);
    if (url.startsWith("/api/escrow/")) return Response.json({ escrow: { milestones: [{ status: "completed" }] } });
    if (url === "/api/firma") {
      acciones.push((JSON.parse(String(init?.body)) as { accion: string }).accion);
      return Response.json({ xdr: "X", contrato: CONTRATO });
    }
    return Response.json({ hash: HASH, contrato: CONTRATO });
  };
  const pago = await aprobarYPagar(
    { tareaId: "stand", contrato: CONTRATO, firmante: "GORGANIZADOR" },
    { fetch: fetchImpl, firmar: async () => "F" },
  );
  assert.deepEqual(acciones, ["pagar"]);
  assert.equal(pago.hash, HASH);
});

test("aprobar y pagar marca el hito si todavía no está completo", async () => {
  const acciones: string[] = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    const url = String(input);
    if (url.startsWith("/api/escrow/")) return Response.json({ escrow: { milestones: [{ status: "pending" }] } });
    if (url === "/api/firma") {
      acciones.push((JSON.parse(String(init?.body)) as { accion: string }).accion);
      return Response.json({ xdr: "X", contrato: CONTRATO });
    }
    return Response.json({ hash: HASH, contrato: CONTRATO });
  };
  await aprobarYPagar({ tareaId: "stand", contrato: CONTRATO, firmante: "GORGANIZADOR" }, { fetch: fetchImpl, firmar: async () => "F" });
  assert.deepEqual(acciones, ["marcar", "pagar"]);
});
