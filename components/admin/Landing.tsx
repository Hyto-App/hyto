"use client";

import { Entrar } from "@/components/admin/Entrar";
import { SelectorIdioma, useTexto } from "@/components/ui/Idioma";
import { AnilloHitos, Eslogan, Logo, Tema } from "@/components/ui/Marca";

export function Landing({ demoHabilitado = false }: { demoHabilitado?: boolean }) {
  const t = useTexto();
  return (
    <main className="hyto-landing">
      <section className="hyto-landing-main">
        <header className="hyto-landing-head">
          <Logo className="hyto-landing-logo" />
          <div className="hyto-brand-acciones">
            <SelectorIdioma />
            <Tema />
          </div>
        </header>
        <div className="hyto-landing-copy">
          <Eslogan como="h1" />
          <p className="hyto-landing-sub">{t("landing.sub")}</p>
          <div className="hyto-landing-cta">
            <Entrar demoHabilitado={demoHabilitado} />
          </div>
        </div>
        <p className="hyto-landing-legal">{t("landing.legal")}</p>
      </section>
      <aside className="hyto-landing-panel" aria-label={t("landing.panel")}>
        <AnilloHitos />
        <p className="hyto-landing-panel-q">{t("landing.panelQ")}</p>
        <p className="hyto-landing-panel-s">{t("landing.panelS")}</p>
        <ul className="hyto-roles">
          <li>{t("landing.voluntarios")}</li>
          <li>{t("landing.organizadores")}</li>
          <li>{t("landing.escrow")}</li>
        </ul>
      </aside>
    </main>
  );
}
