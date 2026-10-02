import { formatearMonto } from "@/lib/integrante/formato";
import type { Resumen } from "@/lib/admin/tipos";

const FILAS = [
  { clave: "presupuesto", etiqueta: "Budget" },
  { clave: "pagado", etiqueta: "Paid" },
  { clave: "pendiente", etiqueta: "Remaining" },
] as const;

export function Numeros({ resumen }: { resumen: Resumen }) {
  return (
    <div className="hyto-kpis">
      {FILAS.map((fila) => (
        <article key={fila.clave}>
          <p className="text-sm text-[var(--suave)]">{fila.etiqueta}</p>
          <p className="hyto-amount mt-2 text-2xl">{formatearMonto(resumen[fila.clave])}</p>
        </article>
      ))}
    </div>
  );
}
