import { cookies } from "next/headers";
import type { Metadata } from "next";
import Link from "next/link";
import { Migas } from "@/components/landing/Migas";
import { Logo } from "@/components/ui/Marca";
import { discursoDe } from "@/lib/ui/discurso";
import { COOKIE_IDIOMA, idiomaDe } from "@/lib/ui/idioma";
import { privacidadDe } from "@/lib/ui/privacidad";

export async function generateMetadata(): Promise<Metadata> {
  const jar = await cookies();
  const copia = privacidadDe(idiomaDe(jar.get(COOKIE_IDIOMA)?.value));
  return { title: copia.titulo, description: copia.entrada };
}

export default async function PaginaPrivacidad() {
  const jar = await cookies();
  const idioma = idiomaDe(jar.get(COOKIE_IDIOMA)?.value);
  const copia = privacidadDe(idioma);
  const discurso = discursoDe(idioma);
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
            <Migas
              ariaLabel={discurso.migasAria}
              items={[
                { href: "/", etiqueta: discurso.migasInicio },
                { href: "/faq", etiqueta: discurso.migasFaq },
                { etiqueta: discurso.migasPrivacidad },
              ]}
            />
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
              {" · "}
              <Link href="/faq">{discurso.migasFaq}</Link>
              {" · "}
              <Link href="/?signin=1">{discurso.navApp}</Link>
            </p>
          </article>
        </main>
      </div>
    </div>
  );
}
