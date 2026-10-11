"use client";

import { useIdioma, useTexto } from "@/components/ui/Idioma";
import { puntosDeCondicion } from "@/lib/integrante/puntos";
import { textoVisible } from "@/lib/ui/etiquetas";

/**
 * "Your evidence must show": numbered points.
 * `fallidos` marks the organizer's send-back (spec §7.3). Empty or omitted stays neutral.
 */
export function Checklist({
  condicion,
  revisando = false,
  fallidos = null,
  titulo,
  ancla = "hyto-checklist-titulo",
}: {
  condicion: string;
  revisando?: boolean;
  fallidos?: number[] | null;
  titulo?: string;
  ancla?: string;
}) {
  const t = useTexto();
  const idioma = useIdioma();
  // A seeded condition is stored in one language; the points show in the reader's language.
  const puntos = puntosDeCondicion(textoVisible(condicion, idioma));
  if (puntos.length === 0) return null;
  const marcado = fallidos !== null && fallidos.length > 0;
  return (
    <section className="hyto-tarjeta hyto-checklist" aria-labelledby={ancla}>
      <h2 id={ancla}>{titulo ?? t("evidencia.mustShow")}</h2>
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
                {punto}
                {falla ? <small className="hyto-punto-motivo">{t("evidencia.notInPhoto")}</small> : null}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
