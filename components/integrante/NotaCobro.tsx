"use client";

import { useIdioma, useTexto } from "@/components/ui/Idioma";
import { montosDeCobro } from "@/lib/integrante/formato";
import type { Tarea } from "@/lib/integrante/tipos";

type Campos = Pick<Tarea, "tipo" | "monto" | "tope" | "montoConfirmado" | "montoRevisado">;

/** Mile's reading next to the amount that can be paid. The protocol fee stays out of this line. */
export function NotaCobro({ tarea }: { tarea: Campos }) {
  const t = useTexto();
  const idioma = useIdioma();
  const montos = montosDeCobro(tarea, idioma);
  if (!montos) return null;
  return (
    <p className="hyto-nota-cobro text-sm leading-6 text-[var(--suave)]">
      {montos.leido === montos.pago
        ? t("evidencia.mileReadSame", { monto: montos.leido })
        : t("evidencia.mileReadPay", { leido: montos.leido, pago: montos.pago })}
    </p>
  );
}
