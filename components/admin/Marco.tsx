"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Entrar } from "@/components/admin/Entrar";
import { Salir } from "@/components/sesion/Salir";
import { Icono, Logo, Tema } from "@/components/ui/Marca";

const ENLACES = [
  { href: "/", etiqueta: "Inbox", icono: "inbox" },
  { href: "/informe", etiqueta: "Report", icono: "report" },
  { href: "/proyectos/nuevo", etiqueta: "Projects", icono: "projects" },
  { href: "/mis-tareas", etiqueta: "My tasks", icono: "tasks" },
] as const;

export function Marco({ children, demoHabilitado = false }: { children: ReactNode; demoHabilitado?: boolean }) {
  const ruta = usePathname();

  return (
    <div className="hyto-shell">
      <aside className="hyto-side print:hidden">
        <div className="hyto-brand">
          <Logo />
          <Tema />
        </div>
        <nav className="hyto-nav" aria-label="Main">
          {ENLACES.map((enlace) => {
            const activo = enlace.href === "/" ? ruta === "/" : ruta.startsWith(enlace.href);
            return (
              <Link
                key={enlace.href}
                href={enlace.href}
                className={activo ? "font-semibold hyto-nav-on" : "text-[var(--suave)]"}
              >
                <Icono nombre={enlace.icono} />
                <span>{enlace.etiqueta}</span>
              </Link>
            );
          })}
        </nav>
        <div className="hyto-foot">
          <Entrar demoHabilitado={demoHabilitado} />
          <Salir />
        </div>
      </aside>
      <div className="hyto-main">{children}</div>
    </div>
  );
}
