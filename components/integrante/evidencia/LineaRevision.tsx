"use client";

import type { ReactNode } from "react";
import { PastillaVeredicto } from "@/components/admin/PastillaVeredicto";
import { Mile } from "@/components/ui/Mile";
import { useTexto } from "@/components/ui/Idioma";
import { notaDeTarea } from "@/lib/integrante/nota";
import type { Tarea } from "@/lib/integrante/tipos";

type Paso = "hecho" | "ahora" | "despues";

/**
 * "What happens now" (spec §6.6, §7.4). Only the volunteer's own data decides each step.
 * `revisionCerrada`: the 30 s of waiting are over (also covers a failed AI review: the organizer decides).
 */
export function LineaRevision({ tarea, revisionCerrada, monto }: { tarea: Pick<Tarea, "estado" | "nota">; revisionCerrada: boolean; monto: string }) {
  const t = useTexto();
  const calificacion = notaDeTarea(tarea);
  const pagado = tarea.estado === "pagado";
  const revisada = calificacion !== null || revisionCerrada || pagado;
  const pasos: { clave: string; estado: Paso; titulo: string; detalle?: ReactNode }[] = [
    {
      clave: "mile",
      estado: revisada ? "hecho" : "ahora",
      titulo: t("evidencia.stepMile"),
      detalle: calificacion ? <PastillaVeredicto veredicto={calificacion.veredicto} nota={calificacion.nota} /> : undefined,
    },
    { clave: "organizador", estado: pagado ? "hecho" : revisada ? "ahora" : "despues", titulo: t("evidencia.stepOrganizer") },
    { clave: "pago", estado: pagado ? "hecho" : "despues", titulo: t("evidencia.stepPay"), detalle: <span>{t("evidencia.stepPayAmount", { amount: monto })}</span> },
  ];
  return (
    <section className="hyto-tarjeta hyto-linea" aria-labelledby="hyto-linea-titulo">
      <h2 id="hyto-linea-titulo">{t("evidencia.whatNow")}</h2>
      <ol>
        {pasos.map((paso, indice) => (
          <li key={paso.clave} className={`hyto-paso hyto-paso-${paso.estado}`} aria-current={paso.estado === "ahora" ? "step" : undefined}>
            <span className="hyto-paso-marca" aria-hidden="true">
              {paso.estado === "hecho" ? "✓" : paso.estado === "ahora" && paso.clave === "mile" ? <Mile estado="buscando" tamano={28} halo={false} /> : indice + 1}
            </span>
            <span className="hyto-paso-texto">
              <strong>{paso.titulo}</strong>
              {paso.estado === "ahora" ? <em className="hyto-paso-ahora">{t("evidencia.now")}</em> : null}
              {paso.detalle ? <span className="hyto-paso-detalle">{paso.detalle}</span> : null}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
