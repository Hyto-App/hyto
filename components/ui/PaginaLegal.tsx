import Link from "next/link";
import { EnlacesLegales } from "@/components/ui/EnlacesLegales";
import { SelectorIdiomaMenu } from "@/components/ui/Idioma";
import { Logo } from "@/components/ui/Marca";
import type { CopiaLegal } from "@/lib/ui/legal";

/** Public legal page. Same surface as sign-in, one reading column, both languages. */
export function PaginaLegal({ copia }: { copia: CopiaLegal }) {
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
          <SelectorIdiomaMenu className="hyto-login-idioma" />
        </header>
        <main className="hyto-login-grid">
          <article className="hyto-login-tarjeta">
            <p className="hyto-login-chip">
              <span aria-hidden="true" />
              {copia.kicker}
            </p>
            <h1>{copia.titular}</h1>
            <p className="hyto-legal-borrador">{copia.borrador}</p>
            <p className="hyto-privacidad-entrada">{copia.entrada}</p>
            {copia.secciones.map((seccion) => (
              <section key={seccion.titulo}>
                <h2>{seccion.titulo}</h2>
                <p>{seccion.cuerpo}</p>
              </section>
            ))}
            <div className="hyto-login-legal">
              <EnlacesLegales />
              <p>
                <Link href="/">{copia.inicio}</Link>
              </p>
            </div>
          </article>
        </main>
      </div>
    </div>
  );
}
