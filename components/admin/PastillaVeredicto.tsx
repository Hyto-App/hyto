"use client";

import type { Veredicto } from "@/lib/admin/tipos";
import { useIdioma } from "@/components/ui/Idioma";
import { etiquetaDesdeNota } from "@/lib/revision/pesos";
import { etiquetaVeredicto, textoNota } from "@/lib/ui/etiquetas";

const CLASE: Record<Veredicto, string> = {
  cumplió: "hyto-pill-ok",
  parcial: "hyto-pill-mid",
  insuficiente: "hyto-pill-bad",
};

export function PastillaVeredicto({ veredicto, nota = null }: { veredicto: Veredicto; nota?: number | null }) {
  const idioma = useIdioma();
  const banda = typeof nota === "number" ? etiquetaDesdeNota(nota) : veredicto;
  return (
    <span className={`hyto-pill ${CLASE[banda]}`}>
      <i className="hyto-dot" aria-hidden="true" />
      {textoNota(etiquetaVeredicto(banda, idioma), nota)}
    </span>
  );
}
