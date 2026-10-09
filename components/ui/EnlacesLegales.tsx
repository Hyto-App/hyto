"use client";

import Link from "next/link";
import { useTexto } from "@/components/ui/Idioma";
import type { Clave } from "@/lib/ui/diccionario";

const RUTAS: readonly { href: string; clave: Clave }[] = [
  { href: "/privacy", clave: "nav.privacy" },
  { href: "/terms", clave: "nav.terms" },
  { href: "/cookies", clave: "nav.cookies" },
  { href: "/refunds", clave: "nav.refunds" },
];

/** Privacy, terms, cookies, and refunds. One privacy page, linked from the app and the landing. */
export function EnlacesLegales({ className = "", enlaceClass = "" }: { className?: string; enlaceClass?: string }) {
  const t = useTexto();
  return (
    <nav className={`hyto-legal-nav ${className}`.trim()} aria-label={t("legal.nav")}>
      {RUTAS.map((ruta) => (
        <Link key={ruta.href} href={ruta.href} className={enlaceClass || undefined}>
          {t(ruta.clave)}
        </Link>
      ))}
    </nav>
  );
}
