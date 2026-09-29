import { formatearMonto } from "@/lib/integrante/formato";
import type { Resumen } from "@/lib/admin/tipos";

const FILAS = [
  { clave: "presupuesto", etiqueta: "Budget" },
  { clave: "pagado", etiqueta: "Paid" },
  { clave: "pendiente", etiqueta: "Pending" },
] as const;

export function Numeros({ resumen }: { resumen: Resumen }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {FILAS.map((fila) => (
        <article key={fila.clave} className="rounded-3xl bg-[var(--papel)] p-6">
          <p className="text-sm text-[var(--suave)]">{fila.etiqueta}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight">{formatearMonto(resumen[fila.clave])}</p>
        </article>
      ))}
    </div>
  );
}
