"use client";

import { CasoReal } from "@/components/landing/CasoReal";
import { Cierre } from "@/components/landing/Cierre";
import { Contacto } from "@/components/landing/Contacto";
import { CtaFijo } from "@/components/landing/CtaFijo";
import { Equipo } from "@/components/landing/Equipo";
import { Hero } from "@/components/landing/Hero";
import { Pasos } from "@/components/landing/Pasos";
import { PieLanding } from "@/components/landing/Pie";
import { Preguntas } from "@/components/landing/Preguntas";
import { Roles } from "@/components/landing/Roles";

/** Signed-out marketing landing. No invented reviews. */
export function Landing({ demoHabilitado = false }: { demoHabilitado?: boolean }) {
  return (
    <>
      <main className="hyto-landing">
        <Hero demoHabilitado={demoHabilitado} />
        <Pasos />
        <Roles />
        <CasoReal />
        <Equipo />
        <Preguntas />
        <Contacto />
        <Cierre />
        <PieLanding />
      </main>
      <CtaFijo />
    </>
  );
}
