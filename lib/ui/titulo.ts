import { cookies } from "next/headers";
import type { Metadata } from "next";
import { texto, type Clave } from "@/lib/ui/diccionario";
import { COOKIE_IDIOMA, idiomaDe } from "@/lib/ui/idioma";

/** Page title in the session language (cookie `hyto_idioma`); the layout template adds "· Hyto". */
export function tituloDe(clave: Extract<Clave, `titulos.${string}`>): () => Promise<Metadata> {
  return async () => {
    const jar = await cookies();
    return { title: texto(idiomaDe(jar.get(COOKIE_IDIOMA)?.value), clave) };
  };
}
