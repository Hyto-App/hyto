"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Icono, Logo, Tema } from "@/components/ui/Marca";

const ENLACES = [
  { href: "/eventos", etiqueta: "Events", icono: "projects" },
  { href: "/mis-tareas", etiqueta: "Tasks", icono: "tasks" },
  { href: "/cuentas", etiqueta: "Account", icono: "wallet" },
] as const;

export function Marco({ children }: { children: ReactNode; demoHabilitado?: boolean }) {
  const ruta = usePathname();
  const eventos = ruta.startsWith("/eventos") || ruta.startsWith("/revision") || ruta === "/informe" || ruta.startsWith("/proyectos");
  const tareas = ruta.startsWith("/mis-tareas") || ruta.startsWith("/tareas");
  const cuenta = ruta.startsWith("/cuentas") || ruta.startsWith("/join");
  const foco = ruta.startsWith("/revision") || ruta.startsWith("/tareas");

  return (
    <div className={`hyto-shell${foco ? " hyto-shell-foco" : ""}`}>
      <aside className="hyto-side print:hidden">
        <div className="hyto-brand">
          <Logo />
          <Tema />
        </div>
        <nav className="hyto-nav" aria-label="Main">
          {ENLACES.map((enlace) => {
            const activo = enlace.href === "/eventos" ? eventos : enlace.href === "/cuentas" ? cuenta : tareas;
            return (
              <Link key={enlace.href} href={enlace.href} className={activo ? "font-semibold hyto-nav-on" : "text-[var(--suave)]"}>
                <Icono nombre={enlace.icono} />
                <span>{enlace.etiqueta}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="hyto-main">
        {foco ? (
          <button type="button" className="hyto-atras" aria-label="Back" onClick={() => window.history.back()}>
            ←
          </button>
        ) : null}
        {children}
      </div>
    </div>
  );
}
