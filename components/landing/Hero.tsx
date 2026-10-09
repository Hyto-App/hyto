"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Entrar } from "@/components/admin/Entrar";
import { NavLanding } from "@/components/landing/Nav";
import { AnilloHitos } from "@/components/ui/Marca";
import { useDiscurso } from "@/components/ui/Idioma";
import { leerRetoCorreo } from "@/lib/auth/retoCorreo";

export function Hero({ demoHabilitado }: { demoHabilitado: boolean }) {
  const copia = useDiscurso();
  return (
    <section className="hyto-landing-hero" id="top" aria-labelledby="hyto-hero-title">
      <NavLanding />
      <div className="hyto-landing-copy">
        <h1 id="hyto-hero-title" className="hyto-eslogan">
          {copia.sloganLead} <em>{copia.sloganPay}</em>
        </h1>
        <p className="hyto-landing-pitch">{copia.subheadline}</p>
        <p className="hyto-landing-note">
          <strong>{copia.networkLead} </strong>
          {copia.networkBody}
        </p>
        <div className="hyto-landing-cta hyto-landing-cta-hero">
          <Link href="/?signin=1" className="hyto-btn hyto-landing-cta-principal">
            {copia.ctaCuenta}
          </Link>
          {demoHabilitado ? (
            <p className="hyto-landing-lead">{copia.ctaDemoHelp}</p>
          ) : null}
        </div>
      </div>
      <AnilloHitos />
      <p className="hyto-landing-legal">{copia.legal}</p>
      <EntrarSiHaceFalta demoHabilitado={demoHabilitado} />
    </section>
  );
}

/** Mounts the sign-in layer only when the URL or a pending email challenge needs it. */
function EntrarSiHaceFalta({ demoHabilitado }: { demoHabilitado: boolean }) {
  const [abrir, setAbrir] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const necesita =
      params.get("signin") === "1" ||
      Boolean(params.get("cavos_auth_code")) ||
      Boolean(leerRetoCorreo());
    setAbrir(necesita);
  }, []);

  if (!abrir) return null;
  return <Entrar abrirLogin demoHabilitado={demoHabilitado} atiendeUrl tituloDocumento />;
}
