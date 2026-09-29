"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Entrar } from "@/components/admin/Entrar";
import { InsigniaDemo } from "@/components/sesion/InsigniaDemo";
import { Salir } from "@/components/sesion/Salir";

const ENLACES = [
  { href: "/", etiqueta: "Bandeja" },
  { href: "/informe", etiqueta: "Informe" },
  { href: "/proyectos/nuevo", etiqueta: "Crear proyecto" },
];

export function Marco({ children, demoHabilitado = false }: { children: ReactNode; demoHabilitado?: boolean }) {
  const ruta = usePathname();

  return (
    <>
      <header className="mb-10 flex flex-wrap items-start justify-between gap-6 print:hidden">
        <div>
          <p className="text-sm text-[var(--suave)]">
            Hyto
            <InsigniaDemo />
          </p>
          <nav className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
            {ENLACES.map((enlace) => {
              const activo = enlace.href === "/" ? ruta === "/" : ruta.startsWith(enlace.href);
              return (
                <Link key={enlace.href} href={enlace.href} className={activo ? "font-semibold" : "text-[var(--suave)]"}>
                  {enlace.etiqueta}
                </Link>
              );
            })}
            <Link href="/mis-tareas" className="text-[var(--suave)]">
              Mis tareas
            </Link>
          </nav>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Entrar demoHabilitado={demoHabilitado} />
          <Salir />
        </div>
      </header>
      {children}
    </>
  );
}
