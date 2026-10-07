"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Icono, Logo, Tema, iniciales } from "@/components/ui/Marca";
import { SelectorIdiomaMenu, useTexto } from "@/components/ui/Idioma";
import { Volver } from "@/components/ui/Volver";
import type { Clave } from "@/lib/ui/diccionario";
import { destinoVolver } from "@/lib/ui/volver";

type Seccion = "tareas" | "eventos" | "unirme" | "cuenta";

/** Which section the route belongs to (`/join*` is Join, not Account). */
export function seccionDe(ruta: string): Seccion | null {
  if (ruta.startsWith("/join")) return "unirme";
  if (ruta.startsWith("/mis-tareas") || ruta.startsWith("/tareas")) return "tareas";
  if (ruta.startsWith("/eventos") || ruta.startsWith("/revision") || ruta === "/informe" || ruta.startsWith("/proyectos")) return "eventos";
  if (ruta.startsWith("/cuentas")) return "cuenta";
  return null;
}

const MOVIL: readonly { seccion: Seccion; href: string; clave: Clave; icono: "tasks" | "projects" | "plus" | "wallet" }[] = [
  { seccion: "tareas", href: "/mis-tareas", clave: "nav.tasks", icono: "tasks" },
  { seccion: "eventos", href: "/eventos", clave: "nav.events", icono: "projects" },
  { seccion: "unirme", href: "/join", clave: "nav.join", icono: "plus" },
  { seccion: "cuenta", href: "/cuentas", clave: "nav.account", icono: "wallet" },
];

const ESCRITORIO: readonly { seccion: Seccion; href: string; clave: Clave; icono: "tasks" | "projects" | "wallet" }[] = [
  { seccion: "tareas", href: "/mis-tareas", clave: "nav.myTasks", icono: "tasks" },
  { seccion: "eventos", href: "/eventos", clave: "nav.events", icono: "projects" },
  { seccion: "cuenta", href: "/cuentas", clave: "nav.accountWallet", icono: "wallet" },
];

export type UsuarioMarco = { nombre: string | null; email: string };

export function Marco({ children, usuario }: { children: ReactNode; demoHabilitado?: boolean; usuario?: UsuarioMarco | null }) {
  const t = useTexto();
  const ruta = usePathname();
  const actual = seccionDe(ruta);
  const foco = ruta.startsWith("/revision") || ruta.startsWith("/tareas");
  const volver = destinoVolver(ruta);

  return (
    <div className={`hyto-shell${foco ? " hyto-shell-foco" : ""}`}>
      <aside className="hyto-side print:hidden">
        <div className="hyto-brand">
          <Logo />
          <div className="hyto-brand-acciones hyto-solo-movil">
            <SelectorIdiomaMenu className="hyto-idioma-marco" />
            <Tema />
          </div>
        </div>
        <nav className="hyto-nav hyto-nav-escritorio" aria-label={t("nav.main")}>
          {ESCRITORIO.map((enlace) => {
            const activo = actual === enlace.seccion;
            return (
              <Link key={enlace.href} href={enlace.href} aria-current={activo ? "page" : undefined} className={activo ? "font-semibold hyto-nav-on" : "text-[var(--suave)]"}>
                <Icono nombre={enlace.icono} />
                <span>{t(enlace.clave)}</span>
              </Link>
            );
          })}
        </nav>
        <nav className="hyto-nav hyto-nav-movil" aria-label={t("nav.main")}>
          {MOVIL.map((enlace) => {
            const activo = actual === enlace.seccion;
            return (
              <Link
                key={enlace.href}
                href={enlace.href}
                aria-current={activo ? "page" : undefined}
                className={`${activo ? "hyto-nav-on" : "text-[var(--suave)]"}${enlace.icono === "plus" ? " hyto-nav-mas" : ""}`}
              >
                {enlace.icono === "plus" ? (
                  <span className="hyto-nav-mas-icono">
                    <Icono nombre="plus" tamano={20} />
                  </span>
                ) : (
                  <Icono nombre={enlace.icono} tamano={22} lleno={activo} />
                )}
                <span>{t(enlace.clave)}</span>
              </Link>
            );
          })}
        </nav>
        <div className="hyto-foot hyto-foot-escritorio">
          <Link href="/join" className="hyto-btn-line">
            <Icono nombre="plus" tamano={16} />
            {t("nav.joinCode")}
          </Link>
          <div className="hyto-brand-acciones hyto-foot-acciones">
            <SelectorIdiomaMenu className="hyto-idioma-marco" />
            <Tema />
          </div>
          {usuario ? (
            <div className="hyto-usuario">
              <span className="hyto-usuario-iniciales" aria-hidden="true">
                {iniciales(usuario.nombre ?? usuario.email)}
              </span>
              <span className="hyto-usuario-datos">
                {usuario.nombre ? <strong>{usuario.nombre}</strong> : null}
                <span>{usuario.email}</span>
              </span>
            </div>
          ) : null}
        </div>
      </aside>
      <div className="hyto-main">
        {volver ? <Volver href={volver.href} etiqueta={volver.etiqueta} /> : null}
        {children}
      </div>
    </div>
  );
}
