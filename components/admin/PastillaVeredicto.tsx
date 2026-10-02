import type { Veredicto } from "@/lib/admin/tipos";
import { etiquetaVeredicto } from "@/lib/ui/etiquetas";

const CLASE: Record<Veredicto, string> = {
  cumplió: "hyto-pill-ok",
  parcial: "hyto-pill-mid",
  insuficiente: "hyto-pill-bad",
};

export function PastillaVeredicto({ veredicto, nota = null }: { veredicto: Veredicto; nota?: number | null }) {
  const banda = etiquetaVeredicto(veredicto);
  const porcentaje = typeof nota === "number" ? `${nota}%` : null;
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`hyto-pill ${CLASE[veredicto]}`} title={porcentaje ? banda : undefined}>
        <i className="hyto-dot" aria-hidden="true" />
        {porcentaje ?? banda}
      </span>
      {porcentaje ? <span className={`text-sm ${CLASE[veredicto]}`}>{banda}</span> : null}
    </span>
  );
}
