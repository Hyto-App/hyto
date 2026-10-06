"use client";

import type { ReactNode } from "react";
import { PrepararUsdc } from "@/components/sesion/PrepararUsdc";
import { useModoDemo } from "@/components/sesion/InsigniaDemo";
import { useTexto } from "@/components/ui/Idioma";
import { leerEstadoUsdc, prepararUsdcDeSesion, type UsdcListo } from "@/lib/integrante/prepararUsdc";

type Props = {
  consultar?: () => Promise<boolean>;
  preparar?: () => Promise<UsdcListo>;
  /** Optional control shown inside the card, on the kicker row (the "Hide" button on Events). */
  accion?: ReactNode;
};

export function Bienvenida({ consultar = leerEstadoUsdc, preparar = () => prepararUsdcDeSesion(), accion }: Props) {
  const demo = useModoDemo();
  const t = useTexto();

  return (
    <section className="hyto-welcome" aria-labelledby="hyto-welcome-title">
      <article className="hyto-card hyto-welcome-card">
        <div className="hyto-welcome-cabeza">
          <p className="hyto-welcome-kicker">{t("bienvenida.kicker")}</p>
          {accion ? <div className="hyto-welcome-ocultar">{accion}</div> : null}
        </div>
        <p id="hyto-welcome-title" className="hyto-title">
          {t("bienvenida.title")}
        </p>
        <p className="hyto-sub">{t("bienvenida.body")}</p>
        {demo ? (
          <p className="hyto-welcome-note" role="note">
            {t("errores.demoCobro")}
          </p>
        ) : (
          <div className="hyto-welcome-step">
            <p className="hyto-welcome-step-title">{t("bienvenida.step")}</p>
            <PrepararUsdc consultar={consultar} preparar={preparar} />
          </div>
        )}
      </article>
    </section>
  );
}
