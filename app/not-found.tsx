"use client";

import Link from "next/link";
import { SelectorIdiomaMenu, useTexto } from "@/components/ui/Idioma";
import { Logo } from "@/components/ui/Marca";

export default function NoEncontrado() {
  const t = useTexto();
  return (
    <main className="hyto-ausente">
      <header className="hyto-ausente-top">
        <Link href="/" aria-label="Hyto">
          <Logo />
        </Link>
        <div className="hyto-idioma-marco">
          <SelectorIdiomaMenu />
        </div>
      </header>
      <div className="hyto-ausente-cuerpo">
        <h1 className="hyto-title">{t("ausente.titulo")}</h1>
        <p className="hyto-sub">{t("ausente.cuerpo")}</p>
        <Link href="/" className="hyto-btn mt-6 max-w-xs">
          {t("ausente.inicio")}
        </Link>
      </div>
    </main>
  );
}
