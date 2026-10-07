"use client";

import { useIdioma } from "@/components/ui/Idioma";
import { presentarEtiqueta } from "@/lib/revision/notas-idioma";
import { motivoPrincipal, type EtiquetaNota, type SeveridadNota } from "@/lib/revision/razones";

const CLASE: Record<SeveridadNota, string> = {
  problem: "hyto-pill-bad",
  warning: "hyto-pill-mid",
  good: "hyto-pill-ok",
};

export function EtiquetasNota({
  etiquetas,
  compacto = false,
}: {
  etiquetas?: readonly EtiquetaNota[] | null;
  compacto?: boolean;
}) {
  const idioma = useIdioma();
  if (!etiquetas || etiquetas.length === 0) return null;
  const visibles = (compacto ? etiquetas.filter((etiqueta) => etiqueta.severidad !== "good") : etiquetas).map((etiqueta) =>
    presentarEtiqueta(etiqueta, idioma),
  );
  if (visibles.length === 0) return null;
  if (compacto) {
    return (
      <span className="mt-2 flex flex-wrap gap-1">
        {visibles.map((etiqueta) => (
          <span key={etiqueta.id} className={`hyto-pill text-xs ${CLASE[etiqueta.severidad]}`} title={etiqueta.explicacion}>
            {etiqueta.texto}
          </span>
        ))}
      </span>
    );
  }
  return (
    <ul className="mt-3 space-y-2">
      {visibles.map((etiqueta) => (
        <li key={etiqueta.id}>
          <span className={`hyto-pill text-xs ${CLASE[etiqueta.severidad]}`}>{etiqueta.texto}</span>
          <p className="mt-1 text-sm leading-6 text-[var(--suave)]">{etiqueta.explicacion}</p>
        </li>
      ))}
    </ul>
  );
}

/** The main reason, written next to the percentage. */
export function MotivoNota({ etiquetas }: { etiquetas?: readonly EtiquetaNota[] | null }) {
  const idioma = useIdioma();
  const motivo = motivoPrincipal(etiquetas);
  if (!motivo) return null;
  const visible = presentarEtiqueta(motivo, idioma);
  return (
    <span className="text-sm font-medium" title={visible.explicacion} data-motivo={visible.id}>
      {visible.texto}
    </span>
  );
}
