"use client";

import { Entrar } from "@/components/admin/Entrar";
import { useDiscurso } from "@/components/ui/Idioma";

export function Cierre({ demoHabilitado }: { demoHabilitado: boolean }) {
  const copia = useDiscurso();
  return (
    <section className="hyto-landing-band hyto-landing-end" aria-labelledby="hyto-cierre-title">
      <div className="hyto-landing-band-inner">
        <article className="hyto-landing-close">
          <p className="hyto-landing-kicker">{copia.closeKicker}</p>
          <h2 id="hyto-cierre-title">{copia.closeTitle}</h2>
          <div className="hyto-landing-cta">
            <Entrar demoHabilitado={demoHabilitado} />
          </div>
        </article>
      </div>
    </section>
  );
}
