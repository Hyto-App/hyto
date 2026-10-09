"use client";

import Link from "next/link";
import { useDiscurso } from "@/components/ui/Idioma";
import { preguntasDiscurso } from "@/lib/ui/discurso";

export function Preguntas({ id = "faq", enlaceCompleto = true }: { id?: string; enlaceCompleto?: boolean }) {
  const copia = useDiscurso();
  return (
    <section className="hyto-landing-band" id={id} aria-labelledby="hyto-faq-title">
      <div className="hyto-landing-band-inner">
        <p className="hyto-landing-kicker">{copia.faqKicker}</p>
        <h2 id="hyto-faq-title" className="hyto-landing-h">
          {copia.faqTitle}
        </h2>
        {enlaceCompleto ? (
          <p className="hyto-landing-intro">
            <Link href="/faq" className="hyto-link">
              {copia.navFaq}
            </Link>
            {" · "}
            <Link href="/#contacto" className="hyto-link">
              {copia.navContacto}
            </Link>
          </p>
        ) : null}
        <div className="hyto-faq-list">
          {preguntasDiscurso(copia).map((item) => (
            <details key={item.titulo} className="hyto-faq">
              <summary>{item.titulo}</summary>
              <p>{item.cuerpo}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
