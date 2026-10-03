"use client";

import { useDiscurso } from "@/components/ui/Idioma";

export function Mile() {
  const copia = useDiscurso();
  return (
    <section className="hyto-landing-band" aria-labelledby="hyto-mile-title">
      <div className="hyto-landing-band-inner">
        <article className="hyto-mile-card">
          <p className="hyto-landing-kicker">{copia.mileKicker}</p>
          <h2 id="hyto-mile-title">{copia.trustAiTitle}</h2>
          <p>{copia.trustAiBody}</p>
        </article>
      </div>
    </section>
  );
}
