"use client";

import Link from "next/link";
import { useDiscurso } from "@/components/ui/Idioma";

/** Footer links. tryhyto.com source is not in this repo; legal drafts live in hyto#282. */
export function PieLanding() {
  const copia = useDiscurso();
  return (
    <footer className="hyto-landing-pie">
      <div className="hyto-landing-band-inner">
        <nav className="hyto-landing-pie-nav" aria-label={copia.navMenu}>
          <Link href="/#como-funciona">{copia.pieComo}</Link>
          <Link href="/faq">{copia.pieFaq}</Link>
          <Link href="/#contacto">{copia.pieContacto}</Link>
          <Link href="/privacy">{copia.piePrivacidad}</Link>
          <a href="https://tryhyto.com/terms.html" rel="noopener noreferrer">
            Terms
          </a>
          <a href="https://tryhyto.com/cookies.html" rel="noopener noreferrer">
            Cookies
          </a>
          <a href="https://tryhyto.com/refunds.html" rel="noopener noreferrer">
            Refunds
          </a>
          <Link href="/?signin=1">{copia.pieApp}</Link>
          <a href="https://tryhyto.com/" rel="noopener noreferrer">
            {copia.pieTryhyto}
          </a>
        </nav>
      </div>
    </footer>
  );
}
