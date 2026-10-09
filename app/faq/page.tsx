import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { Migas } from "@/components/landing/Migas";
import { Preguntas } from "@/components/landing/Preguntas";
import { Logo } from "@/components/ui/Marca";
import { SelectorIdiomaMenu } from "@/components/ui/Idioma";
import { discursoDe } from "@/lib/ui/discurso";
import { COOKIE_IDIOMA, idiomaDe } from "@/lib/ui/idioma";

export async function generateMetadata(): Promise<Metadata> {
  const jar = await cookies();
  const copia = discursoDe(idiomaDe(jar.get(COOKIE_IDIOMA)?.value));
  return { title: copia.faqTitle, description: copia.faqTitle };
}

export default async function PaginaFaq() {
  const jar = await cookies();
  const copia = discursoDe(idiomaDe(jar.get(COOKIE_IDIOMA)?.value));
  return (
    <div className="hyto-landing hyto-pagina-faq">
      <header className="hyto-landing-head hyto-pagina-faq-head">
        <Link href="/" className="hyto-landing-logo" aria-label="Hyto">
          <Logo />
        </Link>
        <SelectorIdiomaMenu className="hyto-landing-idioma" />
      </header>
      <div className="hyto-landing-band">
        <div className="hyto-landing-band-inner">
          <Migas
            ariaLabel={copia.migasAria}
            items={[
              { href: "/", etiqueta: copia.migasInicio },
              { etiqueta: copia.migasFaq },
            ]}
          />
        </div>
      </div>
      <Preguntas id="faq-pagina" enlaceCompleto={false} />
      <p className="hyto-landing-band">
        <span className="hyto-landing-band-inner hyto-faq-mas-enlaces">
          <Link href="/#como-funciona">{copia.navComo}</Link>
          <Link href="/#contacto">{copia.navContacto}</Link>
          <Link href="/privacy">{copia.navLegales}</Link>
          <Link href="/?signin=1">{copia.navApp}</Link>
        </span>
      </p>
    </div>
  );
}
