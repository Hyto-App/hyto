import assert from "node:assert/strict";
import test from "node:test";
import { listarTareas } from "./rutas";
import { cuerpoPedirOtra, leerCamposRevision, plazoVencido, puntosFallidos, sanearNota } from "./revision";

const base = {
  id: "t1",
  titulo: "Booth",
  tipo: "trabajo",
  monto: "10",
};

test("sin campos de revisión la tarea sigue siendo la de hoy", () => {
  const campos = leerCamposRevision(base, "pendiente");
  assert.equal(campos.rechazada, false);
  assert.equal(campos.rechazo, null);
  assert.equal(campos.venceEn, null);
  assert.equal(campos.intentos, 0);
  assert.deepEqual(campos.requisitos, []);
  assert.equal(campos.hashPago, null);
  assert.equal("contratoEscrow" in campos, false);
});

test("el contrato del #058 prende Rechazada sin migración", () => {
  const campos = leerCamposRevision(
    {
      ...base,
      etapa: "rechazada",
      intento: 2,
      max_intentos: 3,
      vence_en: "2026-12-31T22:00:00.000Z",
      organizador: { nombre: "Organizer" },
      requisitos: [
        { id: "a", texto: "Wristband", cumple: false, motivo: "Cropped <b>out</b>" },
        { id: "b", texto: "Table", cumple: true },
        { id: "c", texto: "Face out", cumple: true },
        { id: "d", texto: "Extra point that must be dropped", cumple: false },
      ],
      texto_scout: "secret",
      frase: "secret",
      choice: "secret",
      contratoEscrow: "SECRET",
    },
    "pendiente",
  );

  assert.equal(campos.rechazada, true);
  assert.equal(campos.etapa, "rechazada");
  assert.equal(campos.intentos, 2);
  assert.equal(campos.requisitos.length, 3);
  assert.deepEqual(campos.rechazo?.fallidos, ["a"]);
  assert.equal(campos.rechazo?.nota, "Cropped out");
  assert.equal(campos.organizador?.nombre, "Organizer");
  assert.equal(campos.venceEn, "2026-12-31T22:00:00.000Z");
  assert.equal("max_intentos" in campos, false);
  assert.equal(JSON.stringify(campos).includes("SECRET"), false);
  assert.equal(JSON.stringify(campos).includes("texto_scout"), false);
});

test("un rechazo JSON y una tarea pagada no se muestran como rechazada", () => {
  const pendiente = leerCamposRevision(
    { ...base, rechazo: JSON.stringify({ nota: "Try again", fallidos: ["b", "b", " c "], origen: "organizador", en: "2026-10-05T21:00:00.000Z" }) },
    "pendiente",
  );
  assert.equal(pendiente.rechazada, true);
  assert.deepEqual(pendiente.rechazo?.fallidos, ["b", "c"]);
  assert.equal(pendiente.rechazo?.origen, "organizador");

  const pagada = leerCamposRevision({ ...base, etapa: "rechazada", rechazo: { nota: "old" }, hashPago: "ab".repeat(32) }, "pagado");
  assert.equal(pagada.rechazada, false);
  assert.equal(pagada.rechazo, null);
  assert.equal(pagada.hashPago, "ab".repeat(32));
});

test("el plazo vencido y la nota sin HTML", () => {
  assert.equal(plazoVencido("2026-10-01T00:00:00.000Z", new Date("2026-10-05T12:00:00.000Z")), true);
  assert.equal(plazoVencido("2026-12-01T00:00:00.000Z", new Date("2026-10-05T12:00:00.000Z")), false);
  assert.equal(plazoVencido(null), false);
  assert.equal(sanearNota("  <script>no</script> hi  "), "no hi");
  assert.equal(sanearNota("   "), null);
});

test("la hoja del organizador manda el contrato y no un tope de intentos", () => {
  const cuerpo = cuerpoPedirOtra("  Please retake  ", [0, 4], ["Wristband", "Table"]);
  assert.equal(cuerpo.nota, "Please retake");
  assert.deepEqual(cuerpo.fallidos, ["0"]);
  assert.deepEqual(cuerpo.rechazo.fallidos, ["0"]);
  assert.equal(cuerpo.rechazo.origen, "organizador");
  assert.deepEqual(
    cuerpo.requisitos.map((punto) => punto.cumple),
    [false, true],
  );
  assert.equal("max_intentos" in cuerpo, false);
});

test("listar tareas conserva el contrato cuando el API lo manda", async () => {
  const fetchImpl: typeof fetch = async () =>
    new Response(
      JSON.stringify({
        tareas: [
          {
            ...base,
            id: "real",
            proyectoId: "zeek",
            miembroId: "v",
            walletCobro: "",
            estado: "pendiente",
            etapa: "rechazada",
            contratoEscrow: "NO",
            hashPago: null,
          },
        ],
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );

  const lista = await listarTareas({ miembroId: "v" }, { fetch: fetchImpl });
  assert.equal(lista.tareas[0]?.rechazada, true);
  assert.equal("contratoEscrow" in (lista.tareas[0] ?? {}), false);
});

test("fallidos son ids de requisitos (r1), no posiciones, y se ubican en la lista", () => {
  const campos = leerCamposRevision(
    {
      ...base,
      etapa: "rechazada",
      rechazo: { nota: "Table missing", fallidos: ["r2", 1, "r2", ""], origen: "mile" },
      requisitos: [
        { id: "r1", texto: "Wristband", cumple: true },
        { id: "r2", texto: "Table", cumple: false },
        { id: "r3", texto: "Face out", cumple: true },
      ],
    },
    "pendiente",
  );
  assert.deepEqual(campos.rechazo?.fallidos, ["r2"]);
  assert.deepEqual(puntosFallidos({ rechazo: campos.rechazo, requisitos: campos.requisitos }, 3), [1]);
});

test("sin ids de requisito el punto N se llama \"N\" y sin fallidos no se marca nada", () => {
  assert.deepEqual(puntosFallidos({ rechazo: { nota: null, fallidos: ["1"], en: null, origen: null }, requisitos: [] }, 3), [1]);
  assert.deepEqual(puntosFallidos({ rechazo: { nota: "x", fallidos: [], en: null, origen: null }, requisitos: [] }, 3), []);
  assert.deepEqual(puntosFallidos({ rechazo: null }, 3), []);
});

test("la etapa y la hora de envío salen de /api/tareas?alcance=mias y, si faltan, queda como hoy", async () => {
  const pedidos: string[] = [];
  const crear = (extra: Record<string, unknown>): typeof fetch =>
    (async (entrada: RequestInfo | URL) => {
      pedidos.push(String(entrada));
      return new Response(
        JSON.stringify({ tareas: [{ ...base, proyectoId: "zeek", miembroId: "v", walletCobro: "", estado: "en revisión", ...extra }] }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }) as typeof fetch;
  const con = await listarTareas({ miembroId: "v" }, { fetch: crear({ etapa: "enviada_organizador", enviadaEn: "2026-10-05T21:00:00.000Z" }) });
  assert.equal(con.tareas[0].etapa, "enviada_organizador");
  assert.equal(con.tareas[0].enviadaEn, "2026-10-05T21:00:00.000Z");
  assert.ok(pedidos[0].includes("alcance=mias"));
  const sin = await listarTareas({ miembroId: "v" }, { fetch: crear({}) });
  assert.equal(sin.tareas[0].etapa, null);
  assert.equal(sin.tareas[0].enviadaEn, null);
});
