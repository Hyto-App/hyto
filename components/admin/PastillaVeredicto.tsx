import type { Veredicto } from "@/lib/admin/tipos";
import { etiquetaVeredicto } from "@/lib/ui/etiquetas";

const ESTILOS: Record<Veredicto, string> = {
  cumplió: "bg-[var(--pagado-fondo)] text-[var(--pagado-tinta)]",
  parcial: "bg-[var(--pendiente-fondo)] text-[var(--pendiente-tinta)]",
  insuficiente: "bg-[var(--insuficiente-fondo)] text-[var(--insuficiente-tinta)]",
};

export function PastillaVeredicto({ veredicto }: { veredicto: Veredicto }) {
  return (
    <span className={`inline-flex shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-sm font-medium ${ESTILOS[veredicto]}`}>
      {etiquetaVeredicto(veredicto)}
    </span>
  );
}
