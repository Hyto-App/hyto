"use client";

import type { EstadoTarea } from "@/lib/integrante/tipos";
import { useIdioma, useTexto } from "@/components/ui/Idioma";
import type { Clave } from "@/lib/ui/diccionario";
import { etiquetaEstado } from "@/lib/ui/etiquetas";

const CLASE: Record<EstadoTarea, string> = {
  pendiente: "hyto-pill-muted",
  "en revisión": "hyto-pill-mid",
  pagado: "hyto-pill-ok",
};

export function PastillaEstado({ estado }: { estado: EstadoTarea }) {
  const idioma = useIdioma();
  return (
    <span className={`hyto-pill ${CLASE[estado]}`}>
      <i className="hyto-dot" aria-hidden="true" />
      {etiquetaEstado(estado, idioma)}
    </span>
  );
}

const BADGE: Record<EstadoTarea, { clase: string; clave: Clave }> = {
  pendiente: { clase: "hyto-badge-pend", clave: "tareas.badgePending" },
  "en revisión": { clase: "hyto-badge-rev", clave: "tareas.badgeSent" },
  pagado: { clase: "hyto-badge-ok", clave: "tareas.badgePaid" },
};

/** Badge of the volunteer's task card: Pending / Sent / Paid / Rejected. */
export function BadgeTarea({ estado, rechazada = false }: { estado: EstadoTarea; rechazada?: boolean }) {
  const t = useTexto();
  if (rechazada) return <span className="hyto-badge hyto-badge-rej">{t("tareas.badgeRejected")}</span>;
  const { clase, clave } = BADGE[estado];
  return <span className={`hyto-badge ${clase}`}>{t(clave)}</span>;
}
