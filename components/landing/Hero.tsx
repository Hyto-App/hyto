"use client";

import { Entrar } from "@/components/admin/Entrar";
import { AnilloHitos, Eslogan, Logo, Tema } from "@/components/ui/Marca";

export function Hero({ demoHabilitado }: { demoHabilitado: boolean }) {
  return (
    <section className="hyto-landing-hero">
      <header className="hyto-landing-head">
        <Logo className="hyto-landing-logo" />
        <Tema />
      </header>
      <div className="hyto-landing-copy">
        <Eslogan como="h1" />
        <p className="hyto-landing-sub">Do small tasks for real events. Send a photo. Get paid in digital dollars (USDC).</p>
        <p className="hyto-landing-lead">A marketplace of small tasks. No crypto experience needed.</p>
        <div className="hyto-landing-cta">
          <Entrar demoHabilitado={demoHabilitado} />
        </div>
      </div>
      <AnilloHitos />
      <p className="hyto-landing-legal">Sign-in by Cavos. Your account is created for you.</p>
    </section>
  );
}
