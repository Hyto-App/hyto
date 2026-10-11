"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { AyudaMile } from "@/components/admin/AyudaMile";
import { MenuPerfil } from "@/components/admin/MenuPerfil";
import { Icono, Isotipo, Logo, Tema, iniciales } from "@/components/ui/Marca";
import { SelectorIdiomaMenu, useIdioma, useTexto } from "@/components/ui/Idioma";
import { Volver } from "@/components/ui/Volver";
import { nombreEnIdioma } from "@/lib/sesion/nombre";
import { enlacesBarra, type EnlaceBarra } from "@/lib/ui/nav-organizador";
import { destinoVolver } from "@/lib/ui/volver";

type Seccion = "tareas" | "eventos" | "bandeja" | "informe" | "tareasEvento" | "unirme" | "cuenta" | "comunidades";

/** Which section the route belongs to (`/join*` is Join, not Account). */
export function seccionDe(ruta: string): Seccion | null {
  if (ruta.startsWith("/join")) return "unirme";
  if (ruta.startsWith("/comunidades")) return "comunidades";
  if (ruta.startsWith("/mis-tareas") || ruta.startsWith("/tareas")) return "tareas";
  if (ruta.startsWith("/cuentas") || ruta.startsWith("/configuracion")) return "cuenta";
  if (ruta === "/informe" || /\/informe\/?$/.test(ruta)) return "informe";
  if (/^\/eventos\/[^/]+\/tareas/.test(ruta)) return "tareasEvento";
  if (ruta.startsWith("/revision")) return "bandeja";
  if (/^\/eventos\/[^/]+/.test(ruta) && !ruta.startsWith("/eventos/nuevo")) return "bandeja";
  if (ruta.startsWith("/eventos") || ruta.startsWith("/proyectos")) return "eventos";
  return null;
}

const CLAVE_BARRA = "hyto-barra";

/** useLayoutEffect on the client so the saved rail is applied before paint. The server has no window. */
const usarLayout = typeof window !== "undefined" ? useLayoutEffect : useEffect;

function leerBarraColapsada(): boolean {
  try {
    return window.localStorage.getItem(CLAVE_BARRA) === "colapsada";
  } catch {
    return false;
  }
}

function publicarBarra(colapsada: boolean) {
  if (colapsada) document.documentElement.dataset.barra = "colapsada";
  else delete document.documentElement.dataset.barra;
}

export type UsuarioMarco = { nombre: string | null; email: string };

export function Marco({
  children,
  usuario,
  mostrarComunidades = false,
}: {
  children: ReactNode;
  demoHabilitado?: boolean;
  usuario?: UsuarioMarco | null;
  /** Still passed by the layouts. The bar no longer links into one event, so it does not read it. */
  eventosOrganizados?: readonly string[];
  mostrarComunidades?: boolean;
}) {
  const t = useTexto();
  const ruta = usePathname();
  const enlaces = enlacesBarra(mostrarComunidades);
  const actual = seccionDe(ruta);
  const eventoAbierto = actual === "eventos" || actual === "bandeja" || actual === "informe" || actual === "tareasEvento" || actual === "unirme";
  const activo = (enlace: EnlaceBarra) => (enlace.seccion === "eventos" ? eventoAbierto : actual === enlace.seccion);
  // A task detail keeps the same top bar and bottom nav as the rest of the app. Only the review screen hides them.
  const foco = ruta.startsWith("/revision");
  const volver = destinoVolver(ruta);
  const [menu, setMenu] = useState(false);
  const [mas, setMas] = useState(false);
  const [ayuda, setAyuda] = useState(false);
  const [colapsada, setColapsada] = useState(false);
  const abreMenu = useRef<HTMLElement | null>(null);
  const abreAyuda = useRef<HTMLElement | null>(null);
  const cerrarMenu = useCallback(() => setMenu(false), []);
  const cerrarMas = useCallback(() => setMas(false), []);
  const cerrarAyuda = useCallback(() => setAyuda(false), []);

  function abrirMenu(boton: HTMLElement) {
    abreMenu.current = boton;
    setAyuda(false);
    setMas(false);
    setMenu(true);
  }

  function abrirAyuda(boton: HTMLElement) {
    abreAyuda.current = boton;
    setMenu(false);
    setMas(false);
    setAyuda((abierta) => !abierta);
  }

  useEffect(() => {
    function tecla(evento: KeyboardEvent) {
      if (!(evento.metaKey || evento.ctrlKey) || evento.key.toLowerCase() !== "k") return;
      evento.preventDefault();
      setMenu(false);
      setMas(false);
      setAyuda((abierta) => !abierta);
    }
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, []);

  useEffect(() => {
    const raiz = document.documentElement;
    if (ayuda) raiz.dataset.ayudaMile = "abierta";
    else delete raiz.dataset.ayudaMile;
    return () => {
      delete raiz.dataset.ayudaMile;
    };
  }, [ayuda]);

  usarLayout(() => {
    const guardada = leerBarraColapsada();
    publicarBarra(guardada);
    setColapsada(guardada);
  }, []);

  useEffect(() => {
    setMas(false);
  }, [ruta]);

  function alternarBarra() {
    const siguiente = !colapsada;
    try {
      window.localStorage.setItem(CLAVE_BARRA, siguiente ? "colapsada" : "expandida");
    } catch {
      /* A private window can refuse storage. The rail still toggles for this view. */
    }
    publicarBarra(siguiente);
    setColapsada(siguiente);
  }

  const etiquetaBarra = colapsada ? t("nav.expandSidebar") : t("nav.collapseSidebar");

  return (
    <div className={`hyto-shell${foco ? " hyto-shell-foco" : ""}${colapsada ? " is-barra-colapsada" : ""}`}>
      <aside className="hyto-side print:hidden">
        <div className="hyto-brand">
          <Logo />
          <Isotipo className="hyto-barra-marca" />
          <button
            type="button"
            className="hyto-barra-toggle hyto-solo-escritorio"
            aria-pressed={colapsada}
            aria-label={etiquetaBarra}
            title={etiquetaBarra}
            onClick={alternarBarra}
          >
            <Icono nombre={colapsada ? "chevronRight" : "panel"} tamano={18} />
          </button>
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
              <SelloPregunta />
            </button>
            <SelectorIdiomaMenu className="hyto-idioma-marco" />
            <Tema />
            <MenuEncabezado abierto={mas} alAlternar={() => setMas((abierto) => !abierto)} alCerrar={cerrarMas} />
            {usuario ? <BotonPerfil usuario={usuario} compacto onAbrir={abrirMenu} abierto={menu} /> : null}
          </div>
        </div>
        <nav className="hyto-nav hyto-nav-escritorio" aria-label={t("nav.main")}>
          {enlaces.map((enlace) => (
            <EnlaceNav key={enlace.href} href={enlace.href} icono={enlace.icono} activo={activo(enlace)} etiqueta={t(enlace.clave)} colapsada={colapsada} />
          ))}
        </nav>
        <nav className="hyto-nav hyto-nav-movil" aria-label={t("nav.main")}>
          {enlaces.map((enlace) => (
            <EnlaceNav key={enlace.href} href={enlace.href} icono={enlace.icono} activo={activo(enlace)} etiqueta={t(enlace.clave)} movil />
          ))}
        </nav>
        <div className="hyto-foot hyto-foot-escritorio">
          <button
            type="button"
            className="hyto-preguntar"
            aria-label={t("nav.askMile")}
            title={`${t("nav.askMile")} (Ctrl+K)`}
            aria-keyshortcuts="Control+K Meta+K"
            aria-haspopup="dialog"
            aria-expanded={ayuda}
            onClick={(evento) => abrirAyuda(evento.currentTarget)}
          >
            <SelloPregunta />
            <span className="hyto-preguntar-texto">{t("nav.askMile")}</span>
            <kbd>Ctrl+K</kbd>
          </button>
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

/** Phone header overflow. The lines-icon notes control lives here, with the same row as the other menus, instead of floating over the cards. */
function MenuEncabezado({ abierto, alAlternar, alCerrar }: { abierto: boolean; alAlternar: () => void; alCerrar: () => void }) {
  const t = useTexto();
  const raiz = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    function fuera(evento: MouseEvent) {
      if (!raiz.current?.contains(evento.target as Node)) alCerrar();
    }
    function tecla(evento: KeyboardEvent) {
      if (evento.key === "Escape") alCerrar();
    }
    document.addEventListener("mousedown", fuera);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("mousedown", fuera);
      document.removeEventListener("keydown", tecla);
    };
  }, [abierto, alCerrar]);

  return (
    <div ref={raiz} className="hyto-encabezado-mas">
      <button
        type="button"
        className="hyto-encabezado-mas-boton"
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-label={t("nav.more")}
        onClick={alAlternar}
      >
        <PuntosMenu />
      </button>
      {abierto ? (
        <div className="hyto-encabezado-mas-menu" role="menu">
          <Link href="/mis-tareas" role="menuitem" className="hyto-perfil-item" onClick={alCerrar}>
            <Icono nombre="tasks" />
            {t("nav.notes")}
          </Link>
        </div>
      ) : null}
    </div>
  );
}

function PuntosMenu() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="5" cy="12" r="1.7" />
      <circle cx="12" cy="12" r="1.7" />
      <circle cx="19" cy="12" r="1.7" />
    </svg>
  );
}

/** Small static brand on the bar. The panel is the only place that draws Mile. */
function SelloPregunta() {
  return <span className="hyto-preguntar-mile">
      <Isotipo decorativo className="hyto-preguntar-sello" />
    </span>;
}

function EnlaceNav({
  href,
  icono,
  activo,
  etiqueta,
  movil = false,
  colapsada = false,
}: {
  href: string;
  icono: EnlaceBarra["icono"];
  activo: boolean;
  etiqueta: string;
  movil?: boolean;
  colapsada?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={activo ? "page" : undefined}
      aria-label={colapsada ? etiqueta : undefined}
      title={colapsada ? etiqueta : undefined}
      className={activo ? "font-semibold hyto-nav-on" : "text-[var(--suave)]"}
    >
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
  const idioma = useIdioma();
  const nombre = usuario.nombre?.trim() ? nombreEnIdioma(usuario.nombre.trim(), idioma) : "";
  const letras = iniciales(nombre, usuario.email);
  return (
    <button
      type="button"
      className={`hyto-perfil-boton${compacto ? " is-compacto" : ""}`}
      aria-label={t("nav.profile")}
      title={t("nav.profile")}
      aria-haspopup="dialog"
      aria-expanded={abierto}
      aria-controls="hyto-perfil"
      onClick={(evento) => onAbrir(evento.currentTarget)}
    >
      <span className="hyto-usuario-iniciales" aria-hidden="true">
        {letras}
      </span>
      {compacto ? null : (
        <>
          <span className="hyto-usuario-datos" title={usuario.email}>
            {nombre ? <strong>{nombre}</strong> : <span>{usuario.email}</span>}
          </span>
          <svg className="hyto-perfil-flecha" width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m2 3.5 3 3 3-3" />
          </svg>
        </>
      )}
    </button>
  );
}
