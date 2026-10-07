"use client";

import { useIdioma, useTexto } from "@/components/ui/Idioma";
import { formatearMonto } from "@/lib/integrante/formato";
import type { Clave } from "@/lib/ui/diccionario";
import type { Resumen } from "@/lib/admin/tipos";

const FILAS: readonly { clave: keyof Resumen; etiqueta: Clave }[] = [
  { clave: "presupuesto", etiqueta: "numeros.budget" },
  { clave: "pagado", etiqueta: "numeros.paid" },
  { clave: "pendiente", etiqueta: "numeros.pending" },
];

export function Numeros({ resumen }: { resumen: Resumen }) {
  const t = useTexto();
  const idioma = useIdioma();
  return (
    <div className="hyto-kpis">
      {FILAS.map((fila) => (
        <article key={fila.clave}>
          <p className="text-sm text-[var(--suave)]">{t(fila.etiqueta)}</p>
          <p className="hyto-amount mt-2 text-2xl">{formatearMonto(resumen[fila.clave], idioma)}</p>
        </article>
      ))}
    </div>
  );
}
