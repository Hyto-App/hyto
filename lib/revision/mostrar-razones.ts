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
  });
}
