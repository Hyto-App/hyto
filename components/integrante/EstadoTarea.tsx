import type { EstadoTarea } from "@/lib/integrante/tipos";

const ESTILOS: Record<EstadoTarea, string> = {
  pendiente: "bg-[var(--pendiente-fondo)] text-[var(--pendiente-tinta)]",
  "en revisión": "bg-[var(--revision-fondo)] text-[var(--revision-tinta)]",
  pagado: "bg-[var(--pagado-fondo)] text-[var(--pagado-tinta)]",
};

export function PastillaEstado({ estado }: { estado: EstadoTarea }) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${ESTILOS[estado]}`}>
      {estado}
    </span>
  );
}
