"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useTexto } from "@/components/ui/Idioma";
import { claveDeRuta, tituloDePestana } from "@/lib/ui/tituloRuta";

/**
 * The server title follows the language cookie at request time. Changing
 * language in the shell does not ask for that title again, so the tab would
 * stay in the previous language. This writes it on the same turn as the UI.
 */
export function TituloDocumento() {
  const ruta = usePathname() ?? "";
  const t = useTexto();
  const clave = claveDeRuta(ruta);

  useEffect(() => {
    if (!clave) return;
    document.title = tituloDePestana(t(clave));
  }, [clave, t]);

  return null;
}
