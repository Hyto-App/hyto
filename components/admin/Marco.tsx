"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Entrar } from "@/components/admin/Entrar";
import { Salir } from "@/components/sesion/Salir";
import { Icono, Logo, Tema } from "@/components/ui/Marca";

const ENLACES = [
  { href: "/eventos", etiqueta: "Events", icono: "projects" },
  { href: "/mis-tareas", etiqueta: "Tasks", icono: "tasks" },
] as const;

export function Marco({ children, demoHabilitado = false }: { children: ReactNode; demoHabilitado?: boolean }) {
  const ruta = usePathname();
  const eventos = ruta.startsWith("/eventos") || ruta.startsWith("/revision") || ruta === "/informe" || ruta.startsWith("/proyectos");
  const tareas = ruta.startsWith("/mis-tareas") || ruta.startsWith("/tareas");

  return (
    <div className="hyto-shell">
      <aside className="hyto-side print:hidden">
        <div className="hyto-brand">
          <Logo />
          <Tema />
        </div>
        <nav className="hyto-nav" aria-label="Main">
          {ENLACES.map((enlace) => {
            const activo = enlace.href === "/eventos" ? eventos : tareas;
            return (
              <Link key={enlace.href} href={enlace.href} className={activo ? "font-semibold hyto-nav-on" : "text-[var(--suave)]"}>
                <Icono nombre={enlace.icono} />
                <span>{enlace.etiqueta}</span>
              </Link>
            );
          })}
          <details className="hyto-mas">
            <summary className="text-[var(--suave)]">
              <Icono nombre="wallet" />
              <span>Account</span>
            </summary>
            <div className="hyto-mas-menu">
              <Link href="/eventos/nuevo">Create event</Link>
              <Link href="/join">Join with code</Link>
              <Link href="/cuentas">Payout account</Link>
            </div>
          </details>
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
