"use client";

import type { ReactNode } from "react";
import { PastillaVeredicto } from "@/components/admin/PastillaVeredicto";
import { Mile } from "@/components/ui/Mile";
import { useTexto } from "@/components/ui/Idioma";
import { notaDeTarea } from "@/lib/integrante/nota";
import { abreviarNota, estaRechazada } from "@/lib/integrante/revision";
import type { Tarea } from "@/lib/integrante/tipos";

type Paso = "hecho" | "ahora" | "despues";

type TareaLinea = Pick<Tarea, "estado" | "nota" | "veredicto" | "rechazada" | "rechazo" | "intentos" | "organizador">;

/**
 * "What happens now". Only the volunteer's own data decides each step.
 * `revisionCerrada`: waiting is over (also covers a failed AI review: the organizer decides).
 * `mileSinTerminar`: the wait ended and the latest photo still has no grade, so Mile is not checked off.
 */
export function LineaRevision({
  tarea,
  revisionCerrada,
  monto,
  mileSinTerminar = false,
}: {
  tarea: TareaLinea;
  revisionCerrada: boolean;
  monto: string;
  mileSinTerminar?: boolean;
}) {
  const t = useTexto();
  const calificacion = notaDeTarea(tarea);
  const pagado = tarea.estado === "pagado";
  const rechazada = estaRechazada(tarea);
  const revisada = !mileSinTerminar && (calificacion !== null || revisionCerrada || pagado || rechazada);
  const nombre = tarea.organizador?.nombre?.trim() || "";
  const intento = (tarea.intentos ?? 0) > 1 ? t("evidencia.attempt", { n: tarea.intentos ?? 0 }) : null;
  const notaCorta = tarea.rechazo?.nota ? abreviarNota(tarea.rechazo.nota) : null;

  const detalleMile: ReactNode[] = [];
  if (calificacion) detalleMile.push(<PastillaVeredicto key="nota" veredicto={calificacion.veredicto} nota={calificacion.nota} />);
  if (intento) detalleMile.push(<span key="intento">{intento}</span>);

  const pasos: { clave: string; estado: Paso; titulo: string; rosa?: boolean; detalle?: ReactNode }[] = [
    {
      clave: "mile",
      estado: mileSinTerminar ? "ahora" : revisada ? "hecho" : "ahora",
      rosa: mileSinTerminar,
      titulo: mileSinTerminar ? t("evidencia.mileCouldntFinish") : t("evidencia.stepMile"),
      detalle: detalleMile.length > 0 ? <>{detalleMile}</> : undefined,
    },
    rechazada
      ? {
          clave: "rechazo",
          estado: "ahora",
          rosa: true,
          titulo: t("evidencia.askedAnother"),
          detalle: notaCorta ? <span>{notaCorta}</span> : undefined,
        }
      : {
          clave: "organizador",
          estado: pagado ? "hecho" : revisada ? "ahora" : "despues",
          titulo: nombre ? t("evidencia.stepOrganizerName", { name: nombre }) : t("evidencia.stepOrganizer"),
        },
    {
      clave: "pago",
      estado: pagado ? "hecho" : "despues",
      titulo: t("evidencia.stepPay"),
      detalle: <span>{t("evidencia.stepPayAmount", { amount: monto })}</span>,
    },
  ];

  return (
    <section className="hyto-tarjeta hyto-linea" aria-labelledby="hyto-linea-titulo">
      <h2 id="hyto-linea-titulo">{t("evidencia.whatNow")}</h2>
      <ol>
        {pasos.map((paso, indice) => (
          <li
            key={paso.clave}
            className={`hyto-paso hyto-paso-${paso.estado}${paso.rosa ? " hyto-paso-rechazo" : ""}`}
            aria-current={paso.estado === "ahora" ? "step" : undefined}
          >
            <span className="hyto-paso-marca" aria-hidden="true">
              {paso.rosa ? "✗" : paso.estado === "hecho" ? "✓" : paso.estado === "ahora" && paso.clave === "mile" ? <Mile estado="buscando" tamano={28} halo={false} /> : indice + 1}
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
