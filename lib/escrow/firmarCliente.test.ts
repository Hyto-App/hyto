import assert from "node:assert/strict";
import test from "node:test";
import {
  AVISO_DEMO_FIRMA,
  AVISO_FIRMA,
  AVISO_RECHAZO,
  AVISO_XLM,
  ErrorFirmaCliente,
  firmarPasos,
  firmarYEnviar,
} from "./firmarCliente";

const XDR = "UNSIGNED";
const FIRMADO = "SIGNED";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function fetchDe(pasos: { status?: number; body: unknown }[]): {
  fetch: typeof fetch;
  llamadas: { url: string; body: unknown }[];
} {
  const llamadas: { url: string; body: unknown }[] = [];
  let i = 0;
  const fetchImpl: typeof fetch = async (input, init) => {
    const crudo = init?.body;
    llamadas.push({
      url: String(input),
      body: typeof crudo === "string" ? (JSON.parse(crudo) as unknown) : null,
    });
    const paso = pasos[i] ?? { status: 500, body: { aviso: "sin paso" } };
    i += 1;
    return json(paso.body, paso.status ?? 200);
  };
  return { fetch: fetchImpl, llamadas };
}

test("prepara, firma el XDR con Cavos y envía la acción y la tarea", async () => {
  const red = fetchDe([
    { body: { xdr: XDR, hashPreparado: "prep", contrato: "C1" } },
    { body: { hash: "a".repeat(64), contrato: "C1" } },
  ]);
  const firmados: string[] = [];
  const pago = await firmarYEnviar("fondear", " stand ", { monto: 2, accion: "liberar", xdr: "no" }, {
    fetch: red.fetch,
    firmar: async (xdr) => {
      firmados.push(xdr);
      return `  ${FIRMADO}  `;
    },
  });

  assert.deepEqual(firmados, [XDR]);
  assert.equal(pago.hash, "a".repeat(64));
  assert.equal(pago.contrato, "C1");
  assert.deepEqual(red.llamadas[0], {
    url: "/api/firma",
    body: { monto: 2, accion: "fondear", tareaId: "stand" },
  });
  assert.deepEqual(red.llamadas[1], {
    url: "/api/firma/enviar",
    body: { xdr: FIRMADO, accion: "fondear", tareaId: "stand" },
  });
});

test("acepta unsignedXdr y un hash vacío no es un fallo", async () => {
  const red = fetchDe([{ body: { unsignedXdr: XDR, contractId: "C2" } }, { body: { status: "SUCCESS", contrato: null } }]);
  const pago = await firmarYEnviar("desplegar", "stand", {}, { fetch: red.fetch, firmar: async () => FIRMADO });
  assert.equal(pago.hash, null);
  assert.equal(pago.contrato, "C2");
});

test("el 403 de demo, el XLM insuficiente y el rechazo usan avisos en español", async () => {
  const demo = fetchDe([{ status: 403, body: { aviso: AVISO_DEMO_FIRMA } }]);
  await assert.rejects(
    () => firmarYEnviar("liberar", "stand", {}, { fetch: demo.fetch, firmar: async () => FIRMADO }),
    (error: unknown) => error instanceof ErrorFirmaCliente && error.message === AVISO_DEMO_FIRMA && error.estado === 403,
  );

  const xlm = fetchDe([
    { body: { xdr: XDR } },
    { status: 400, body: { aviso: "fee", codigo: "STELLAR_TX_INSUFFICIENT_BALANCE" } },
  ]);
  await assert.rejects(
    () => firmarYEnviar("fondear", "stand", {}, { fetch: xlm.fetch, firmar: async () => FIRMADO }),
    (error: unknown) => error instanceof ErrorFirmaCliente && error.message === AVISO_XLM,
  );

  const rechazo = fetchDe([{ body: { xdr: XDR } }]);
  await assert.rejects(
    () =>
      firmarYEnviar("aprobar", "stand", {}, {
        fetch: rechazo.fetch,
        firmar: async () => {
          throw new Error("kit/vault: the user rejected this transaction");
        },
      }),
    (error: unknown) => error instanceof ErrorFirmaCliente && error.message === AVISO_RECHAZO,
  );
});

test("un fallo de red o un XDR vacío no muestran el error crudo", async () => {
  const fetchImpl: typeof fetch = async () => {
    throw new Error("failed to fetch");
  };
  await assert.rejects(
    () => firmarYEnviar("marcar", "stand", {}, { fetch: fetchImpl, firmar: async () => FIRMADO }),
    (error: unknown) => error instanceof ErrorFirmaCliente && error.message === AVISO_FIRMA && !error.message.includes("fetch"),
  );

  const vacio = fetchDe([{ body: { hashPreparado: "x" } }]);
  await assert.rejects(
    () => firmarYEnviar("marcar", "stand", {}, { fetch: vacio.fetch, firmar: async () => FIRMADO }),
    (error: unknown) => error instanceof ErrorFirmaCliente && error.message === "La preparación no devolvió el XDR.",
  );
});

test("desplegar y fondear reenvían el contrato y se detienen si fondear falla", async () => {
  const red = fetchDe([
    { body: { xdr: "uno", contrato: "C9" } },
    { body: { hash: "h1", contrato: "C9" } },
    { body: { xdr: "dos" } },
    { status: 502, body: { aviso: "No se pudo enviar el pago." } },
  ]);
  const vistos: string[] = [];
  await assert.rejects(
    () =>
      firmarPasos(["desplegar", "fondear"], "tarea-1", {
        fetch: red.fetch,
        firmar: async (xdr) => xdr,
        alEmpezar: (accion) => vistos.push(accion),
      }),
    (error: unknown) => error instanceof ErrorFirmaCliente && error.message === "No se pudo enviar el pago.",
  );
  assert.deepEqual(vistos, ["desplegar", "fondear"]);
  assert.deepEqual(red.llamadas[2]?.body, { accion: "fondear", tareaId: "tarea-1", contrato: "C9" });
});
