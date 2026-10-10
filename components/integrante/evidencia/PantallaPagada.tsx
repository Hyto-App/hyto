"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PastillaVeredicto } from "@/components/admin/PastillaVeredicto";
import { useModoDemo } from "@/components/sesion/InsigniaDemo";
import { Mile } from "@/components/ui/Mile";
import { useIdioma, useTexto } from "@/components/ui/Idioma";
import { explicarPago } from "@/lib/integrante/formato";
import { notaDeTarea } from "@/lib/integrante/nota";
import { clavePagoVisto } from "@/lib/integrante/revision";
import type { Tarea } from "@/lib/integrante/tipos";

/**
 * Calm close after a person approves. The amount and one line. Mile rests.
 * The first open hides the grade. A later open shows it, already settled.
 */
export function PantallaPagada({ tarea, titulo }: { tarea: Tarea; titulo: string }) {
  const t = useTexto();
  const idioma = useIdioma();
  const demo = useModoDemo();
  const [visto, setVisto] = useState(false);
  const pago = explicarPago(tarea, idioma);
  const monto = pago?.frase ?? "";
  const corto = pago?.corto ?? "";
  const calificacion = notaDeTarea(tarea);

  useEffect(() => {
    setVisto(window.localStorage.getItem(clavePagoVisto(tarea.id)) === "1");
  }, [tarea.id]);

  function marcarVisto() {
    window.localStorage.setItem(clavePagoVisto(tarea.id), "1");
    setVisto(true);
  }

  return (
    <main className="hyto-page hyto-pagada hyto-cierre hyto-asentado">
      <Mile estado="descansando" tamano={96} />
      {corto ? <p className="hyto-cierre-monto">{corto}</p> : null}
      {monto && monto !== corto ? <p className="hyto-tarea-meta">{monto}</p> : null}
      <p className="hyto-cierre-frase">{t("evidencia.personApproved")}</p>
      <p className="hyto-cierre-frase">{demo ? t("evidencia.practiceNetwork") : t("evidencia.inBalance")}</p>
      {titulo ? <p className="hyto-tarea-meta">{titulo}</p> : null}
      {visto && calificacion ? <PastillaVeredicto veredicto={calificacion.veredicto} nota={calificacion.nota} /> : null}
      <Recibo monto={monto} tareaId={tarea.id} />
      <div className="hyto-enviada-acciones">
        <Link href="/mis-tareas" className="hyto-btn hyto-btn-grande" onClick={marcarVisto}>
          {t("evidencia.backToTasks")}
        </Link>
      </div>
    </main>
  );
}

function Recibo({ monto, tareaId }: { monto: string; tareaId: string }) {
  const t = useTexto();
  return (
    <section className="hyto-tarjeta hyto-recibo">
      <div>
        <span>{t("evidencia.taskPayment")}</span>
        <strong>{monto}</strong>
      </div>
      <div>
        <span>{t("evidencia.youReceived")}</span>
        <strong>{monto}</strong>
      </div>
      <Link className="hyto-recibo-abrir" href={`/tareas/${encodeURIComponent(tareaId)}/recibo`}>
        {t("evidencia.viewReceipt")}
      </Link>
    </section>
  );
}
