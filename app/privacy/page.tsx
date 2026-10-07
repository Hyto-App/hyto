import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/ui/Marca";
import { PRIVACIDAD } from "@/lib/ui/privacidad";

export const metadata: Metadata = {
  title: PRIVACIDAD.titulo,
  description: PRIVACIDAD.entrada,
};

export default function PaginaPrivacidad() {
  return (
    <div className="hyto-login hyto-privacidad">
      <div className="hyto-login-escena" aria-hidden="true">
        <div className="hyto-login-vineta" />
        <div className="hyto-login-lineas">
          <i className="is-v is-l" />
          <i className="is-v is-r" />
          <i className="is-h is-t" />
          <i className="is-h is-b" />
          <b className="is-1" />
          <b className="is-2" />
          <b className="is-3" />
          <b className="is-4" />
        </div>
      </div>
      <div className="hyto-login-marco">
        <header className="hyto-login-top">
          <Link href="/" className="hyto-login-logo">
            <Logo />
          </Link>
        </header>
        <main className="hyto-login-grid">
          <article className="hyto-login-tarjeta">
            <p className="hyto-login-chip">
              <span aria-hidden="true" />
              {PRIVACIDAD.kicker}
            </p>
            <h1>{PRIVACIDAD.titular}</h1>
            <p className="hyto-privacidad-entrada">{PRIVACIDAD.entrada}</p>
            {PRIVACIDAD.secciones.map((seccion) => (
              <section key={seccion.titulo}>
                <h2>{seccion.titulo}</h2>
                <p>{seccion.cuerpo}</p>
              </section>
            ))}
            <p className="hyto-login-legal">
              <Link href="/">{PRIVACIDAD.inicio}</Link>
            </p>
          </article>
        </main>
      </div>
    </div>
  );
}
