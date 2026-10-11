"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { useIdioma, useTexto } from "@/components/ui/Idioma";
import { Icono, iniciales } from "@/components/ui/Marca";
import { elementosFoco, teclaDialogo } from "@/lib/ui/dialogo";
import { cerrarSesionEnCliente } from "@/lib/auth/cliente";
import { nombreEnIdioma } from "@/lib/sesion/nombre";

type UsuarioMenu = { nombre: string | null; email: string };

type Props = {
  usuario: UsuarioMenu;
  abierto: boolean;
  alCerrar: () => void;
  alAyuda: () => void;
  devolver: HTMLElement | null;
};

/** Account sheet from the sidebar avatar. Esc closes it and Tab stays inside. */
export function MenuPerfil({ usuario, abierto, alCerrar, alAyuda, devolver }: Props) {
  const t = useTexto();
  const panel = useRef<HTMLDivElement>(null);
  const titulo = useId();
  const [saliendo, setSaliendo] = useState(false);
  const idioma = useIdioma();
  const nombre = usuario.nombre?.trim() ? nombreEnIdioma(usuario.nombre.trim(), idioma) : null;
  // Without a stored name the sheet says «Su cuenta» and the email goes on the second line.
  const rotulo = nombre ?? t("nav.profile");

  useEffect(() => {
    if (!abierto) return;
    const raiz = panel.current;
    if (!raiz) return;
    elementosFoco(raiz)[0]?.focus();
    function tecla(evento: KeyboardEvent) {
      if (!panel.current) return;
      teclaDialogo(evento, panel.current, alCerrar);
    }
    // The sheet is anchored to the avatar of one layout. A width change can swap the layout and leave it
    // floating over other buttons, so it closes. Height alone (a phone's address bar) keeps it open.
    const ancho = window.innerWidth;
    function medida() {
      if (window.innerWidth !== ancho) alCerrar();
    }
    document.addEventListener("keydown", tecla);
    window.addEventListener("resize", medida);
    return () => {
      document.removeEventListener("keydown", tecla);
      window.removeEventListener("resize", medida);
      devolver?.focus();
    };
  }, [abierto, alCerrar, devolver]);

  if (!abierto) return null;

  async function salir() {
    if (saliendo) return;
    setSaliendo(true);
    await cerrarSesionEnCliente();
  }

  return (
    <div className="hyto-capa" onMouseDown={alCerrar}>
      <div
        ref={panel}
        id="hyto-perfil"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titulo}
        className="hyto-perfil-menu"
        onMouseDown={(evento) => evento.stopPropagation()}
      >
        <div className="hyto-perfil-cabeza">
          <span className="hyto-usuario-iniciales" aria-hidden="true">
            {iniciales(nombre ?? "", usuario.email)}
          </span>
          <span className="hyto-usuario-datos">
            <strong id={titulo}>{rotulo}</strong>
            <span>{usuario.email}</span>
          </span>
        </div>
        <Link href="/configuracion" className="hyto-perfil-item" onClick={alCerrar}>
          <Icono nombre="gear" />
          {t("nav.settings")}
        </Link>
        <button
          type="button"
          className="hyto-perfil-item"
          onClick={() => {
            alCerrar();
            alAyuda();
          }}
        >
          <Icono nombre="help" />
          {t("nav.helpFaq")}
        </button>
        <Link href="/privacy" className="hyto-perfil-item" onClick={alCerrar}>
          <Icono nombre="shield" />
          {t("nav.privacy")}
        </Link>
        <button type="button" className="hyto-perfil-item hyto-perfil-salir" disabled={saliendo} onClick={() => void salir()}>
          <Icono nombre="logout" />
          {saliendo ? t("cuenta.signingOut") : t("cuenta.signOut")}
        </button>
      </div>
    </div>
  );
}
