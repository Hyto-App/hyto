/**
 * Public SEO for the landing and legal pages. Private app routes stay noindex.
 * Host matches root metadataBase (production on Vercel).
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Metadata } from "next";
import { ESLOGAN } from "@/components/ui/marca/trazos";
import { DESCRIPCION_PAGINA, DESCRIPCION_PAGINA_ES, discursoDe, preguntasDiscurso } from "@/lib/ui/discurso";
import type { Idioma } from "@/lib/ui/idioma";

export const HOST_PUBLICO = "https://hyto.vercel.app";

export const ROBOTS_PRIVADO = { index: false, follow: false } as const;
export const ROBOTS_PUBLICO = { index: true, follow: true } as const;

/** App routes that must not appear in search results or the sitemap. */
export const PREFIJOS_PRIVADOS = [
  "/eventos",
  "/mis-tareas",
  "/tareas",
  "/revision",
  "/configuracion",
  "/cuentas",
  "/informe",
  "/join",
  "/comunidades",
  "/proyectos",
] as const;

/** Legal page segments coordinated with hyto#282; only listed when the page file exists. */
export const SEGMENTOS_LEGALES = ["privacy", "terms", "cookies", "refunds"] as const;

export type SegmentoLegal = (typeof SEGMENTOS_LEGALES)[number];

export function tituloMarca(): string {
  return `Hyto · ${ESLOGAN}`;
}

export function descripcionSeo(idioma: Idioma): string {
  return idioma === "es" ? DESCRIPCION_PAGINA_ES : DESCRIPCION_PAGINA;
}

export function esRutaPrivada(ruta: string): boolean {
  const path = (ruta.split("?")[0] ?? "/").replace(/\/$/, "") || "/";
  if (path === "/") return false;
  if (SEGMENTOS_LEGALES.some((segmento) => path === `/${segmento}`)) return false;
  return PREFIJOS_PRIVADOS.some((prefijo) => path === prefijo || path.startsWith(`${prefijo}/`));
}

export function legalesPresentes(raiz = process.cwd()): SegmentoLegal[] {
  return SEGMENTOS_LEGALES.filter((segmento) => existsSync(join(raiz, "app", segmento, "page.tsx")));
}

export function rutasSitemap(raiz = process.cwd()): string[] {
  const rutas = ["/"];
  for (const segmento of legalesPresentes(raiz)) {
    rutas.push(`/${segmento}`);
  }
  return rutas;
}

type MetaPublica = {
  idioma: Idioma;
  title: string;
  description: string;
  path: string;
  /** When true, `title` is the full document title (no "%s · Hyto" template). */
  absoluteTitle?: boolean;
};

export function metaPublica({ idioma, title, description, path, absoluteTitle }: MetaPublica): Metadata {
  const ogTitle = title.includes("Hyto") ? title : `${title} · Hyto`;
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    robots: ROBOTS_PUBLICO,
    openGraph: {
      type: "website",
      siteName: "Hyto",
      title: ogTitle,
      description,
      url: path,
      locale: idioma === "es" ? "es_CR" : "en_US",
      images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: tituloMarca() }],
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
      images: ["/twitter-image"],
    },
  };
}

export function jsonLdOrganization(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Hyto",
    url: HOST_PUBLICO,
    logo: `${HOST_PUBLICO}/opengraph-image`,
    description: DESCRIPCION_PAGINA,
    sameAs: ["https://tryhyto.com"],
  };
}

export function jsonLdSoftwareApplication(idioma: Idioma): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Hyto",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: HOST_PUBLICO,
    description: descripcionSeo(idioma),
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  };
}

/** FAQPage for the two public questions on the landing. Empty when there are none. */
export function jsonLdFaqPage(idioma: Idioma): Record<string, unknown> | null {
  const preguntas = preguntasDiscurso(discursoDe(idioma));
  if (preguntas.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: preguntas.map((item) => ({
      "@type": "Question",
      name: item.titulo,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.cuerpo,
      },
    })),
  };
}
