import type { EstadoTarea } from "@/lib/integrante/tipos";
import { etiquetaEstado } from "@/lib/ui/etiquetas";

const ESTILOS: Record<EstadoTarea, string> = {
  pendiente: "bg-[var(--pendiente-fondo)] text-[var(--pendiente-tinta)]",
  "en revisión": "bg-[var(--revision-fondo)] text-[var(--revision-tinta)]",
  pagado: "bg-[var(--pagado-fondo)] text-[var(--pagado-tinta)]",
};

export function PastillaEstado({ estado }: { estado: EstadoTarea }) {
  return (
    <span className={`inline-flex shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-sm font-medium ${ESTILOS[estado]}`}>
      {etiquetaEstado(estado)}
    </span>
  );
}
