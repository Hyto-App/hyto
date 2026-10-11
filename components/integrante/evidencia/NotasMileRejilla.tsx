"use client";

import { useIdioma } from "@/components/ui/Idioma";
import { presentarEtiqueta } from "@/lib/revision/notas-idioma";
import type { EtiquetaNota, SeveridadNota } from "@/lib/revision/razones";

const CLASE: Record<SeveridadNota, string> = {
  problem: "hyto-pill-bad",
  warning: "hyto-pill-mid",
  good: "hyto-pill-ok",
};

/** A "Falta: …" list is shown once, in the card's orange strip, not again inside the flag box. */
const LISTA_FALTA = /^(Falta|Missing|No se pudo confirmar|Not confirmed): /;

/** Mile's flags as boxes in two equal columns (one on a phone). Each text shows once. */
export function NotasMileRejilla({ etiquetas, condicion = null }: { etiquetas?: readonly EtiquetaNota[] | null; condicion?: string | null }) {
  const idioma = useIdioma();
  if (!etiquetas || etiquetas.length === 0) return null;
  const vistos = new Set<string>();
  const visibles = etiquetas
    .map((etiqueta) => presentarEtiqueta(etiqueta, idioma, condicion))
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
          {LISTA_FALTA.test(etiqueta.explicacion) ? null : <p>{etiqueta.explicacion}</p>}
        </li>
      ))}
    </ul>
  );
}
