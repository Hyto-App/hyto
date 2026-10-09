"use client";

import Link from "next/link";
import { useDiscurso } from "@/components/ui/Idioma";

export function Cierre() {
  const copia = useDiscurso();
  return (
    <section className="hyto-landing-band hyto-landing-end" aria-labelledby="hyto-cierre-title">
      <div className="hyto-landing-band-inner">
        <article className="hyto-landing-close">
          <p className="hyto-landing-kicker">{copia.closeKicker}</p>
          <h2 id="hyto-cierre-title">{copia.closeTitle}</h2>
          <div className="hyto-landing-cta">
            <Link href="/?signin=1" className="hyto-btn">
              {copia.ctaCuenta}
            </Link>
          </div>
        </article>
      </div>
    </section>
  );
}
