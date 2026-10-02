import type { RespuestasFactura, RespuestasTrabajo } from "./laya";

export const MARCA_RAZONES = "\n@@hyto-razones@@\n";

export type ClaseSnapshot = "trabajo" | "factura" | "otra";

export type DetalleRazones = {
  clase: ClaseSnapshot;
  trabajo: RespuestasTrabajo | null;
  factura: RespuestasFactura | null;
  cerca: string[];
};

const LUGAR = ["pared_o_superficie", "stand_o_mesa", "espacio_abierto", "no_claro"] as const;
const V1 = ["es_lo_pedido", "es_otra_cosa", "no_se_puede_saber"] as const;
const T5 = ["pintar", "limpiar", "armar_o_montar", "vender_o_atender", "transportar", "otra_o_no_claro"] as const;
const T6 = ["terminado", "a_medias", "sin_empezar", "no_claro"] as const;
const F1 = ["coincide_con_lo_pedido", "otro_gasto", "no_se_ve"] as const;
const G1 = ["transporte", "comida_o_bebida", "materiales", "impresion_o_papeleria", "otro_o_no_claro"] as const;
const IDS_CERCA = new Set([
  "c1",
  "lugar",
  "v1",
  "v2",
  "v3",
  "v4",
  "t5",
  "t6",
  "t7",
  "t8",
  "t9",
  "t10",
  "f1",
  "f2",
  "f3",
  "f4",
  "g1",
  "g2",
  "g3",
  "g4",
  "g5",
]);

export function escribirSnapshot(detalle: DetalleRazones): string {
  const partes = [`c=${detalle.clase}`];
  if (detalle.clase === "trabajo" && detalle.trabajo) {
    const t = detalle.trabajo;
    partes.push(
      `lugar=${t.lugar}`,
      `v1=${t.v1}`,
      `v2=${t.v2}`,
      `v3=${bit(t.v3)}`,
      `v4=${bit(t.v4)}`,
      `t5=${t.t5}`,
      `t6=${t.t6}`,
      `t7=${bit(t.t7)}`,
      `t8=${bit(t.t8)}`,
      `t9=${bit(t.t9)}`,
      `t10=${t.t10}`,
    );
  }
  if (detalle.clase === "factura" && detalle.factura) {
    const f = detalle.factura;
    partes.push(
      `f1=${f.f1}`,
      `f2=${bit(f.f2)}`,
      `f3=${bit(f.f3)}`,
      `f4=${f.f4}`,
      `g1=${f.g1}`,
      `g2=${bit(f.g2)}`,
      `g3=${bit(f.g3)}`,
      `g4=${bit(f.g4)}`,
      `g5=${f.g5}`,
    );
  }
  const cerca = detalle.cerca.filter((id, indice) => IDS_CERCA.has(id) && detalle.cerca.indexOf(id) === indice);
  if (cerca.length > 0) partes.push(`cerca=${cerca.join(",")}`);
  return partes.join("&");
}

export function separarDescripcion(texto: string): { texto: string; detalle: DetalleRazones | null } {
  const corte = texto.indexOf(MARCA_RAZONES);
  if (corte < 0) return { texto, detalle: null };
  return {
    texto: texto.slice(0, corte),
    detalle: leerSnapshot(texto.slice(corte + MARCA_RAZONES.length)),
  };
}

export function unirDescripcion(texto: string, detalle: string | null | undefined): string {
  const base = separarDescripcion(texto).texto;
  if (!detalle) return base;
  return `${base}${MARCA_RAZONES}${detalle}`;
}

export function leerSnapshot(crudo: string): DetalleRazones | null {
  const linea = crudo.split("\n")[0]?.trim() ?? "";
  if (!linea) return null;
  const mapa = new Map<string, string>();
  for (const parte of linea.split("&")) {
    const igual = parte.indexOf("=");
    if (igual <= 0) return null;
    mapa.set(parte.slice(0, igual), decodeURIComponent(parte.slice(igual + 1)));
  }
  const clase = mapa.get("c");
  if (clase !== "trabajo" && clase !== "factura" && clase !== "otra") return null;
  const cerca = (mapa.get("cerca") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter((id) => IDS_CERCA.has(id));
  if (clase === "otra") return { clase, trabajo: null, factura: null, cerca };
  if (clase === "trabajo") {
    const trabajo = leerTrabajo(mapa);
    if (!trabajo) return null;
    return { clase, trabajo, factura: null, cerca };
  }
  const factura = leerFactura(mapa);
  if (!factura) return null;
  return { clase, trabajo: null, factura, cerca };
}

function leerTrabajo(mapa: Map<string, string>): RespuestasTrabajo | null {
  const lugar = uno(mapa.get("lugar"), LUGAR);
  const v1 = uno(mapa.get("v1"), V1);
  const v2 = nivel(mapa.get("v2"));
  const v3 = siNo(mapa.get("v3"));
  const v4 = siNo(mapa.get("v4"));
  const t5 = uno(mapa.get("t5"), T5);
  const t6 = uno(mapa.get("t6"), T6);
  const t7 = siNo(mapa.get("t7"));
  const t8 = siNo(mapa.get("t8"));
  const t9 = siNo(mapa.get("t9"));
  const t10 = nivel(mapa.get("t10"));
  if (!lugar || !v1 || v2 === null || v3 === null || v4 === null || !t5 || !t6 || t7 === null || t8 === null || t9 === null || t10 === null) {
    return null;
  }
  return { lugar, v1, v2, v3, v4, t5, t6, t7, t8, t9, t10 };
}

function leerFactura(mapa: Map<string, string>): RespuestasFactura | null {
  const f1 = uno(mapa.get("f1"), F1);
  const f2 = siNo(mapa.get("f2"));
  const f3 = siNo(mapa.get("f3"));
  const f4 = nivel(mapa.get("f4"));
  const g1 = uno(mapa.get("g1"), G1);
  const g2 = siNo(mapa.get("g2"));
  const g3 = siNo(mapa.get("g3"));
  const g4 = siNo(mapa.get("g4"));
  const g5 = nivel(mapa.get("g5"));
  if (!f1 || f2 === null || f3 === null || f4 === null || !g1 || g2 === null || g3 === null || g4 === null || g5 === null) return null;
  return { f1, f2, f3, f4, g1, g2, g3, g4, g5 };
}

function bit(valor: boolean): "1" | "0" {
  return valor ? "1" : "0";
}

function siNo(valor: string | undefined): boolean | null {
  if (valor === "1") return true;
  if (valor === "0") return false;
  return null;
}

function nivel(valor: string | undefined): 0 | 1 | 2 | null {
  if (valor === "0" || valor === "1" || valor === "2") return Number(valor) as 0 | 1 | 2;
  return null;
}

function uno<T extends string>(valor: string | undefined, lista: readonly T[]): T | null {
  if (!valor) return null;
  return lista.includes(valor as T) ? (valor as T) : null;
}
