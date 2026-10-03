"use client";

import { PrepararUsdc } from "@/components/sesion/PrepararUsdc";
import { useModoDemo } from "@/components/sesion/InsigniaDemo";
import { useTexto } from "@/components/ui/Idioma";
import { leerEstadoUsdc, prepararUsdcDeSesion, type UsdcListo } from "@/lib/integrante/prepararUsdc";

type Props = {
  consultar?: () => Promise<boolean>;
  preparar?: () => Promise<UsdcListo>;
};

export function Bienvenida({ consultar = leerEstadoUsdc, preparar = () => prepararUsdcDeSesion() }: Props) {
  const demo = useModoDemo();
  const t = useTexto();

  return (
    <section className="hyto-welcome" aria-labelledby="hyto-welcome-title">
      <article className="hyto-card hyto-welcome-card">
        <p className="hyto-welcome-kicker">{t("bienvenida.kicker")}</p>
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
