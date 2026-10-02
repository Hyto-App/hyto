"use client";

import { Entrar } from "@/components/admin/Entrar";
import { AnilloHitos, Eslogan, Logo, Tema } from "@/components/ui/Marca";

export function Landing({ demoHabilitado = false }: { demoHabilitado?: boolean }) {
  return (
    <main className="hyto-landing">
      <section className="hyto-landing-main">
        <header className="hyto-landing-head">
          <Logo className="hyto-landing-logo" />
          <Tema />
        </header>
        <div className="hyto-landing-copy">
          <Eslogan como="h1" />
          <p className="hyto-landing-sub">Do tasks for real projects, send a photo, get paid in USDC.</p>
          <div className="hyto-landing-cta">
            <Entrar demoHabilitado={demoHabilitado} />
          </div>
        </div>
        <p className="hyto-landing-legal">Sign-in by Cavos · your Stellar wallet is created for you.</p>
      </section>
      <aside className="hyto-landing-panel" aria-label="How Hyto works">
        <AnilloHitos />
        <p className="hyto-landing-panel-q">Lock the budget. Review the photo. Pay the milestone.</p>
        <p className="hyto-landing-panel-s">Organizers review and approve from one inbox. Mile, the AI reviewer, reads each photo; people decide every payment.</p>
        <ul className="hyto-roles">
          <li>Volunteers</li>
          <li>Organizers</li>
          <li>Paid via Stellar escrow</li>
        </ul>
      </aside>
    </main>
  );
}
