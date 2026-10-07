"use client";

import { useIdioma, useTexto } from "@/components/ui/Idioma";
import { puntosDeCondicion } from "@/lib/integrante/puntos";
import { textoVisible } from "@/lib/ui/etiquetas";

/**
 * "Your photo must show": numbered points.
 * `fallidos` marks the organizer's send-back (spec §7.3). Empty or omitted stays neutral.
 */
export function Checklist({
  condicion,
  revisando = false,
  fallidos = null,
  titulo,
}: {
  condicion: string;
  revisando?: boolean;
  fallidos?: number[] | null;
  titulo?: string;
}) {
  const t = useTexto();
  const idioma = useIdioma();
  const puntos = puntosDeCondicion(condicion);
  if (puntos.length === 0) return null;
  const marcado = fallidos !== null && fallidos.length > 0;
  return (
    <section className="hyto-tarjeta hyto-checklist" aria-labelledby="hyto-checklist-titulo">
      <h2 id="hyto-checklist-titulo">{titulo ?? t("evidencia.mustShow")}</h2>
      <ol>
        {puntos.map((punto, indice) => {
          const falla = marcado && fallidos.includes(indice);
          const pasa = marcado && !falla;
          return (
            <li key={`${indice}-${punto}`} className={falla ? "hyto-punto-fila-falla" : undefined}>
              {revisando ? (
                <i className="hyto-punto-espera" aria-hidden="true" />
              ) : (
                <span className={`hyto-punto-num${falla ? " hyto-punto-falla" : ""}${pasa ? " hyto-punto-ok" : ""}`} aria-hidden="true">
                  {falla ? "✗" : pasa ? "✓" : indice + 1}
                </span>
              )}
              <span>
                {textoVisible(punto, idioma)}
                {falla ? <small className="hyto-punto-motivo">{t("evidencia.notInPhoto")}</small> : null}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
