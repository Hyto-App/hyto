import assert from "node:assert/strict";
import test from "node:test";
import { botonesRevision, cargarDetalleOrganizador, cargarVistaOrganizador } from "./remoto";
import type { TareaAdmin } from "./tipos";

const HASH = "ab".repeat(32);

function tarea(parcial: Partial<TareaAdmin> = {}): TareaAdmin {
  return {
    id: "stand",
    titulo: "Montar el stand",
    tipo: "trabajo",
    monto: "20",
    tope: null,
    condicion: "Banner",
    miembroId: "voluntario-1",
    miembro: "Voluntario 1",
    estado: "en revisión",
    veredicto: "cumplió",
    frase: "Listo",
    montoRevisado: null,
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
    pagar: false,
    aprobarLocal: true,
    pedirOtra: false,
  });
  assert.equal(botonesRevision(tarea({ veredicto: "parcial" }), false).pedirOtra, true);
  assert.deepEqual(botonesRevision(enRevision, true), {
    desplegar: true,
    pagar: true,
    aprobarLocal: false,
    pedirOtra: false,
  });
  assert.equal(botonesRevision(tarea({ estado: "pagado", hashPago: HASH }), true).desplegar, false);
  assert.equal(botonesRevision(tarea({ estado: "pendiente", veredicto: null }), true).pagar, false);
});

test("la revisión real usa la tarea del organizador y también pide /api/tareas", async () => {
  const llamadas: string[] = [];
  const fetchImpl: typeof fetch = async (input) => {
    const url = String(input);
    llamadas.push(url);
    if (url === "/api/tareas") return json({ tareas: [{ id: "stand" }, { id: "comida" }] });
    if (url === "/api/revision/stand") {
      return json({
        tarea: tarea({ hashPago: HASH, estado: "pagado" }),
        foto: "/api/evidencias/1/foto",
        enlacePago: `https://stellar.expert/explorer/testnet/tx/${HASH}`,
      });
    }
    return json({ aviso: "no" }, 404);
  };

  const detalle = await cargarDetalleOrganizador("stand", { fetch: fetchImpl });
  assert.deepEqual(llamadas.sort(), ["/api/revision/stand", "/api/tareas"]);
  assert.equal(detalle?.tarea.hashPago, HASH);
  assert.equal(detalle?.tarea.estado, "pagado");
  assert.equal(detalle?.foto, "/api/evidencias/1/foto");
});

test("sin sesión de organizador la revisión vuelve al ejemplo", async () => {
  const fetchImpl: typeof fetch = async (input) => {
    const url = String(input);
    if (url === "/api/tareas") return json({ tareas: [{ id: "stand" }] });
    return json({ aviso: "Entra para continuar." }, 401);
  };
  assert.equal(await cargarDetalleOrganizador("stand", { fetch: fetchImpl }), null);

  const vista = await cargarVistaOrganizador({ fetch: fetchImpl });
  assert.equal(vista, null);
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
