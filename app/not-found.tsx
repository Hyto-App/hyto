import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { NoEncontrado } from "@/components/ui/NoEncontrado";
import { texto } from "@/lib/ui/diccionario";
import { COOKIE_IDIOMA, idiomaDe, idiomaDeNavegador } from "@/lib/ui/idioma";
import { ROBOTS_PRIVADO } from "@/lib/ui/seo";

export async function generateMetadata(): Promise<Metadata> {
  const jar = await cookies();
  const guardado = jar.get(COOKIE_IDIOMA)?.value;
  const idioma = guardado ? idiomaDe(guardado) : idiomaDeNavegador((await headers()).get("accept-language"));
  return {
    title: { absolute: `${texto(idioma, "ausente.titulo")} · Hyto` },
    description: texto(idioma, "ausente.cuerpo"),
    robots: ROBOTS_PRIVADO,
  };
}

export default function PaginaAusente() {
  return <NoEncontrado />;
}
