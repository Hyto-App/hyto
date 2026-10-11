"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useRolDemo } from "@/components/sesion/InsigniaDemo";
import { useTexto } from "@/components/ui/Idioma";

/** The one next step the card offers. Each case has a single main button. */
export type PasoBienvenida =
  | { tipo: "unirse"; puedeCrear: boolean }
  | { tipo: "abrir"; href: string; nombre: string }
  | { tipo: "demo"; href: string }
  /** The page right below already shows «Crear proyecto» and «Unirme con código», so the card only explains. */
  | { tipo: "explicar" };

type Props = {
  paso: PasoBienvenida;
  /** Optional control shown inside the card, next to the title (the "Hide" button on Events). */
  accion?: ReactNode;
};

export function Bienvenida({ paso, accion }: Props) {
  const t = useTexto();
  const demo = useRolDemo() !== null || paso.tipo === "demo";

  return (
    <section className="hyto-welcome" aria-labelledby="hyto-welcome-title">
      <article className="hyto-card hyto-welcome-card">
        <div className="hyto-welcome-cabeza">
          <div className="hyto-welcome-titulo">
            <h2 id="hyto-welcome-title" className="hyto-title">
              {t("bienvenida.title")}
            </h2>
            {/* Always visible, demo or real session: the app still runs on the test network. */}
            <span className="hyto-red-etiqueta">{t(demo ? "bienvenida.testnetDemo" : "bienvenida.testnet")}</span>
          </div>
          {accion ? <div className="hyto-welcome-ocultar">{accion}</div> : null}
        </div>
        <p className="hyto-sub">{t("bienvenida.body")}</p>
        {paso.tipo === "demo" ? (
          <p className="hyto-welcome-note" role="note">
            {t("bienvenida.demo")}
          </p>
        ) : null}
        {paso.tipo === "explicar" ? null : (
          <div className="hyto-welcome-acciones">
            {paso.tipo === "unirse" ? (
              <>
                <Link href="/join" className="hyto-btn is-inline px-5">
                  {t("bienvenida.join")}
                </Link>
                {paso.puedeCrear ? (
                  <Link href="/eventos/nuevo" className="hyto-btn-line is-inline px-5">
                    {t("bienvenida.create")}
                  </Link>
                ) : null}
              </>
            ) : paso.tipo === "abrir" ? (
              <Link href={paso.href} className="hyto-btn is-inline px-5">
                {t("bienvenida.open", { name: paso.nombre })}
              </Link>
            ) : (
              <Link href={paso.href} className="hyto-btn-line is-contorno is-inline px-5">
                {t("bienvenida.startDemo")}
              </Link>
            )}
          </div>
        )}
      </article>
    </section>
  );
}
