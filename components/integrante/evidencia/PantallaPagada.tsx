"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PastillaVeredicto } from "@/components/admin/PastillaVeredicto";
import { useModoDemo } from "@/components/sesion/InsigniaDemo";
import { Mile } from "@/components/ui/Mile";
import { useIdioma, useTexto } from "@/components/ui/Idioma";
import { explicarPago } from "@/lib/integrante/formato";
import { datosRecibo } from "@/lib/integrante/recibo";
import { notaDeTarea } from "@/lib/integrante/nota";
import { clavePagoVisto } from "@/lib/integrante/revision";
import type { Tarea } from "@/lib/integrante/tipos";

/**
 * Calm close after a person approves. The amount and one line. Mile celebrates only here, after a person approved.
 * The first open hides the grade. A later open shows it, already settled.
 */
export function PantallaPagada({ tarea, titulo }: { tarea: Tarea; titulo: string }) {
  const t = useTexto();
  const idioma = useIdioma();
  const demo = useModoDemo();
  const [visto, setVisto] = useState(false);
  const pago = explicarPago(tarea, idioma);
  const corto = pago?.corto ?? "";
  const recibo = datosRecibo(tarea, idioma);
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
      <p className="hyto-estado-pagado">{corto ? t("evidencia.pagadoRecibio", { amount: corto }) : t("evidencia.pagadoSolo")}</p>
      <Mile estado="celebrando" tamano={96} />
      {corto ? <p className="hyto-cierre-monto">{corto}</p> : null}
      {pago?.detalle ? <p className="hyto-tarea-meta">{pago.detalle}</p> : null}
      <p className="hyto-cierre-frase">{t("evidencia.personApproved")}</p>
      <p className="hyto-cierre-frase">{demo ? t("evidencia.demoDatos") : t("evidencia.inBalance")}</p>
      {titulo ? <p className="hyto-tarea-meta">{titulo}</p> : null}
      {visto && calificacion ? <PastillaVeredicto veredicto={calificacion.veredicto} nota={calificacion.nota} /> : null}
      <Recibo bruto={recibo?.bruto ?? corto} neto={corto} tareaId={tarea.id} />
      <div className="hyto-enviada-acciones">
        <Link href="/mis-tareas" className="hyto-btn hyto-btn-grande" onClick={marcarVisto}>
          {t("evidencia.backToTasks")}
        </Link>
      </div>
    </main>
  );
}

/** Task payment is the amount set aside; "You received" is the net. Both carry the US$ symbol. */
function Recibo({ bruto, neto, tareaId }: { bruto: string; neto: string; tareaId: string }) {
  const t = useTexto();
  return (
    <section className="hyto-tarjeta hyto-recibo">
      <div>
        <span>{t("evidencia.taskPayment")}</span>
        <strong>{bruto}</strong>
      </div>
      <div>
        <span>{t("evidencia.youReceived")}</span>
        <strong>{neto}</strong>
      </div>
      <Link className="hyto-recibo-abrir" href={`/tareas/${encodeURIComponent(tareaId)}/recibo`}>
        {t("evidencia.viewReceipt")}
      </Link>
    </section>
  );
}
