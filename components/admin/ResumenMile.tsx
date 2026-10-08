"use client";

import { useState } from "react";
import { useIdioma, useTexto } from "@/components/ui/Idioma";
import { textoVisible } from "@/lib/ui/etiquetas";
import { resumirFrase, type LecturaResumen } from "@/lib/ui/resumen-mile";

/** One line of Mile's note, with the rest behind See more. */
export function ResumenMile({
  frase,
  lectura = null,
}: {
  frase: string;
  lectura?: LecturaResumen | null;
}) {
  const idioma = useIdioma();
  const t = useTexto();
  const [abierto, setAbierto] = useState(false);
  const visible = textoVisible(frase, idioma);
  const { linea, resto } = resumirFrase(visible, idioma, lectura);
  if (!linea) return null;

  return (
    <div className="hyto-resumen-mile mt-3 text-sm leading-6">
      <p>{linea}</p>
      {resto ? (
        <>
          <button
            type="button"
            className="hyto-mile-mas"
            aria-expanded={abierto}
            onClick={() => setAbierto((actual) => !actual)}
          >
            {abierto ? t("mile.verMenos") : t("mile.verMas")}
          </button>
          {abierto ? <p className="mt-2 text-[var(--suave)]">{resto}</p> : null}
        </>
      ) : null}
    </div>
  );
}
