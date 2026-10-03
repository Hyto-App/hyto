"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { mensajeClaro } from "@/lib/ui/claro";
import { texto, type Clave } from "@/lib/ui/diccionario";
import { discursoDe } from "@/lib/ui/discurso";
import { guardarIdioma, type Idioma } from "@/lib/ui/idioma";

type Estado = {
  idioma: Idioma;
  elegir: (idioma: Idioma) => void;
};

const Contexto = createContext<Estado>({
  idioma: "en",
  elegir: () => undefined,
});

export function ProveedorIdioma({ idioma, children }: { idioma: Idioma; children: ReactNode }) {
  const [actual, setActual] = useState(idioma);

  useEffect(() => {
    setActual(idioma);
    document.documentElement.lang = idioma;
  }, [idioma]);

  const elegir = useCallback((siguiente: Idioma) => {
    guardarIdioma(siguiente);
    setActual(siguiente);
  }, []);

  return <Contexto.Provider value={{ idioma: actual, elegir }}>{children}</Contexto.Provider>;
}

export function useIdioma(): Idioma {
  return useContext(Contexto).idioma;
}

export function useTexto() {
  const idioma = useIdioma();
  return useCallback((clave: Clave, vars?: Record<string, string | number>) => texto(idioma, clave, vars), [idioma]);
}

export function useClaro() {
  const idioma = useIdioma();
  return useCallback((mensaje: string) => mensajeClaro(mensaje, idioma), [idioma]);
}

export function useDiscurso() {
  return discursoDe(useIdioma());
}

export function SelectorIdioma({ className = "" }: { className?: string }) {
  const { idioma, elegir } = useContext(Contexto);
  const t = useTexto();
  return (
    <div className={`hyto-idioma ${className}`.trim()} role="group" aria-label={t("idioma.grupo")}>
      <button type="button" aria-pressed={idioma === "en"} onClick={() => elegir("en")}>
        {t("idioma.en")}
      </button>
      <button type="button" aria-pressed={idioma === "es"} onClick={() => elegir("es")}>
        {t("idioma.es")}
      </button>
    </div>
  );
}

export function Texto({
  clave,
  vars,
  as: Etiqueta = "span",
  className,
}: {
  clave: Clave;
  vars?: Record<string, string | number>;
  as?: "span" | "p" | "h1" | "h2";
  className?: string;
}) {
  const t = useTexto();
  return <Etiqueta className={className}>{t(clave, vars)}</Etiqueta>;
}
