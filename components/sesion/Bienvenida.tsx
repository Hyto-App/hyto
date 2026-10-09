"use client";

import type { ReactNode } from "react";
import { PrepararUsdc } from "@/components/sesion/PrepararUsdc";
import { useModoDemo, useRolDemo } from "@/components/sesion/InsigniaDemo";
import { useTexto } from "@/components/ui/Idioma";
import { leerEstadoUsdc, prepararUsdcDeSesion, type UsdcListo } from "@/lib/integrante/prepararUsdc";

type Props = {
  consultar?: () => Promise<boolean>;
  preparar?: () => Promise<UsdcListo>;
  /** Optional control shown inside the card, on the kicker row (the "Hide" button on Events). */
  accion?: ReactNode;
  /**
   * True when this person organizes an event. Null while that is still loading.
   * Organizers do not see the volunteer payout step.
   */
  organiza?: boolean | null;
};

export function Bienvenida({
  consultar = leerEstadoUsdc,
  preparar = () => prepararUsdcDeSesion(),
  accion,
  organiza = false,
}: Props) {
  const demo = useModoDemo();
  const rolDemo = useRolDemo();
  const t = useTexto();
  const organizaVista = rolDemo === "organizador" || organiza === true;
  const cargandoRol = !demo && organiza === null;

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
        {cargandoRol ? null : <p className="hyto-sub">{t(organizaVista ? "bienvenida.bodyOrganizer" : "bienvenida.body")}</p>}
        {demo ? (
          <p className="hyto-welcome-note" role="note">
            {t(organizaVista ? "bienvenida.demoOrganizer" : "bienvenida.demoVolunteer")}
          </p>
        ) : cargandoRol || organizaVista ? null : (
          <div className="hyto-welcome-step">
            <p className="hyto-welcome-step-title">{t("bienvenida.step")}</p>
            <PrepararUsdc consultar={consultar} preparar={preparar} />
          </div>
        )}
      </article>
    </section>
  );
}
