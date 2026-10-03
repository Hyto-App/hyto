"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Icono, Logo, Tema } from "@/components/ui/Marca";
import { SelectorIdioma, useTexto } from "@/components/ui/Idioma";
import type { Clave } from "@/lib/ui/diccionario";

const ENLACES: readonly { href: string; clave: Clave; icono: "projects" | "tasks" | "wallet" }[] = [
  { href: "/eventos", clave: "nav.events", icono: "projects" },
  { href: "/mis-tareas", clave: "nav.tasks", icono: "tasks" },
  { href: "/cuentas", clave: "nav.account", icono: "wallet" },
];

export function Marco({ children }: { children: ReactNode; demoHabilitado?: boolean }) {
  const t = useTexto();
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
          <div className="hyto-brand-acciones">
            <SelectorIdioma />
            <Tema />
          </div>
        </div>
        <nav className="hyto-nav" aria-label={t("nav.main")}>
          {ENLACES.map((enlace) => {
            const activo = enlace.href === "/eventos" ? eventos : enlace.href === "/cuentas" ? cuenta : tareas;
            return (
              <Link key={enlace.href} href={enlace.href} className={activo ? "font-semibold hyto-nav-on" : "text-[var(--suave)]"}>
                <Icono nombre={enlace.icono} />
                <span>{t(enlace.clave)}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="hyto-main">
        {foco ? (
          <button type="button" className="hyto-atras" aria-label={t("nav.back")} onClick={() => window.history.back()}>
            ←
          </button>
        ) : null}
        {children}
      </div>
    </div>
  );
}
