import assert from "node:assert/strict";
import test from "node:test";
import {
  AVISO_DEMO_FIRMA,
  AVISO_FIRMA,
  AVISO_RECHAZO,
  AVISO_REINGRESO,
  AVISO_SESION_CAVOS,
  AVISO_XLM,
  ErrorFirmaCliente,
  firmarPasos,
  firmarYEnviar,
  mensajeFirmaVisible,
  pasosDesde,
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

test("prepara, firma el XDR con Cavos y reenvía el contrato al enviar", async () => {
  const red = fetchDe([
    { body: { xdr: XDR, hashPreparado: "prep", contrato: "C1", token: "tok" } },
    { body: { hash: "a".repeat(64), ledger: 9, codigo: null, contrato: "C1", estado: "SUCCESS" } },
  ]);
  const firmados: string[] = [];
  const pago = await firmarYEnviar(
    "fondear",
    " stand ",
    { monto: 2, firmante: "G1", contrato: "C0" },
    {
      fetch: red.fetch,
      firmar: async (xdr) => {
        firmados.push(xdr);
        return `  ${FIRMADO}  `;
      },
    },
  );

  assert.deepEqual(firmados, [XDR]);
  assert.equal(pago.hash, "a".repeat(64));
  assert.equal(pago.ledger, 9);
  assert.equal(pago.estado, "SUCCESS");
  assert.equal(pago.contrato, "C1");
  assert.deepEqual(red.llamadas[0], {
    url: "/api/firma",
    body: { accion: "fondear", tareaId: "stand", contrato: "C0", firmante: "G1", monto: 2 },
  });
  assert.deepEqual(red.llamadas[1], {
    url: "/api/firma/enviar",
    body: { xdr: FIRMADO, accion: "fondear", tareaId: "stand", contrato: "C1", token: "tok" },
  });
});

test("desplegar solo manda la tarea y usa el contrato conocido si la respuesta no trae uno", async () => {
  const red = fetchDe([
    { body: { xdr: XDR, hashPreparado: "prep", contrato: null, monto: 20, token: "tok" } },
    { body: { hash: null, ledger: null, codigo: null, contrato: null, estado: "SUCCESS", aviso: "guardado" } },
  ]);
  const pago = await firmarYEnviar(
    "desplegar",
    "stand",
    { firmante: "G1", contrato: "C2", monto: 1 },
    { fetch: red.fetch, firmar: async () => FIRMADO },
  );
  assert.equal(pago.hash, null);
  assert.equal(pago.aviso, "guardado");
  assert.equal(pago.monto, 20);
  assert.equal(pago.contrato, "C2");
  assert.deepEqual(red.llamadas[0]?.body, { accion: "desplegar", tareaId: "stand" });
  assert.deepEqual(red.llamadas[1]?.body, { xdr: FIRMADO, accion: "desplegar", tareaId: "stand", contrato: "C2", token: "tok" });
});

test("el 403 de demo, el XLM insuficiente y el rechazo usan avisos en español", async () => {
  const demo = fetchDe([{ status: 403, body: { aviso: AVISO_DEMO_FIRMA } }]);
  await assert.rejects(
    () => firmarYEnviar("liberar", "stand", {}, { fetch: demo.fetch, firmar: async () => FIRMADO }),
    (error: unknown) => error instanceof ErrorFirmaCliente && error.message === AVISO_DEMO_FIRMA && error.estado === 403,
  );

  const xlm = fetchDe([
    { body: { xdr: XDR, token: "tok" } },
    { status: 400, body: { aviso: "fee", codigo: "STELLAR_TX_INSUFFICIENT_BALANCE" } },
  ]);
  await assert.rejects(
    () => firmarYEnviar("fondear", "stand", {}, { fetch: xlm.fetch, firmar: async () => FIRMADO }),
    (error: unknown) => error instanceof ErrorFirmaCliente && error.message === AVISO_XLM,
  );

  const rechazo = fetchDe([{ body: { xdr: XDR, token: "tok" } }]);
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
    (error: unknown) => error instanceof ErrorFirmaCliente && error.message === "We couldn't prepare that step. Try again.",
  );
});

test("desplegar y fondear pasan el contrato y el monto, y se detienen si fondear falla", async () => {
  const red = fetchDe([
    { body: { xdr: "uno", hashPreparado: "p1", contrato: "C9", monto: 20, token: "tok-1" } },
    { body: { hash: "h1", ledger: 1, codigo: null, contrato: "C9", estado: "SUCCESS" } },
    { body: { xdr: "dos", hashPreparado: "p2", contrato: "C9", token: "tok-2" } },
    { status: 502, body: { aviso: "Could not submit the payment." } },
  ]);
  const vistos: string[] = [];
  await assert.rejects(
    () =>
      firmarPasos(["desplegar", "fondear"], "tarea-1", {
        fetch: red.fetch,
        extra: { firmante: "GORGANIZADOR", indice: 0, estado: "completed" },
        firmar: async (xdr) => xdr,
        alEmpezar: (accion) => vistos.push(accion),
      }),
    (error: unknown) =>
      error instanceof ErrorFirmaCliente &&
      error.message === "Could not submit the payment." &&
      error.contrato === "C9",
  );
  assert.deepEqual(vistos, ["desplegar", "fondear"]);
  assert.deepEqual(red.llamadas[0]?.body, { accion: "desplegar", tareaId: "tarea-1" });
  assert.deepEqual(red.llamadas[1]?.body, { xdr: "uno", accion: "desplegar", tareaId: "tarea-1", contrato: "C9", token: "tok-1" });
  assert.deepEqual(red.llamadas[2]?.body, {
    accion: "fondear",
    tareaId: "tarea-1",
    contrato: "C9",
    firmante: "GORGANIZADOR",
    monto: 20,
  });
});

test("aprobar y pagar retoma desde el paso que falló", () => {
  assert.deepEqual(pasosDesde(null), ["marcar", "aprobar", "liberar"]);
  assert.deepEqual(pasosDesde("aprobar"), ["aprobar", "liberar"]);
  assert.deepEqual(pasosDesde("liberar"), ["liberar"]);
  assert.deepEqual(pasosDesde("fondear"), ["marcar", "aprobar", "liberar"]);
});

test("sin identidad de Cavos restaurada no autentica ni envía", async () => {
  const previo = process.env.NEXT_PUBLIC_CAVOS_APP_ID;
  process.env.NEXT_PUBLIC_CAVOS_APP_ID = "app-test";
  const red = fetchDe([{ body: { xdr: XDR, hashPreparado: "p", contrato: "C1", token: "tok" } }]);
  try {
    await assert.rejects(
      () => firmarYEnviar("fondear", "stand", { contrato: "C1", firmante: "G1" }, { fetch: red.fetch }),
      (error: unknown) => error instanceof ErrorFirmaCliente && error.message === AVISO_SESION_CAVOS,
    );
    assert.equal(red.llamadas.length, 1);
    assert.equal(red.llamadas[0]?.url, "/api/firma");
  } finally {
    if (previo === undefined) delete process.env.NEXT_PUBLIC_CAVOS_APP_ID;
    else process.env.NEXT_PUBLIC_CAVOS_APP_ID = previo;
  }
});

test("un token vencido de la bóveda se muestra como sesión de Cavos cerrada", async () => {
  const red = fetchDe([{ body: { xdr: XDR, token: "tok" } }]);
  await assert.rejects(
    () =>
      firmarYEnviar("fondear", "stand", {}, {
        fetch: red.fetch,
        firmar: async () => {
          throw new Error("registry lookup failed: 401 token expired");
        },
      }),
    (error: unknown) => error instanceof ErrorFirmaCliente && error.message === AVISO_SESION_CAVOS,
  );
  assert.equal(mensajeFirmaVisible(AVISO_SESION_CAVOS), AVISO_REINGRESO);
});

test("con identidad en sessionStorage pasa restoreIdentity y no dice que la sesión se cerró", async () => {
  const previo = process.env.NEXT_PUBLIC_CAVOS_APP_ID;
  process.env.NEXT_PUBLIC_CAVOS_APP_ID = "app-test";
  const sesion = new Map<string, string>([["cavos-kit:identity:app-test", JSON.stringify({ userId: "u1", email: "a@b.c" })]]);
  const local = new Map<string, string>();
  const almacenamiento = (datos: Map<string, string>) => ({
    getItem: (clave: string) => datos.get(clave) ?? null,
    setItem: (clave: string, valor: string) => {
      datos.set(clave, valor);
    },
    removeItem: (clave: string) => {
      datos.delete(clave);
    },
  });
  const global = globalThis as { window?: unknown; fetch?: typeof fetch };
  const fetchPrevio = global.fetch;
  global.window = { sessionStorage: almacenamiento(sesion), localStorage: almacenamiento(local) };
  global.fetch = async () => {
    throw new Error("red cortada");
  };
  const red = fetchDe([{ body: { xdr: XDR, hashPreparado: "p", contrato: "C1", token: "tok" } }]);
  try {
    await assert.rejects(
      () => firmarYEnviar("fondear", "stand", { contrato: "C1", firmante: "G1" }, { fetch: red.fetch }),
      (error: unknown) =>
        error instanceof ErrorFirmaCliente &&
        error.message !== AVISO_SESION_CAVOS &&
        !error.message.includes("no identity"),
    );
    assert.equal(red.llamadas.length, 1);
  } finally {
    delete global.window;
    global.fetch = fetchPrevio;
    if (previo === undefined) delete process.env.NEXT_PUBLIC_CAVOS_APP_ID;
    else process.env.NEXT_PUBLIC_CAVOS_APP_ID = previo;
  }
});

test("un token vigente en otra pestaña reconstruye la identidad antes de firmar", async () => {
  const previo = process.env.NEXT_PUBLIC_CAVOS_APP_ID;
  process.env.NEXT_PUBLIC_CAVOS_APP_ID = "app-test";
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const token = jwt({ sub: "usuario-1", email: "ana@hyto.app", exp });
  const local = new Map<string, string>([["hyto:cavos-token:app-test", token]]);
  const sesion = new Map<string, string>();
  const almacenamiento = (datos: Map<string, string>) => ({
    getItem: (clave: string) => datos.get(clave) ?? null,
    setItem: (clave: string, valor: string) => {
      datos.set(clave, valor);
    },
    removeItem: (clave: string) => {
      datos.delete(clave);
    },
  });
  const global = globalThis as { window?: unknown; fetch?: typeof fetch };
  const fetchPrevio = global.fetch;
  global.window = { sessionStorage: almacenamiento(sesion), localStorage: almacenamiento(local) };
  global.fetch = async () => {
    throw new Error("red cortada");
  };
  const red = fetchDe([{ body: { xdr: XDR, hashPreparado: "p", contrato: "C1", token: "tok" } }]);
  try {
    await assert.rejects(
      () => firmarYEnviar("fondear", "stand", { contrato: "C1", firmante: "G1" }, { fetch: red.fetch }),
      (error: unknown) => error instanceof ErrorFirmaCliente && error.message !== AVISO_SESION_CAVOS,
    );
    assert.equal(sesion.get("cavos-kit:token:app-test"), token);
    assert.match(local.get("cavos-kit:identity:app-test") ?? "", /usuario-1/);
  } finally {
    delete global.window;
    global.fetch = fetchPrevio;
    if (previo === undefined) delete process.env.NEXT_PUBLIC_CAVOS_APP_ID;
    else process.env.NEXT_PUBLIC_CAVOS_APP_ID = previo;
  }
});

test("un token vencido y sin identidad no se puede refrescar", async () => {
  const previo = process.env.NEXT_PUBLIC_CAVOS_APP_ID;
  process.env.NEXT_PUBLIC_CAVOS_APP_ID = "app-test";
  const exp = Math.floor(Date.now() / 1000) - 120;
  const token = jwt({ sub: "usuario-1", exp });
  const local = new Map<string, string>([["hyto:cavos-token:app-test", token]]);
  const sesion = new Map<string, string>([["cavos-kit:token:app-test", token]]);
  const almacenamiento = (datos: Map<string, string>) => ({
    getItem: (clave: string) => datos.get(clave) ?? null,
    setItem: (clave: string, valor: string) => {
      datos.set(clave, valor);
    },
    removeItem: (clave: string) => {
      datos.delete(clave);
    },
  });
  const global = globalThis as { window?: unknown };
  global.window = { sessionStorage: almacenamiento(sesion), localStorage: almacenamiento(local) };
  const red = fetchDe([{ body: { xdr: XDR, hashPreparado: "p", contrato: "C1", token: "tok" } }]);
  try {
    await assert.rejects(
      () => firmarYEnviar("fondear", "stand", { contrato: "C1" }, { fetch: red.fetch }),
      (error: unknown) => error instanceof ErrorFirmaCliente && error.message === AVISO_SESION_CAVOS,
    );
    assert.equal(sesion.has("cavos-kit:token:app-test"), false);
    assert.equal(local.has("hyto:cavos-token:app-test"), false);
    assert.equal(red.llamadas.length, 1);
  } finally {
    delete global.window;
    if (previo === undefined) delete process.env.NEXT_PUBLIC_CAVOS_APP_ID;
    else process.env.NEXT_PUBLIC_CAVOS_APP_ID = previo;
  }
});

function jwt(payload: Record<string, unknown>): string {
  const parte = (valor: Record<string, unknown>) => Buffer.from(JSON.stringify(valor)).toString("base64url");
  return `${parte({ alg: "none" })}.${parte(payload)}.x`;
}
