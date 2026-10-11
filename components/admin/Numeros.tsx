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

/**
 * Budget, paid, and remaining. When `pagado` is given, the paid box shows the net people received
 * (what their task screen says) with the gross minus the fee below it; budget and remaining stay gross.
 */
export function Numeros({ resumen, pagado }: { resumen: Resumen; pagado?: { corto: string; detalle: string | null } }) {
  const t = useTexto();
  const idioma = useIdioma();
  return (
    <div className="hyto-kpis">
      {FILAS.map((fila) => (
        <article key={fila.clave}>
          <p className="text-sm text-[var(--suave)]">{t(fila.etiqueta)}</p>
          <p className="hyto-amount mt-2 text-2xl">
            {fila.clave === "pagado" && pagado ? pagado.corto : formatearMonto(resumen[fila.clave], idioma)}
          </p>
          {fila.clave === "pagado" && pagado?.detalle ? <p className="mt-1 text-xs text-[var(--suave)]">{pagado.detalle}</p> : null}
        </article>
      ))}
    </div>
  );
}
