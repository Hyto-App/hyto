import type { Veredicto } from "@/lib/admin/tipos";
import { etiquetaVeredicto } from "@/lib/ui/etiquetas";

const CLASE: Record<Veredicto, string> = {
  cumplió: "hyto-pill-ok",
  parcial: "hyto-pill-mid",
  insuficiente: "hyto-pill-bad",
};

export function PastillaVeredicto({ veredicto }: { veredicto: Veredicto }) {
  return (
    <span className={`hyto-pill ${CLASE[veredicto]}`}>
      <i className="hyto-dot" aria-hidden="true" />
      {etiquetaVeredicto(veredicto)}
    </span>
  );
}
