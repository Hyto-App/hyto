"use client";

import { useIdioma } from "@/components/ui/Idioma";
import { presentarEtiqueta } from "@/lib/revision/notas-idioma";
import type { EtiquetaNota, SeveridadNota } from "@/lib/revision/razones";

const CLASE: Record<SeveridadNota, string> = {
  problem: "hyto-pill-bad",
  warning: "hyto-pill-mid",
  good: "hyto-pill-ok",
};

/** Mile's flags as boxes in two equal columns (one on a phone). Each text shows once. */
export function NotasMileRejilla({ etiquetas }: { etiquetas?: readonly EtiquetaNota[] | null }) {
  const idioma = useIdioma();
  if (!etiquetas || etiquetas.length === 0) return null;
  const vistos = new Set<string>();
  const visibles = etiquetas
    .map((etiqueta) => presentarEtiqueta(etiqueta, idioma))
    .filter((etiqueta) => {
      if (vistos.has(etiqueta.texto)) return false;
      vistos.add(etiqueta.texto);
      return true;
    });
  return (
    <ul className="hyto-resumen-notas">
      {visibles.map((etiqueta) => (
        <li key={etiqueta.id} className="hyto-resumen-caja">
          <span className={`hyto-pill text-xs ${CLASE[etiqueta.severidad]}`}>{etiqueta.texto}</span>
          <p>{etiqueta.explicacion}</p>
        </li>
      ))}
    </ul>
  );
}
