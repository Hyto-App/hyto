import { cookies } from "next/headers";
import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/ui/Marca";
import { COOKIE_IDIOMA, idiomaDe } from "@/lib/ui/idioma";
import { privacidadDe } from "@/lib/ui/privacidad";

export async function generateMetadata(): Promise<Metadata> {
  const jar = await cookies();
  const copia = privacidadDe(idiomaDe(jar.get(COOKIE_IDIOMA)?.value));
  return { title: copia.titulo, description: copia.entrada };
}

export default async function PaginaPrivacidad() {
  const jar = await cookies();
  const copia = privacidadDe(idiomaDe(jar.get(COOKIE_IDIOMA)?.value));
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
              {copia.kicker}
            </p>
            <h1>{copia.titular}</h1>
            <p className="hyto-privacidad-entrada">{copia.entrada}</p>
            {copia.secciones.map((seccion) => (
              <section key={seccion.titulo}>
                <h2>{seccion.titulo}</h2>
                <p>{seccion.cuerpo}</p>
              </section>
            ))}
            <p className="hyto-login-legal">
              <Link href="/">{copia.inicio}</Link>
            </p>
          </article>
        </main>
      </div>
    </div>
  );
}
