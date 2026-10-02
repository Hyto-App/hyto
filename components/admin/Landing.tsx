"use client";

import { Entrar } from "@/components/admin/Entrar";

export function Landing({ demoHabilitado = false }: { demoHabilitado?: boolean }) {
  return (
    <main className="hyto-page mx-auto max-w-lg">
      <h1 className="hyto-title">Hyto</h1>
      <p className="hyto-sub">Events, evidence, and USDC payments on Stellar.</p>
      <div className="mt-8 max-w-xs">
        <Entrar demoHabilitado={demoHabilitado} />
      </div>
    </main>
  );
}
