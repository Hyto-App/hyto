import { cookies } from "next/headers";
import type { Metadata } from "next";
import { PaginaLegal } from "@/components/ui/PaginaLegal";
import { COOKIE_IDIOMA, idiomaDe } from "@/lib/ui/idioma";
import { reembolsosDe } from "@/lib/ui/legal";

async function copia() {
  const jar = await cookies();
  return reembolsosDe(idiomaDe(jar.get(COOKIE_IDIOMA)?.value));
}

export async function generateMetadata(): Promise<Metadata> {
  const texto = await copia();
  return { title: texto.titulo, description: texto.entrada };
}

export default async function PaginaReembolsos() {
  return <PaginaLegal copia={await copia()} />;
}
