import assert from "node:assert/strict";
import test from "node:test";
import { AVISO_ENTRAR } from "@/lib/sesion/avisos";
import { botonesRevision, cargarDetalleOrganizador, cargarVistaOrganizador, escrowFondeado, leerFondeo, montoDeVista, reintentarRevision } from "./remoto";
import type { TareaAdmin } from "./tipos";

const HASH = "ab".repeat(32);

function tarea(parcial: Partial<TareaAdmin> = {}): TareaAdmin {
  return {
    id: "stand",
    titulo: "Set up the booth",
    tipo: "trabajo",
    monto: "20",
    tope: null,
    condicion: "Banner",
    miembroId: "voluntario-1",
    miembro: "Volunteer 1",
    estado: "en revisión",
    veredicto: "cumplió",
    frase: "Listo",
    origen: null,
    codigo: null,
    montoRevisado: null,
    montoConfirmado: null,
    fecha: null,
    hashPago: null,
    credencialUrl: null,
    ...parcial,
  };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

test("en demo se aprueba en el navegador y con sesión real aparecen las dos acciones", () => {
  const enRevision = tarea();
  assert.deepEqual(botonesRevision(enRevision, false), {
    desplegar: false,
    fondear: false,
    pagar: false,
    aprobarLocal: true,
    pedirOtra: false,
  });
  assert.equal(botonesRevision(tarea({ veredicto: "parcial" }), false).pedirOtra, true);
  assert.deepEqual(botonesRevision(enRevision, true), {
    desplegar: true,
    fondear: false,
    pagar: false,
    aprobarLocal: false,
    pedirOtra: true,
  });
  assert.equal(botonesRevision(tarea({ estado: "pagado", hashPago: HASH }), true).desplegar, false);
  assert.equal(botonesRevision(tarea({ estado: "pendiente", veredicto: null }), true).pagar, false);
  const conContrato = { contrato: "CSTAND", fondeado: false as boolean | null };
  assert.deepEqual(botonesRevision(enRevision, true, conContrato), {
    desplegar: false,
    fondear: true,
    pagar: false,
    aprobarLocal: false,
    pedirOtra: true,
  });
  assert.equal(botonesRevision(enRevision, true, { contrato: "CSTAND", fondeado: true }).fondear, false);
  assert.equal(botonesRevision(enRevision, true, { contrato: "CSTAND", fondeado: true }).pagar, true);
  assert.equal(botonesRevision(enRevision, true, { contrato: "CSTAND", fondeado: null }).fondear, false);
  assert.equal(botonesRevision(tarea({ estado: "pagado", hashPago: HASH }), true, conContrato).desplegar, false);
  assert.equal(botonesRevision(tarea({ estado: "pagado", hashPago: HASH }), true, conContrato).fondear, false);
  const error = botonesRevision(tarea({ origen: "error", veredicto: null }), true, conContrato);
  assert.equal(error.desplegar, false);
  assert.equal(error.fondear, false);
  assert.equal(error.pagar, false);
  const sinMonto = botonesRevision(tarea({ tipo: "reembolso", montoRevisado: null, origen: "scout" }), true, conContrato);
  assert.equal(sinMonto.desplegar, false);
  assert.equal(sinMonto.fondear, false);
  assert.equal(sinMonto.pagar, false);
  const soloLectura = botonesRevision(
    tarea({ tipo: "reembolso", monto: "15", tope: "15", montoRevisado: "12.40", origen: "scout", estado: "en revisión" }),
    true,
    conContrato,
  );
  assert.equal(soloLectura.desplegar, false);
  assert.equal(soloLectura.fondear, false);
  const conMonto = botonesRevision(
    tarea({
      tipo: "reembolso",
      monto: "15",
      tope: "15",
      montoRevisado: "12.40",
      montoConfirmado: "12.40",
      origen: "scout",
      estado: "en revisión",
    }),
    true,
    conContrato,
  );
  assert.equal(conMonto.fondear, true);
  assert.equal(conMonto.pagar, false);
  assert.equal(
    botonesRevision(
      tarea({
        tipo: "reembolso",
        monto: "15",
        tope: "15",
        montoRevisado: "12.40",
        montoConfirmado: "12.40",
        origen: "scout",
        estado: "en revisión",
      }),
      true,
      { contrato: "CSTAND", fondeado: true },
    ).pagar,
    true,
  );
  const sobreTope = botonesRevision(
    tarea({
      tipo: "reembolso",
      monto: "15",
      tope: "15",
      montoRevisado: "20",
      montoConfirmado: "20",
      origen: "scout",
    }),
    true,
    { contrato: null, fondeado: null },
  );
  assert.equal(sobreTope.desplegar, false);
});

test("la revisión real usa la tarea del organizador y también pide /api/tareas", async () => {
  const llamadas: string[] = [];
  const fetchImpl: typeof fetch = async (input) => {
    const url = String(input);
    llamadas.push(url);
    if (url === "/api/tareas") {
      return json({
        tareas: [
          { id: "stand", hashPago: HASH, contratoEscrow: "CSTAND" },
          { id: "comida", hashPago: null, contratoEscrow: null },
        ],
      });
    }
    if (url === "/api/revision/stand") {
      return json({
        tarea: tarea({ estado: "pagado" }),
        foto: "/api/evidencias/1/foto",
        enlacePago: `https://stellar.expert/explorer/testnet/tx/${HASH}`,
        contratoEscrow: "CSTAND",
        walletCobro: "GCOBRO",
        wallet: "GORGANIZADOR",
      });
    }
    return json({ aviso: "no" }, 404);
  };

  const detalle = await cargarDetalleOrganizador("stand", { fetch: fetchImpl });
  assert.deepEqual(llamadas.sort(), ["/api/revision/stand", "/api/tareas"]);
  assert.equal(detalle?.tarea.hashPago, HASH);
  assert.equal(detalle?.tarea.estado, "pagado");
  assert.equal(detalle?.foto, "/api/evidencias/1/foto");
  assert.equal(detalle?.contratoEscrow, "CSTAND");
  assert.equal(detalle?.walletCobro, "GCOBRO");
  assert.equal(detalle?.wallet, "GORGANIZADOR");
  assert.equal(montoDeVista(tarea({ tipo: "reembolso", monto: "15", tope: "15", montoRevisado: "12.40" })), null);
  assert.equal(
    montoDeVista(tarea({ tipo: "reembolso", monto: "15", tope: "15", montoRevisado: "20", montoConfirmado: "12.40" })),
    12.4,
  );
  assert.equal(
    montoDeVista(tarea({ tipo: "reembolso", monto: "15", tope: "15", montoRevisado: "12.40", montoConfirmado: "20" })),
    null,
  );
});

test("fondear solo aparece si el escrow desplegado todavía no tiene saldo", async () => {
  assert.equal(escrowFondeado({ escrow: { balance: 1 } }), true);
  assert.equal(escrowFondeado({ escrow: { balance: 0 } }), false);
  assert.equal(escrowFondeado({ escrow: { balance: "2" } }), true);
  assert.equal(escrowFondeado({}), null);

  const llamadas: string[] = [];
  const fetchImpl: typeof fetch = async (input) => {
    const url = String(input);
    llamadas.push(url);
    if (url === "/api/escrow/C%20STAND") return json({ escrow: { balance: 0 } });
    return json({ aviso: "no" }, 404);
  };
  assert.equal(await leerFondeo(" C STAND ", { fetch: fetchImpl }), false);
  assert.deepEqual(llamadas, ["/api/escrow/C%20STAND"]);
  assert.equal(await leerFondeo("CSTAND", { fetch: async () => json({ aviso: "no" }, 401) }), null);
});

test("sin sesión de organizador la revisión vuelve al ejemplo", async () => {
  const fetchImpl: typeof fetch = async (input) => {
    const url = String(input);
    if (url === "/api/tareas") return json({ tareas: [{ id: "stand" }] });
    return json({ aviso: AVISO_ENTRAR }, 401);
  };
  assert.equal(await cargarDetalleOrganizador("stand", { fetch: fetchImpl }), null);

  const vista = await cargarVistaOrganizador({ fetch: fetchImpl });
  assert.equal(vista, null);
});

test("la bandeja muestra los proyectos que organiza y omite el resto", async () => {
  const fetchImpl: typeof fetch = async (input) => {
    const url = String(input);
    if (url === "/api/tareas") return json({ tareas: [{ id: "stand" }, { id: "ajena" }] });
    if (url === "/api/proyectos") return json({ proyecto: { nombre: "Feria" } });
    if (url === "/api/revision/stand") return json({ tarea: tarea(), foto: null });
    if (url === "/api/revision/ajena") return json({ aviso: "Only the organizer reviews." }, 403);
    return json({ aviso: "no" }, 404);
  };
  const vista = await cargarVistaOrganizador({ fetch: fetchImpl });
  assert.deepEqual(
    vista?.tareas.map((item) => item.id),
    ["stand"],
  );
  assert.equal(vista?.nombre, "Feria");

  const soloAjena: typeof fetch = async (input) => {
    const url = String(input);
    if (url === "/api/tareas") return json({ tareas: [{ id: "ajena" }] });
    return json({ aviso: "Only the organizer reviews." }, 403);
  };
  const vacia = await cargarVistaOrganizador({ fetch: soloAjena });
  assert.deepEqual(vacia?.tareas, []);
});

test("la vista real arma Ver pago con el hash de cada revisión", async () => {
  const fetchImpl: typeof fetch = async (input) => {
    const url = String(input);
    if (url === "/api/tareas") return json({ tareas: [{ id: "stand" }, { id: "comida" }] });
    if (url === "/api/proyectos") return json({ proyecto: { nombre: "ZEEK" } });
    if (url === "/api/revision/stand") return json({ tarea: tarea({ estado: "pagado", hashPago: HASH }), foto: null });
    if (url === "/api/revision/comida") {
      return json({
        tarea: tarea({
          id: "comida",
          titulo: "Comida",
          tipo: "reembolso",
          monto: "15",
          tope: "15",
          estado: "en revisión",
          montoRevisado: "12.40",
        }),
        foto: null,
      });
    }
    return json({ aviso: "no" }, 404);
  };

  const vista = await cargarVistaOrganizador({ fetch: fetchImpl });
  assert.equal(vista?.ejemplo, false);
  assert.equal(vista?.nombre, "ZEEK");
  assert.equal(vista?.tareas.find((item) => item.id === "stand")?.hashPago, HASH);
  assert.deepEqual(
    vista?.bandeja.map((item) => item.id),
    ["comida"],
  );
});

test("reintentar revisión hace POST a la tarea", async () => {
  const llamadas: { url: string; method: string }[] = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    const url = String(input);
    llamadas.push({ url, method: init?.method ?? "GET" });
    return json({
      tarea: tarea({ origen: "scout", codigo: null, frase: "Banner de ZEEK." }),
      foto: "/api/evidencias/1/foto",
      contratoEscrow: null,
      walletCobro: null,
      wallet: "GORGANIZADOR",
    });
  };
  const detalle = await reintentarRevision("stand", { fetch: fetchImpl });
  assert.deepEqual(llamadas, [{ url: "/api/revision/stand", method: "POST" }]);
  assert.equal(detalle?.tarea.origen, "scout");
  assert.equal(detalle?.tarea.frase, "Banner de ZEEK.");
  assert.equal(await reintentarRevision("  ", { fetch: fetchImpl }), null);
});
