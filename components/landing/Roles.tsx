"use client";

import { useDiscurso } from "@/components/ui/Idioma";
import { audienciasDiscurso, confianzaDiscurso } from "@/lib/ui/discurso";

export function Roles() {
  const copia = useDiscurso();
  return (
    <>
      <section className="hyto-landing-band" aria-labelledby="hyto-roles-title">
        <div className="hyto-landing-band-inner">
          <p className="hyto-landing-kicker">{copia.audienceTitle}</p>
          <h2 id="hyto-roles-title" className="hyto-landing-h">
            {copia.audienceTitle}
          </h2>
          <ul className="hyto-landing-roles">
            {audienciasDiscurso(copia).map((rol) => (
              <li key={rol.titulo} className="hyto-role-card">
                <h3>{rol.titulo}</h3>
                <p>{rol.cuerpo}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <section className="hyto-landing-band" aria-labelledby="hyto-trust-title">
        <div className="hyto-landing-band-inner">
          <p className="hyto-landing-kicker">{copia.mileKicker}</p>
          <h2 id="hyto-trust-title" className="hyto-landing-h">
            {copia.trustTitle}
          </h2>
          <ul className="hyto-landing-roles">
            {confianzaDiscurso(copia).map((item) => (
              <li key={item.titulo} className="hyto-mile-card">
                <h3>{item.titulo}</h3>
                <p>{item.cuerpo}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
