import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { Logo } from "@/components/ui/Marca";
import { discursoDe } from "@/lib/ui/discurso";
import { COOKIE_IDIOMA, idiomaDe } from "@/lib/ui/idioma";

export async function generateMetadata(): Promise<Metadata> {
  const jar = await cookies();
  const copia = discursoDe(idiomaDe(jar.get(COOKIE_IDIOMA)?.value));
  return { title: copia.graciasTitle, description: copia.graciasLead };
}

export default async function PaginaGracias() {
  const jar = await cookies();
  const copia = discursoDe(idiomaDe(jar.get(COOKIE_IDIOMA)?.value));
  return (
    <div className="hyto-login hyto-gracias">
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
              {copia.contactoKicker}
            </p>
            <h1>{copia.graciasTitle}</h1>
            <p className="hyto-privacidad-entrada">{copia.graciasLead}</p>
            <section className="hyto-gracias-paso">
              <h2>{copia.graciasPaso}</h2>
              <p>
                <Link href="/?signin=1" className="hyto-btn">
                  {copia.graciasCta}
                </Link>
              </p>
              <p>
                <Link href="/faq">{copia.graciasFaq}</Link>
                {" · "}
                <Link href="/#como-funciona">{copia.navComo}</Link>
              </p>
            </section>
          </article>
        </main>
      </div>
    </div>
  );
}
