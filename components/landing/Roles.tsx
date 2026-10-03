"use client";

import { useDiscurso } from "@/components/ui/Idioma";
import { audienciasDiscurso } from "@/lib/ui/discurso";

export function Roles() {
  const copia = useDiscurso();
  return (
    <section className="hyto-landing-band" aria-labelledby="hyto-roles-title">
      <div className="hyto-landing-band-inner">
        <h2 id="hyto-roles-title" className="hyto-landing-h">
          {copia.audienceTitle}
        </h2>
        <div className="hyto-landing-roles">
          {audienciasDiscurso(copia).map((bloque) => (
            <article key={bloque.titulo} className="hyto-role-card">
              <h3>{bloque.titulo}</h3>
              <p>{bloque.cuerpo}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
