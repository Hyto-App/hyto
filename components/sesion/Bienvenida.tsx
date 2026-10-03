"use client";

import { PrepararUsdc } from "@/components/sesion/PrepararUsdc";
import { useModoDemo } from "@/components/sesion/InsigniaDemo";
import { leerEstadoUsdc, prepararUsdcDeSesion, type UsdcListo } from "@/lib/integrante/prepararUsdc";

type Props = {
  consultar?: () => Promise<boolean>;
  preparar?: () => Promise<UsdcListo>;
};

export function Bienvenida({ consultar = leerEstadoUsdc, preparar = () => prepararUsdcDeSesion() }: Props) {
  const demo = useModoDemo();

  return (
    <section className="hyto-welcome" aria-labelledby="hyto-welcome-title">
      <article className="hyto-card hyto-welcome-card">
        <p className="hyto-welcome-kicker">Welcome</p>
        <p id="hyto-welcome-title" className="hyto-title">
          You&apos;re in.
        </p>
        <p className="hyto-sub">
          Hyto is a marketplace of small tasks. Do the work, send a photo, and get paid in digital dollars (USDC).
        </p>
        {demo ? (
          <p className="hyto-welcome-note" role="note">
            Demo mode can&apos;t set up payouts. Sign in with your email to continue.
          </p>
        ) : (
          <div className="hyto-welcome-step">
            <p className="hyto-welcome-step-title">Take your first step</p>
            <PrepararUsdc consultar={consultar} preparar={preparar} />
          </div>
        )}
      </article>
    </section>
  );
}
