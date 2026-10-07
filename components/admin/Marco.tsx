"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { AyudaMile } from "@/components/admin/AyudaMile";
import { MenuPerfil } from "@/components/admin/MenuPerfil";
import { Icono, Logo, Tema, iniciales } from "@/components/ui/Marca";
import { SelectorIdiomaMenu, useTexto } from "@/components/ui/Idioma";
import { Mile } from "@/components/ui/Mile";
import { Volver } from "@/components/ui/Volver";
import { useRolDemo } from "@/components/sesion/InsigniaDemo";
import { ENLACE_PRIVACIDAD } from "@/lib/ui/privacidad";
import type { Clave } from "@/lib/ui/diccionario";
import { idNavOrganizador, muestraNavOrganizador } from "@/lib/ui/nav-organizador";
import { destinoVolver } from "@/lib/ui/volver";

type Seccion = "tareas" | "eventos" | "bandeja" | "informe" | "tareasEvento" | "unirme" | "cuenta";
type IconoNav = "tasks" | "projects" | "plus" | "inbox" | "report";

/** Which section the route belongs to (`/join*` is Join, not Account). */
export function seccionDe(ruta: string): Seccion | null {
  if (ruta.startsWith("/join")) return "unirme";
  if (ruta.startsWith("/mis-tareas") || ruta.startsWith("/tareas")) return "tareas";
  if (ruta.startsWith("/cuentas") || ruta.startsWith("/configuracion")) return "cuenta";
  if (ruta === "/informe" || /\/informe\/?$/.test(ruta)) return "informe";
  if (/^\/eventos\/[^/]+\/tareas/.test(ruta)) return "tareasEvento";
  if (ruta.startsWith("/revision")) return "bandeja";
  if (/^\/eventos\/[^/]+/.test(ruta) && !ruta.startsWith("/eventos/nuevo")) return "bandeja";
  if (ruta.startsWith("/eventos") || ruta.startsWith("/proyectos")) return "eventos";
  return null;
}

type EnlaceNavDato = { seccion: Seccion; href: string; clave: Clave; icono: IconoNav };

const MOVIL: readonly EnlaceNavDato[] = [
  { seccion: "tareas", href: "/mis-tareas", clave: "nav.myTasks", icono: "tasks" },
  { seccion: "eventos", href: "/eventos", clave: "nav.events", icono: "projects" },
  { seccion: "unirme", href: "/join", clave: "nav.join", icono: "plus" },
];

const TRABAJO: readonly EnlaceNavDato[] = [
  { seccion: "tareas", href: "/mis-tareas", clave: "nav.myTasks", icono: "tasks" },
  { seccion: "eventos", href: "/eventos", clave: "nav.events", icono: "projects" },
];

function enlacesOrganizador(eventoId: string): EnlaceNavDato[] {
  return [
    { seccion: "eventos", href: "/eventos", clave: "nav.events", icono: "projects" },
    { seccion: "bandeja", href: `/eventos/${eventoId}`, clave: "eventos.inbox", icono: "inbox" },
    { seccion: "informe", href: `/eventos/${eventoId}/informe`, clave: "eventos.report", icono: "report" },
    { seccion: "tareasEvento", href: `/eventos/${eventoId}/tareas`, clave: "nav.eventTasks", icono: "tasks" },
  ];
}

export type UsuarioMarco = { nombre: string | null; email: string };

export function Marco({
  children,
  usuario,
  eventosOrganizados = [],
}: {
  children: ReactNode;
  demoHabilitado?: boolean;
  usuario?: UsuarioMarco | null;
  eventosOrganizados?: readonly string[];
}) {
  const t = useTexto();
  const ruta = usePathname();
  const rolDemo = useRolDemo();
  const demoOrganizador = rolDemo === "organizador";
  const organiza = muestraNavOrganizador(eventosOrganizados, demoOrganizador);
  const eventoId = idNavOrganizador(ruta, eventosOrganizados, demoOrganizador);
  const propios = organiza && eventoId ? enlacesOrganizador(eventoId) : [];
  const trabajo = organiza ? TRABAJO.filter((enlace) => enlace.seccion !== "eventos") : TRABAJO;
  const movil = propios.length > 0 ? [...propios, ...MOVIL.filter((enlace) => enlace.seccion !== "eventos")] : MOVIL;
  const actual = seccionDe(ruta);
  const eventoAbierto = actual === "eventos" || actual === "bandeja" || actual === "informe" || actual === "tareasEvento";
  const foco = ruta.startsWith("/revision") || ruta.startsWith("/tareas");
  const volver = destinoVolver(ruta);
  const [menu, setMenu] = useState(false);
  const [ayuda, setAyuda] = useState(false);
  const abreMenu = useRef<HTMLElement | null>(null);
  const abreAyuda = useRef<HTMLElement | null>(null);
  const cerrarMenu = useCallback(() => setMenu(false), []);
  const cerrarAyuda = useCallback(() => setAyuda(false), []);

  function abrirMenu(boton: HTMLElement) {
    abreMenu.current = boton;
    setAyuda(false);
    setMenu(true);
  }

  function abrirAyuda(boton: HTMLElement) {
    abreAyuda.current = boton;
    setMenu(false);
    setAyuda((abierta) => !abierta);
  }

  useEffect(() => {
    function tecla(evento: KeyboardEvent) {
      if (!(evento.metaKey || evento.ctrlKey) || evento.key.toLowerCase() !== "k") return;
      evento.preventDefault();
      setMenu(false);
      setAyuda((abierta) => !abierta);
    }
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, []);

  return (
    <div className={`hyto-shell${foco ? " hyto-shell-foco" : ""}`}>
      <aside className="hyto-side print:hidden">
        <div className="hyto-brand">
          <Logo />
          <div className="hyto-brand-acciones hyto-solo-movil">
            <button
              type="button"
              className="hyto-preguntar hyto-preguntar-icono"
              aria-label={t("nav.askMile")}
              aria-keyshortcuts="Control+K Meta+K"
              aria-haspopup="dialog"
              aria-expanded={ayuda}
              onClick={(evento) => abrirAyuda(evento.currentTarget)}
            >
              <Mile estado="cara-feliz" tamano={28} />
            </button>
            <SelectorIdiomaMenu className="hyto-idioma-marco" />
            <Tema />
            {usuario ? <BotonPerfil usuario={usuario} compacto onAbrir={abrirMenu} abierto={menu} /> : null}
          </div>
        </div>
        <nav className="hyto-nav hyto-nav-escritorio" aria-label={t("nav.main")}>
          {propios.length > 0 ? (
            <div className="hyto-nav-bloque">
              <p id="hyto-nav-organiza" className="hyto-nav-grupo">
                {t("nav.groupOrganize")}
              </p>
              <div role="group" aria-labelledby="hyto-nav-organiza">
                {propios.map((enlace) => (
                  <EnlaceNav key={enlace.href} href={enlace.href} icono={enlace.icono} activo={actual === enlace.seccion} etiqueta={t(enlace.clave)} />
                ))}
              </div>
            </div>
          ) : null}
          <div className="hyto-nav-bloque">
            <p id="hyto-nav-trabajo" className="hyto-nav-grupo">
              {t("nav.groupWork")}
            </p>
            <div role="group" aria-labelledby="hyto-nav-trabajo">
              {trabajo.map((enlace) => (
                <EnlaceNav
                  key={enlace.href}
                  href={enlace.href}
                  icono={enlace.icono}
                  activo={enlace.seccion === "eventos" ? eventoAbierto : actual === enlace.seccion}
                  etiqueta={t(enlace.clave)}
                />
              ))}
            </div>
          </div>
          <div className="hyto-nav-bloque">
            <p id="hyto-nav-unirme" className="hyto-nav-grupo">
              {t("nav.groupJoin")}
            </p>
            <div role="group" aria-labelledby="hyto-nav-unirme">
              <EnlaceNav href="/join" icono="plus" activo={actual === "unirme"} etiqueta={t("nav.joinCode")} />
            </div>
          </div>
        </nav>
        <nav className={`hyto-nav hyto-nav-movil${propios.length > 0 ? " is-organiza" : ""}`} aria-label={t("nav.main")}>
          {movil.map((enlace) => (
            <EnlaceNav
              key={enlace.href}
              href={enlace.href}
              icono={enlace.icono}
              activo={enlace.seccion === "eventos" && propios.length === 0 ? eventoAbierto : actual === enlace.seccion}
              etiqueta={t(enlace.clave)}
              movil
            />
          ))}
        </nav>
        <div className="hyto-foot hyto-foot-escritorio">
          <button
            type="button"
            className="hyto-preguntar"
            aria-keyshortcuts="Control+K Meta+K"
            aria-haspopup="dialog"
            aria-expanded={ayuda}
            onClick={(evento) => abrirAyuda(evento.currentTarget)}
          >
            <Mile estado="cara-feliz" tamano={28} />
            <span>{t("nav.askMile")}</span>
            <kbd>Ctrl+K</kbd>
          </button>
          <Link href="/privacy" className="hyto-foot-privacidad">
            {ENLACE_PRIVACIDAD}
          </Link>
          <div className="hyto-brand-acciones hyto-foot-acciones">
            <SelectorIdiomaMenu className="hyto-idioma-marco" />
            <Tema />
          </div>
          {usuario ? <BotonPerfil usuario={usuario} onAbrir={abrirMenu} abierto={menu} /> : null}
        </div>
      </aside>
      <div className="hyto-main">
        {volver ? <Volver href={volver.href} etiqueta={volver.etiqueta} /> : null}
        {children}
      </div>
      {usuario ? (
        <MenuPerfil
          usuario={usuario}
          abierto={menu}
          alCerrar={cerrarMenu}
          alAyuda={() => {
            abreAyuda.current = abreMenu.current;
            setAyuda(true);
          }}
          devolver={abreMenu.current}
        />
      ) : null}
      <AyudaMile abierto={ayuda} alCerrar={cerrarAyuda} devolver={abreAyuda.current} />
    </div>
  );
}

function EnlaceNav({
  href,
  icono,
  activo,
  etiqueta,
  movil = false,
}: {
  href: string;
  icono: IconoNav;
  activo: boolean;
  etiqueta: string;
  movil?: boolean;
}) {
  return (
    <Link href={href} aria-current={activo ? "page" : undefined} className={activo ? "font-semibold hyto-nav-on" : "text-[var(--suave)]"}>
      <Icono nombre={icono} tamano={movil ? 22 : 18} lleno={movil && activo} />
      <span>{etiqueta}</span>
    </Link>
  );
}

function BotonPerfil({
  usuario,
  compacto = false,
  abierto,
  onAbrir,
}: {
  usuario: UsuarioMarco;
  compacto?: boolean;
  abierto: boolean;
  onAbrir: (boton: HTMLElement) => void;
}) {
  const t = useTexto();
  const rotulo = usuario.nombre?.trim() || usuario.email;
  const letras = iniciales(usuario.nombre ?? "", usuario.email);
  return (
    <button
      type="button"
      className={`hyto-perfil-boton${compacto ? " is-compacto" : ""}`}
      aria-label={t("nav.profile")}
      aria-haspopup="dialog"
      aria-expanded={abierto}
      aria-controls="hyto-perfil"
      onClick={(evento) => onAbrir(evento.currentTarget)}
    >
      <span className="hyto-usuario-iniciales" aria-hidden="true">
        {letras}
      </span>
      {compacto ? null : (
        <span className="hyto-usuario-datos">
          {usuario.nombre ? <strong>{usuario.nombre}</strong> : null}
          <span>{usuario.email}</span>
        </span>
      )}
    </button>
  );
}
