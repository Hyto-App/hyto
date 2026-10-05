import assert from "node:assert/strict";
import test from "node:test";
import { GET as tareasGet } from "../../app/api/tareas/route";
import { crearMemoria } from "../db/memoria";
import { asegurarSemilla } from "../db/semilla";
import type { VeredictoFila } from "../db/tipos";
import { listarTareasHttp, notaPublica } from "./tareas";

const PROHIBIDO = [
  "frase",
  "textoScout",
  "texto_scout",
  "choice",
  "etiquetas",
  "origen",
  "codigo",
  "motivoCopia",
  "noul",
  "detalle",
  "SECRETO-LAYA",
  "Category",
  "textoScout",
  "texto_scout",
];

test("notaPublica solo sale con un entero de 0 a 100 y la banda de esa nota", () => {
  assert.equal(notaPublica(null), null);
  assert.equal(notaPublica(fila({ origen: "error", score: "40", frase: "SECRETO-LAYA" })), null);
  assert.equal(notaPublica(fila({ origen: "scout", score: "cumplió" })), null);
  assert.deepEqual(notaPublica(fila({ origen: "scout", score: "64", veredicto: "cumplió" })), {
    nota: 64,
    veredicto: "parcial",
  });
  assert.equal(notaPublica(fila({ origen: "stub", score: "0" }))?.veredicto, "insuficiente");
  assert.equal(notaPublica(fila({ origen: "guion", score: "49" }))?.veredicto, "insuficiente");
  assert.equal(notaPublica(fila({ origen: "scout", score: "50" }))?.veredicto, "parcial");
  assert.equal(notaPublica(fila({ origen: "scout", score: "79" }))?.veredicto, "parcial");
  assert.equal(notaPublica(fila({ origen: "scout", score: "80" }))?.veredicto, "cumplió");
  assert.equal(notaPublica(fila({ origen: "scout", score: "100" }))?.nota, 100);
});

test("el voluntario recibe su porcentaje y no el texto interno", async () => {
  const almacen = crearMemoria();
  await asegurarSemilla(almacen);
  await almacen.asignarOrganizador("zeek", "organizador");
  const guardado = await almacen.veredictoDe("ejemplo-stand");
  assert.ok(guardado);
  await almacen.guardarVeredicto({
    ...guardado,
    veredicto: "cumplió",
    score: "64",
    origen: "scout",
    frase: "SECRETO-LAYA Category stand, grade 64%.",
    textoScout: "SECRETO-LAYA detalle interno",
    choice: "stand",
  });

  const propias = await listarTareasHttp(almacen, { usuarioId: "voluntario-1", demo: false }, "mias");
  assert.equal(propias.status, 200);
  const cuerpo = (await propias.json()) as { tareas: Registro[] };
  const stand = cuerpo.tareas.find((tarea) => tarea.id === "stand");
  const comida = cuerpo.tareas.find((tarea) => tarea.id === "comida");
  assert.ok(stand);
  assert.equal(stand.nota, 64);
  assert.equal(stand.veredicto, "parcial");
  assert.equal(stand.hashPago, null);
  assert.equal("contratoEscrow" in stand, true);
  assert.equal(comida?.nota, 90);
  assert.equal(comida?.veredicto, "cumplió");
  assert.equal(cuerpo.tareas.some((tarea) => tarea.id === "registro"), false);
  const plano = JSON.stringify(cuerpo);
  for (const clave of PROHIBIDO) assert.equal(plano.includes(clave), false, clave);
  assert.equal(stand.origen, undefined);
  assert.equal(stand.etapa, null);
  assert.equal(stand.enviadaEn, null);
  assert.deepEqual(Object.keys(stand).sort(), [
    "condicion",
    "contratoEscrow",
    "dificultad",
    "enviadaEn",
    "estado",
    "etapa",
    "hashPago",
    "id",
    "intentos",
    "miembroId",
    "monto",
    "nota",
    "prioridad",
    "proyectoId",
    "rechazada",
    "rechazo",
    "requisitos",
    "revision",
    "tipo",
    "titulo",
    "tope",
    "veredicto",
    "walletCobro",
  ]);

  const ajenas = await listarTareasHttp(almacen, { usuarioId: "voluntario-2", demo: false }, "mias");
  const deOtro = (await ajenas.json()) as { tareas: Registro[] };
  assert.equal(deOtro.tareas.some((tarea) => tarea.id === "stand"), false);
  assert.equal(deOtro.tareas.find((tarea) => tarea.id === "registro")?.nota, 65);
  assert.equal(JSON.stringify(deOtro).includes("SECRETO-LAYA"), false);

  const evento = await listarTareasHttp(almacen, { usuarioId: "voluntario-1", demo: false }, "evento");
  const sinNota = (await evento.json()) as { tareas: Registro[] };
  assert.equal(sinNota.tareas.some((tarea) => tarea.id === "stand"), true);
  assert.equal(sinNota.tareas.some((tarea) => "nota" in tarea || "veredicto" in tarea || "etapa" in tarea), false);

  await almacen.guardarVeredicto({ ...guardado, origen: "error", score: "40", frase: "SECRETO-LAYA", choice: "tiempo" });
  const fallo = await listarTareasHttp(almacen, { usuarioId: "voluntario-1", demo: false }, "mias");
  const trasFallo = (await fallo.json()) as { tareas: Registro[] };
  assert.equal(trasFallo.tareas.find((tarea) => tarea.id === "stand")?.nota, null);
  assert.equal(trasFallo.tareas.find((tarea) => tarea.id === "stand")?.veredicto, null);
  assert.equal(JSON.stringify(trasFallo).includes("SECRETO-LAYA"), false);
  assert.equal(JSON.stringify(trasFallo).includes("tiempo"), false);
});

test("GET alcance=mias entrega la nota al voluntario de la sesión", async () => {
  const almacen = crearMemoria();
  const anterior = usar(almacen);
  try {
    await asegurarSemilla(almacen);
    await almacen.crearSesion({
      token: "v1",
      email: "voluntario1@demo.hyto",
      usuarioId: "voluntario-1",
      rol: "voluntario",
      expiraEn: new Date(Date.now() + 60_000).toISOString(),
      wallet: "",
    });
    const respuesta = await tareasGet(new Request("http://local/api/tareas?alcance=mias", { headers: { cookie: "hyto_sesion=v1" } }));
    assert.equal(respuesta.status, 200);
    const cuerpo = (await respuesta.json()) as { tareas: Registro[] };
    const stand = cuerpo.tareas.find((tarea) => tarea.id === "stand");
    assert.equal(stand?.nota, 100);
    assert.equal(stand?.veredicto, "cumplió");
    assert.equal(JSON.stringify(cuerpo).includes("Table set up"), false);
  } finally {
    restaurar(anterior);
  }
});

type Registro = {
  id: string;
  nota?: number | null;
  veredicto?: string | null;
  hashPago?: string | null;
  contratoEscrow?: string | null;
  origen?: string;
  etapa?: string | null;
  enviadaEn?: string | null;
};

function fila(parcial: Partial<VeredictoFila> & Pick<VeredictoFila, "origen" | "score">): VeredictoFila {
  return {
    id: "v",
    evidenciaId: "e",
    tareaId: "t",
    veredicto: "parcial",
    frase: "interna",
    textoScout: "interna",
    choice: "stand",
    noul: "no",
    ...parcial,
  };
}

type Gancho = () => Promise<import("../db/almacen").Almacen | null>;

function usar(almacen: import("../db/almacen").Almacen): Gancho | undefined {
  const tabla = globalThis as typeof globalThis & { __HYTO_ALMACEN_PRUEBA?: Gancho };
  const anterior = tabla.__HYTO_ALMACEN_PRUEBA;
  tabla.__HYTO_ALMACEN_PRUEBA = async () => almacen;
  return anterior;
}

function restaurar(anterior: Gancho | undefined): void {
  const tabla = globalThis as typeof globalThis & { __HYTO_ALMACEN_PRUEBA?: Gancho };
  tabla.__HYTO_ALMACEN_PRUEBA = anterior;
}
