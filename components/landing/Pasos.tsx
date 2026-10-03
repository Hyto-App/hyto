"use client";

import { useDiscurso } from "@/components/ui/Idioma";
import { pasosDiscurso } from "@/lib/ui/discurso";

export function Pasos() {
  const copia = useDiscurso();
  return (
    <section className="hyto-landing-band" aria-labelledby="hyto-pasos-title">
      <div className="hyto-landing-band-inner">
        <h2 id="hyto-pasos-title" className="hyto-landing-h">
          {copia.stepsTitle}
        </h2>
        <ol className="hyto-landing-steps">
          {pasosDiscurso(copia).map((paso, indice) => (
            <li key={paso.titulo} className="hyto-step-card">
              <span className="hyto-step-num" aria-hidden="true">
                {indice + 1}
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
