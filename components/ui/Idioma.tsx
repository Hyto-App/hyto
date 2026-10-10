"use client";

import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { mensajeClaro } from "@/lib/ui/claro";
import { texto, type Clave } from "@/lib/ui/diccionario";
import { discursoDe } from "@/lib/ui/discurso";
import { guardarIdioma, type Idioma } from "@/lib/ui/idioma";

type Estado = {
  idioma: Idioma;
  elegir: (idioma: Idioma) => void;
};

const Contexto = createContext<Estado>({
  idioma: "en",
  elegir: () => undefined,
});

export function ProveedorIdioma({ idioma, children }: { idioma: Idioma; children: ReactNode }) {
  const [actual, setActual] = useState(idioma);

  useEffect(() => {
    setActual(idioma);
    document.documentElement.lang = idioma;
  }, [idioma]);

  const elegir = useCallback((siguiente: Idioma) => {
    guardarIdioma(siguiente);
    setActual(siguiente);
  }, []);

  return <Contexto.Provider value={{ idioma: actual, elegir }}>{children}</Contexto.Provider>;
}

export function useIdioma(): Idioma {
  return useContext(Contexto).idioma;
}

export function useTexto() {
  const idioma = useIdioma();
  return useCallback((clave: Clave, vars?: Record<string, string | number>) => texto(idioma, clave, vars), [idioma]);
}

export function useClaro() {
  const idioma = useIdioma();
  return useCallback((mensaje: string) => mensajeClaro(mensaje, idioma), [idioma]);
}

export function useDiscurso() {
  return discursoDe(useIdioma());
}

export function SelectorIdioma({ className = "" }: { className?: string }) {
  const { idioma, elegir } = useContext(Contexto);
  const t = useTexto();
  return (
    <div className={`hyto-idioma ${className}`.trim()} role="group" aria-label={t("idioma.grupo")}>
      <button type="button" aria-pressed={idioma === "en"} onClick={() => elegir("en")}>
        {t("idioma.en")}
      </button>
      <button type="button" aria-pressed={idioma === "es"} onClick={() => elegir("es")}>
        {t("idioma.es")}
      </button>
    </div>
  );
}

const OPCIONES: { codigo: Idioma; nombre: string }[] = [
  { codigo: "en", nombre: "English" },
  { codigo: "es", nombre: "Español" },
];

export function SelectorIdiomaMenu({ className = "" }: { className?: string }) {
  const { idioma, elegir } = useContext(Contexto);
  const t = useTexto();
  const [abierto, setAbierto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  const boton = useRef<HTMLButtonElement>(null);
  const items = useRef<(HTMLButtonElement | null)[]>([]);
  const idMenu = useId();

  const cerrar = useCallback((devolverFoco: boolean) => {
    setAbierto(false);
    if (devolverFoco) boton.current?.focus();
  }, []);

  useEffect(() => {
    if (!abierto) return;
    items.current[OPCIONES.findIndex((o) => o.codigo === idioma)]?.focus();
    const fuera = (e: MouseEvent) => {
      if (!raiz.current?.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener("mousedown", fuera);
    return () => document.removeEventListener("mousedown", fuera);
  }, [abierto, idioma]);

  const mover = (desde: number, paso: number) => {
    const n = OPCIONES.length;
    items.current[(desde + paso + n) % n]?.focus();
  };

  const teclasBoton = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setAbierto(true);
    }
  };

  const teclasMenu = (e: KeyboardEvent<HTMLDivElement>) => {
    const actual = items.current.findIndex((el) => el === document.activeElement);
    if (e.key === "Escape") {
      e.preventDefault();
      cerrar(true);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      mover(actual, 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      mover(actual, -1);
    } else if (e.key === "Home") {
      e.preventDefault();
      mover(0, 0);
    } else if (e.key === "End") {
      e.preventDefault();
      mover(OPCIONES.length - 1, 0);
    } else if (e.key === "Tab") {
      setAbierto(false);
    }
  };

  const etiqueta = `${t("idioma.grupo")}: ${idioma.toUpperCase()}`;
  return (
    <div ref={raiz} className={`hyto-idioma-menu ${className}`.trim()}>
      <button
        ref={boton}
        type="button"
        className="hyto-idioma-menu-boton"
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-controls={abierto ? idMenu : undefined}
        aria-label={etiqueta}
        title={etiqueta}
        onClick={() => setAbierto((v) => !v)}
        onKeyDown={teclasBoton}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3Z" />
        </svg>
        <span>{idioma.toUpperCase()}</span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m2 3.5 3 3 3-3" />
        </svg>
      </button>
      {abierto ? (
        <div id={idMenu} role="menu" aria-label={t("idioma.grupo")} className="hyto-idioma-menu-lista" onKeyDown={teclasMenu}>
          {OPCIONES.map((o, i) => (
            <button
              key={o.codigo}
              ref={(el) => {
                items.current[i] = el;
              }}
              type="button"
              role="menuitemradio"
              aria-checked={idioma === o.codigo}
              lang={o.codigo}
              tabIndex={-1}
              onClick={() => {
                elegir(o.codigo);
                cerrar(true);
              }}
            >
              {o.nombre}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function Texto({
  clave,
  vars,
  as: Etiqueta = "span",
  className,
}: {
  clave: Clave;
  vars?: Record<string, string | number>;
  as?: "span" | "p" | "h1" | "h2";
  className?: string;
}) {
  const t = useTexto();
  return <Etiqueta className={className}>{t(clave, vars)}</Etiqueta>;
}
