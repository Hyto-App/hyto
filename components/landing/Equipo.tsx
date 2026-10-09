"use client";

import { useDiscurso, useIdioma } from "@/components/ui/Idioma";
import { EQUIPO } from "@/lib/ui/equipo";

export function Equipo() {
  const copia = useDiscurso();
  const idioma = useIdioma();
  return (
    <section className="hyto-landing-band" id="equipo" aria-labelledby="hyto-equipo-title">
      <div className="hyto-landing-band-inner">
        <p className="hyto-landing-kicker">{copia.equipoKicker}</p>
        <h2 id="hyto-equipo-title" className="hyto-landing-h">
          {copia.equipoTitle}
        </h2>
        <p className="hyto-landing-intro">{copia.equipoLead}</p>
        <ul className="hyto-equipo-lista">
          {EQUIPO.map((persona) => {
            const rol = idioma === "es" ? persona.rolEs : persona.rolEn;
            const alt = idioma === "es" ? persona.altEs : persona.altEn;
            return (
              <li key={persona.id} className="hyto-equipo-card">
                <img src={persona.foto} alt={alt} width={96} height={96} className="hyto-equipo-foto" loading="lazy" decoding="async" />
                <h3>{persona.nombre}</h3>
                <p>{rol}</p>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
