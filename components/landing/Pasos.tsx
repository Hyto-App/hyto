"use client";

import { useDiscurso } from "@/components/ui/Idioma";
import { pasosDiscurso } from "@/lib/ui/discurso";

export function Pasos() {
  const copia = useDiscurso();
  return (
    <section className="hyto-landing-band" id="como-funciona" aria-labelledby="hyto-pasos-title">
      <div className="hyto-landing-band-inner">
        <p className="hyto-landing-kicker">{copia.navComo}</p>
        <h2 id="hyto-pasos-title" className="hyto-landing-h">
          {copia.stepsTitle}
        </h2>
        <ol className="hyto-landing-steps">
          {pasosDiscurso(copia).map((paso, i) => (
            <li key={paso.titulo} className="hyto-step-card">
              <span className="hyto-step-num" aria-hidden="true">
                {i + 1}
              </span>
              <h3>{paso.titulo}</h3>
              <p>{paso.cuerpo}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
