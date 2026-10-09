"use client";

import Link from "next/link";
import { SelectorIdiomaMenu, useDiscurso } from "@/components/ui/Idioma";
import { Logo, Tema } from "@/components/ui/Marca";

const ANCLAS = [
  { href: "/#como-funciona", clave: "navComo" as const },
  { href: "/#caso", clave: "navCaso" as const },
  { href: "/faq", clave: "navFaq" as const },
  { href: "/#equipo", clave: "navEquipo" as const },
  { href: "/#contacto", clave: "navContacto" as const },
  { href: "/privacy", clave: "navLegales" as const },
];

export function NavLanding() {
  const copia = useDiscurso();
  return (
    <header className="hyto-landing-head">
      <Link href="/" className="hyto-landing-logo" aria-label="Hyto">
        <Logo />
      </Link>
      <nav className="hyto-landing-nav" aria-label={copia.navMenu}>
        {ANCLAS.map((a) => (
          <Link key={a.href} href={a.href} className="hyto-landing-nav-link">
            {copia[a.clave]}
          </Link>
        ))}
        <Link href="/?signin=1" className="hyto-landing-nav-link is-app">
          {copia.navApp}
        </Link>
      </nav>
      <div className="hyto-landing-head-tools">
        <SelectorIdiomaMenu className="hyto-landing-idioma" />
        <Tema />
      </div>
    </header>
  );
}
