import { cookies } from "next/headers";
import type { Metadata } from "next";
import { PaginaLegal } from "@/components/ui/PaginaLegal";
import { cookiesDe } from "@/lib/ui/legal";
import { COOKIE_IDIOMA, idiomaDe } from "@/lib/ui/idioma";

async function copia() {
  const jar = await cookies();
  return cookiesDe(idiomaDe(jar.get(COOKIE_IDIOMA)?.value));
}

export async function generateMetadata(): Promise<Metadata> {
  const texto = await copia();
  return { title: texto.titulo, description: texto.entrada };
}

export default async function PaginaCookies() {
  return <PaginaLegal copia={await copia()} />;
}
