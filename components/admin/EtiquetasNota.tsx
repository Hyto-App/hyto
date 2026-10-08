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
  ocultarMotivo = false,
}: {
  etiquetas?: readonly EtiquetaNota[] | null;
  compacto?: boolean;
  /** Skip the reason already written next to the percentage, so a label shows once per card. */
  ocultarMotivo?: boolean;
}) {
  const idioma = useIdioma();
  if (!etiquetas || etiquetas.length === 0) return null;
  const motivo = ocultarMotivo ? motivoPrincipal(etiquetas) : null;
  const motivoClave = motivo?.texto.trim().toLowerCase() ?? null;
  const vistos = new Set<string>();
  const lista = (compacto ? etiquetas.filter((etiqueta) => etiqueta.severidad !== "good") : etiquetas).filter((etiqueta) => {
    const clave = etiqueta.texto.trim().toLowerCase();
    if (compacto && motivoClave && clave === motivoClave) return false;
    if (vistos.has(clave)) return false;
    vistos.add(clave);
    return true;
  });
  const visibles = lista.map((etiqueta) => ({
    ...presentarEtiqueta(etiqueta, idioma),
    clave: etiqueta.texto.trim().toLowerCase(),
  }));
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
      {visibles.map((etiqueta) => {
        const yaEsta = Boolean(motivoClave && etiqueta.clave === motivoClave);
        return (
          <li key={etiqueta.id}>
            {yaEsta ? null : <span className={`hyto-pill text-xs ${CLASE[etiqueta.severidad]}`}>{etiqueta.texto}</span>}
            <p className="mt-1 text-sm leading-6 text-[var(--suave)]">{etiqueta.explicacion}</p>
          </li>
        );
      })}
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
