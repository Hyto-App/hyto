import type { LecturaVisible } from "@/lib/admin/tipos";
import type { TipoTarea } from "@/lib/integrante/tipos";
import { etiquetasDe, type EtiquetaNota } from "./razones";
import { separarDescripcion } from "./snapshot-razones";

export function etiquetasDesdeVeredicto(entrada: {
  textoScout: string | null;
  origen: string | null;
  monto: string | null;
  fecha: string | null;
  tope: string | null;
  tipo?: TipoTarea;
  condicion?: string | null;
}): EtiquetaNota[] {
  if (!entrada.textoScout || entrada.origen === "error") return [];
  const separado = separarDescripcion(entrada.textoScout);
  if (!separado.detalle) return [];
  return etiquetasDe({
    clase: separado.detalle.clase,
    trabajo: separado.detalle.trabajo,
    factura: separado.detalle.factura,
    descripcion: separado.texto,
    cerca: separado.detalle.cerca,
    monto: entrada.monto,
    fecha: entrada.fecha,
    tope: entrada.tope,
    tipo: entrada.tipo,
    lectura: separado.lectura,
    cumpleRegla: separado.detalle.cumpleRegla ?? null,
    condicion: entrada.condicion,
  });
}

/** What the receipt printed, for the organizer. Null on older reviews and on failures. */
export function lecturaDesdeVeredicto(entrada: { textoScout: string | null; origen: string | null }): LecturaVisible | null {
  if (!entrada.textoScout || entrada.origen === "error") return null;
  const lectura = separarDescripcion(entrada.textoScout).lectura;
  if (!lectura) return null;
  return {
    moneda: lectura.moneda,
    montoOriginal: lectura.montoOriginal,
    tasa: lectura.tasa,
    fechaImpresa: lectura.fechaImpresa,
    comercio: lectura.comercio,
    ...(lectura.fuenteTasa ? { fuente: lectura.fuenteTasa, fechaTasa: lectura.fechaTasa ?? null } : {}),
  };
}
