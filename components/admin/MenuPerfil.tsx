"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { EnlacesLegales } from "@/components/ui/EnlacesLegales";
import { useTexto } from "@/components/ui/Idioma";
import { iniciales } from "@/components/ui/Marca";
import { elementosFoco, teclaDialogo } from "@/lib/ui/dialogo";
import { cerrarSesionEnCliente } from "@/lib/auth/cliente";

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
  const nombre = usuario.nombre?.trim() || null;
  const rotulo = nombre ?? usuario.email;

  useEffect(() => {
    if (!abierto) return;
    const raiz = panel.current;
    if (!raiz) return;
    elementosFoco(raiz)[0]?.focus();
    function tecla(evento: KeyboardEvent) {
      if (!panel.current) return;
      teclaDialogo(evento, panel.current, alCerrar);
    }
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("keydown", tecla);
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
            {iniciales(usuario.nombre ?? "", usuario.email)}
          </span>
          <span className="hyto-usuario-datos">
            <strong id={titulo}>{rotulo}</strong>
            {nombre ? <span>{usuario.email}</span> : null}
          </span>
        </div>
        <Link href="/configuracion" className="hyto-perfil-item" onClick={alCerrar}>
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
          {t("nav.helpFaq")}
        </button>
        <div onClick={alCerrar}>
          <EnlacesLegales className="hyto-perfil-legal" enlaceClass="hyto-perfil-item" />
        </div>
        <button type="button" className="hyto-perfil-item hyto-perfil-salir" disabled={saliendo} onClick={() => void salir()}>
          {saliendo ? t("cuenta.signingOut") : t("cuenta.signOut")}
        </button>
      </div>
    </div>
  );
}
