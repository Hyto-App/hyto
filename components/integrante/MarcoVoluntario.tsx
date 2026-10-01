"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Icono, Logo, Tema } from "@/components/ui/Marca";

const ENLACES = [
  { href: "/mis-tareas", etiqueta: "Tasks", icono: "tasks" },
  { href: "/cuentas", etiqueta: "Wallet", icono: "wallet" },
] as const;

export function MarcoVoluntario({ children }: { children: ReactNode }) {
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
            const activo = ruta === enlace.href || ruta.startsWith(`${enlace.href}/`) || (enlace.href === "/mis-tareas" && ruta.startsWith("/tareas"));
            return (
              <Link key={enlace.href} href={enlace.href} className={activo ? "font-semibold hyto-nav-on" : "text-[var(--suave)]"}>
                <Icono nombre={enlace.icono} />
                <span>{enlace.etiqueta}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="hyto-main">{children}</div>
    </div>
  );
}
