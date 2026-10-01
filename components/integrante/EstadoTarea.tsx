import type { EstadoTarea } from "@/lib/integrante/tipos";
import { etiquetaEstado } from "@/lib/ui/etiquetas";

const CLASE: Record<EstadoTarea, string> = {
  pendiente: "hyto-pill-muted",
  "en revisión": "hyto-pill-mid",
  pagado: "hyto-pill-ok",
};

export function PastillaEstado({ estado }: { estado: EstadoTarea }) {
  return (
    <span className={`hyto-pill ${CLASE[estado]}`}>
      <i className="hyto-dot" aria-hidden="true" />
      {etiquetaEstado(estado)}
    </span>
  );
}
