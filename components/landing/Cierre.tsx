"use client";

import { Entrar } from "@/components/admin/Entrar";

export function Cierre({ demoHabilitado }: { demoHabilitado: boolean }) {
  return (
    <section className="hyto-landing-band hyto-landing-end" aria-labelledby="hyto-cierre-title">
      <div className="hyto-landing-band-inner">
        <article className="hyto-landing-close">
          <p className="hyto-landing-kicker">Start</p>
          <h2 id="hyto-cierre-title">Ready to prove your worth?</h2>
          <p>Do a small task. Send a photo. Get paid in digital dollars (USDC).</p>
          <div className="hyto-landing-cta">
            <Entrar demoHabilitado={demoHabilitado} />
          </div>
        </article>
      </div>
    </section>
  );
}
