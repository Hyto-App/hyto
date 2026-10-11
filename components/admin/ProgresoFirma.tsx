"use client";

import { useTexto } from "@/components/ui/Idioma";
import type { AccionCliente } from "@/lib/escrow/firmarCliente";
import type { Clave } from "@/lib/ui/diccionario";

/**
 * What the person will see in Cavos, said before the vault opens.
 * Cavos (@cavos/kit 0.2.5) has no locale or language option: its connect, sign and vault
 * screens are always in English, so the line says so instead of switching it.
 */
export type ProgresoCavos = { clave: Clave; total: number; actual: number };

export function progresoCavos(acciones: readonly AccionCliente[], paso: AccionCliente | null): ProgresoCavos | null {
  if (acciones.includes("desplegar") || acciones.includes("fondear")) {
    const dos = acciones.includes("desplegar") && acciones.includes("fondear");
    const total = dos ? 2 : 1;
    const actual = paso === "desplegar" ? 1 : paso === "fondear" ? total : 0;
    return { clave: dos ? "firmaCavos.bloqueoDos" : "firmaCavos.bloqueoUna", total, actual };
  }
  if (acciones.includes("liberar")) {
    // The payment itself is the one confirmation that moves money. Earlier steps count as getting ready.
    return { clave: "firmaCavos.pago", total: 1, actual: paso === "liberar" ? 1 : 0 };
  }
  return null;
}

export function ProgresoFirma({ acciones, paso }: { acciones: readonly AccionCliente[]; paso: AccionCliente | null }) {
  const t = useTexto();
  const progreso = progresoCavos(acciones, paso);
  if (!progreso) return null;
  const contador = t("firmaCavos.contador", { i: String(Math.max(progreso.actual, 1)), n: String(progreso.total) });
  return (
    <div className="hyto-firma-cavos" role="status" aria-live="polite">
      <p>{t(progreso.clave)}</p>
      <p className="hyto-firma-cavos-contador" data-actual={progreso.actual} data-total={progreso.total}>
        <span className="hyto-firma-cavos-puntos" aria-hidden="true">
          {Array.from({ length: progreso.total }, (_, indice) => (
            <i key={indice} data-lleno={indice < progreso.actual ? "si" : "no"} />
          ))}
        </span>
        {progreso.actual > 0 ? <span>{contador}</span> : null}
      </p>
    </div>
  );
}
