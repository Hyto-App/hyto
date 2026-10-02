import type { RespuestasFactura, RespuestasTrabajo } from "./laya";
import { etiquetasDe, type EtiquetaNota } from "./razones";
import { escribirSnapshot, type DetalleRazones } from "./snapshot-razones";

function trabajoPerfecto(): RespuestasTrabajo {
  return {
    lugar: "stand_o_mesa",
    v1: "es_lo_pedido",
    v2: 2,
    v3: true,
    v4: false,
    t5: "armar_o_montar",
    t6: "terminado",
    t7: true,
    t8: true,
    t9: false,
    t10: 2,
  };
}

function trabajoRegistro(): RespuestasTrabajo {
  return {
    lugar: "stand_o_mesa",
    v1: "es_lo_pedido",
    v2: 1,
    v3: true,
    v4: true,
    t5: "armar_o_montar",
    t6: "a_medias",
    t7: false,
    t8: true,
    t9: true,
    t10: 1,
  };
}

function facturaPerfecta(): RespuestasFactura {
  return {
    f1: "coincide_con_lo_pedido",
    f2: true,
    f3: true,
    f4: 2,
    g1: "comida_o_bebida",
    g2: true,
    g3: true,
    g4: true,
    g5: 2,
  };
}

export function detalleEjemplo(id: string): DetalleRazones | null {
  if (id === "stand") return { clase: "trabajo", trabajo: trabajoPerfecto(), factura: null, cerca: [] };
  if (id === "registro") return { clase: "trabajo", trabajo: trabajoRegistro(), factura: null, cerca: [] };
  if (id === "comida") return { clase: "factura", trabajo: null, factura: facturaPerfecta(), cerca: [] };
  return null;
}

export function etiquetasEjemplo(id: string): EtiquetaNota[] {
  const detalle = detalleEjemplo(id);
  if (!detalle) return [];
  if (id === "comida") {
    return etiquetasDe({
      ...detalle,
      descripcion: "Team meal receipt, with the amount and date visible.",
      monto: "12.40",
      fecha: "2026-09-27",
      tope: "15",
    });
  }
  if (id === "registro") {
    return etiquetasDe({
      ...detalle,
      descripcion: "The list is incomplete: a few signatures show, and the back of the room is out of frame.",
      monto: null,
      fecha: null,
      tope: null,
    });
  }
  return etiquetasDe({
    ...detalle,
    descripcion: "Table set up, ZEEK banner facing forward, and the room is visible.",
    monto: null,
    fecha: null,
    tope: null,
  });
}

export function snapshotEjemplo(id: string): string | null {
  const detalle = detalleEjemplo(id);
  return detalle ? escribirSnapshot(detalle) : null;
}
