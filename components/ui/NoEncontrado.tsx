"use client";

import Link from "next/link";
import { SelectorIdiomaMenu, useTexto } from "@/components/ui/Idioma";
import { Logo } from "@/components/ui/Marca";
import { MileAnimada } from "@/components/ui/MileAnimada";

/** Shared 404 for the landing and the app. Keeps Hyto mark, navy/lime, and Mile. */
export function NoEncontrado() {
  const t = useTexto();
  return (
    <main className="hyto-ausente">
      <div className="hyto-ausente-escena" aria-hidden="true">
        <div className="hyto-ausente-vineta" />
      </div>
      <header className="hyto-ausente-top">
        <Link href="/" aria-label="Hyto">
          <Logo />
        </Link>
        <div className="hyto-idioma-marco">
          <SelectorIdiomaMenu />
        </div>
      </header>
      <div className="hyto-ausente-cuerpo">
        <p className="hyto-ausente-codigo" aria-hidden="true">
          404
        </p>
        <h1 className="hyto-title">{t("ausente.titulo")}</h1>
        <p className="hyto-sub">{t("ausente.cuerpo")}</p>
        <div className="hyto-ausente-mile" aria-hidden="true">
          <MileAnimada estado="rechazado" tamano={140} />
        </div>
        <div className="hyto-ausente-acciones">
          <Link href="/" className="hyto-btn max-w-xs">
            {t("ausente.inicio")}
          </Link>
          <Link href="/privacy" className="hyto-ausente-enlace">
            {t("nav.privacy")}
          </Link>
        </div>
      </div>
    </main>
  );
}
