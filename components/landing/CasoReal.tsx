"use client";

import { useDiscurso } from "@/components/ui/Idioma";
import { enlacePagoPublico, hayPagoPublico } from "@/lib/ui/pago-publico";

/** Real practice payment only. No invented testimonials or fake hashes. */
export function CasoReal() {
  const copia = useDiscurso();
  const enlace = enlacePagoPublico();
  const listo = hayPagoPublico() && enlace;
  return (
    <section className="hyto-landing-band" id="caso" aria-labelledby="hyto-caso-title">
      <div className="hyto-landing-band-inner">
        <p className="hyto-landing-kicker">{copia.casoKicker}</p>
        <h2 id="hyto-caso-title" className="hyto-landing-h">
          {copia.casoTitle}
        </h2>
        <article className="hyto-caso-card">
          <p>{listo ? copia.casoBodyListo : copia.casoBodyPendiente}</p>
          {listo ? (
            <p>
              <a className="hyto-btn-line is-inline" href={enlace} rel="noopener noreferrer" target="_blank">
                {copia.casoEnlace}
              </a>
            </p>
          ) : null}
        </article>
      </div>
    </section>
  );
}
