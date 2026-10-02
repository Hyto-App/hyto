import assert from "node:assert/strict";
import test from "node:test";
import { bandejaDe, porPersona, resumir } from "@/lib/admin/vista";
import type { TareaAdmin, VistaAdmin } from "@/lib/admin/tipos";
import {
  INTERVALO_SONDEO_MS,
  TOPE_SONDEO_MS,
  esperaSondeo,
  fusionarVista,
  leerCambios,
  leerNovedades,
  planearCambios,
  type Marca,
} from "./novedades";

test("el sondeo espera unos segundos, retrocede y se detiene si la pestaña está oculta", () => {
  assert.equal(INTERVALO_SONDEO_MS, 4000);
  assert.equal(esperaSondeo(0, false), 4000);
  assert.equal(esperaSondeo(1, false), 8000);
  assert.equal(esperaSondeo(2, false), 16000);
  assert.equal(esperaSondeo(10, false), TOPE_SONDEO_MS);
  assert.equal(esperaSondeo(0, true), null);
  assert.equal(esperaSondeo(3, true, 20), null);
  assert.equal(esperaSondeo(1, false, 20), 40);
});

test("la primera lectura no recarga lo que la pantalla ya muestra", () => {
  const marcas = [marca({ tareaId: "stand", sello: sello("a"), veredicto: "cumplió", origen: "guion" })];
  const tareas = [{ id: "stand", estado: "en revisión", veredicto: "cumplió", origen: "guion" }];
  const plan = planearCambios(new Map(), marcas, tareas, { exigirFoto: false });
  assert.deepEqual(plan.ids, []);
  assert.equal(plan.siguientes.get("stand"), sello("a"));
});

test("un veredicto nuevo y una foto nueva sí piden el detalle", () => {
  const conocida = new Map([["stand", sello("a")]]);
  const marcas = [
    marca({ tareaId: "stand", sello: sello("b"), veredicto: "insuficiente" }),
    marca({
      tareaId: "bienvenida",
      sello: sello("c"),
      estado: "en revisión",
      evidenciaId: "ev-nueva",
      veredicto: null,
      origen: null,
    }),
  ];
  const tareas = [
    { id: "stand", estado: "en revisión", veredicto: "cumplió", origen: "guion" },
    { id: "bienvenida", estado: "pendiente", veredicto: null, origen: null },
  ];
  const plan = planearCambios(conocida, marcas, tareas, { exigirFoto: false });
  assert.deepEqual(plan.ids, ["stand", "bienvenida"]);
});

test("en la revisión una foto distinta no cuenta como la que ya está abierta", () => {
  const marcas = [marca({ tareaId: "stand", evidenciaId: "ev-2", sello: sello("b") })];
  const tareas = [{ id: "stand", estado: "en revisión", veredicto: "cumplió", origen: "guion" }];
  const igual = planearCambios(new Map(), marcas, tareas, {
    exigirFoto: true,
    fotoDe: () => "/api/evidencias/ev-2/foto",
  });
  assert.deepEqual(igual.ids, []);
  const distinta = planearCambios(new Map(), marcas, tareas, {
    exigirFoto: true,
    fotoDe: () => "/api/evidencias/ev-1/foto",
  });
  assert.deepEqual(distinta.ids, ["stand"]);
});

test("fusionar deja quieta la tarea que no cambió y mete la evidencia nueva en la bandeja", () => {
  const stand = tarea({ id: "stand", veredicto: "cumplió" });
  const bienvenida = tarea({ id: "bienvenida", titulo: "Welcome table", estado: "pendiente", veredicto: null, origen: null, frase: null });
  const vista = armar([stand, bienvenida]);
  const llegada = tarea({ id: "bienvenida", titulo: "Welcome table", estado: "en revisión", veredicto: null, origen: null, frase: null });
  const fusion = fusionarVista(vista, [llegada]);
  assert.equal(fusion.tareas[0], stand);
  assert.equal(fusion.bandeja.some((item) => item.id === "bienvenida"), true);
  assert.equal(fusionarVista(vista, [stand]), vista);
});

test("el 304 no lee el cuerpo y el since viaja con el cursor", async () => {
  const vistas: { url: string; headers: Headers }[] = [];
  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    vistas.push({ url: String(input), headers: new Headers(init?.headers) });
    return new Response(null, { status: 304 });
  }) as typeof fetch;
  const igual = await leerNovedades(fetchImpl, "evt", sello("a"));
  assert.deepEqual(igual, { tipo: "igual", cursor: sello("a") });
  assert.match(vistas[0]?.url ?? "", /\/api\/eventos\/evt\/novedades\?since=/);
  assert.equal(vistas[0]?.headers.get("if-none-match"), `"${sello("a")}"`);

  const fallo = await leerNovedades((async () => new Response("no", { status: 503 })) as typeof fetch, "evt", null);
  assert.deepEqual(fallo, { tipo: "fallo", estado: 503 });
  assert.equal(leerCambios({ cursor: "no", cambios: [] }), null);
});

function sello(letra: string): string {
  return letra.repeat(32);
}

function marca(parcial: Partial<Marca> & { tareaId: string }): Marca {
  return {
    estado: "en revisión",
    evidenciaId: "ev",
    creadaEn: "2026-10-02T08:00:00.000Z",
    veredicto: "cumplió",
    origen: "guion",
    sello: sello("a"),
    ...parcial,
  };
}

function tarea(parcial: Partial<TareaAdmin> & { id: string }): TareaAdmin {
  return {
    id: parcial.id,
    titulo: parcial.titulo ?? "Set up the booth",
    tipo: "trabajo",
    monto: "20",
    tope: null,
    condicion: "",
    miembroId: "voluntario-1",
    miembro: "Volunteer 1",
    estado: parcial.estado ?? "en revisión",
    veredicto: parcial.veredicto === undefined ? "cumplió" : parcial.veredicto,
    nota: parcial.nota === undefined ? null : parcial.nota,
    frase: parcial.frase === undefined ? "Ready" : parcial.frase,
    origen: parcial.origen === undefined ? "guion" : parcial.origen,
    codigo: null,
    montoRevisado: null,
    montoConfirmado: null,
    fecha: null,
    hashPago: null,
    credencialUrl: null,
  };
}

function armar(tareas: TareaAdmin[]): VistaAdmin {
  return {
    nombre: "Feria",
    ejemplo: false,
    propio: false,
    tareas,
    bandeja: bandejaDe(tareas),
    resumen: resumir(tareas),
    personas: porPersona(tareas),
  };
}
