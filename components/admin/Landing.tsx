"use client";

import { Cierre } from "@/components/landing/Cierre";
import { Hero } from "@/components/landing/Hero";
import { Mile } from "@/components/landing/Mile";
import { Pasos } from "@/components/landing/Pasos";
import { Preguntas } from "@/components/landing/Preguntas";
import { Roles } from "@/components/landing/Roles";

export function Landing({ demoHabilitado = false }: { demoHabilitado?: boolean }) {
  return (
    <main className="hyto-landing">
      <Hero demoHabilitado={demoHabilitado} />
      <Pasos />
      <Roles />
      <Mile />
      <Preguntas />
      <Cierre demoHabilitado={demoHabilitado} />
    </main>
  );
}
