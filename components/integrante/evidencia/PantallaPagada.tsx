"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ActividadTarea } from "@/components/integrante/ActividadTarea";
import { LineaRevision } from "@/components/integrante/evidencia/LineaRevision";
import { MileAnimada } from "@/components/ui/MileAnimada";
import { useTexto } from "@/components/ui/Idioma";
import { enlacePago } from "@/lib/admin/vista";
import { clavePagoVisto, montoUsdc } from "@/lib/integrante/revision";
import type { Tarea } from "@/lib/integrante/tipos";

/**
 * Paid screen (spec §7.5). The first open is the hero. Later opens are the summary.
 * The figure is the amount released to the wallet. A fee breakdown stays out of this screen.
 */
export function PantallaPagada({ tarea, titulo }: { tarea: Tarea; titulo: string }) {
  const t = useTexto();
  const [visto, setVisto] = useState<boolean | null>(null);
  const monto = montoUsdc(tarea);
  const nombre = tarea.organizador?.nombre?.trim() || "";
  const comprobante = enlacePago(tarea.hashPago);

  useEffect(() => {
    setVisto(window.localStorage.getItem(clavePagoVisto(tarea.id)) === "1");
  }, [tarea.id]);

  function marcarVisto() {
    window.localStorage.setItem(clavePagoVisto(tarea.id), "1");
    setVisto(true);
  }

  if (visto === null) {
    return (
      <main className="hyto-page">
        <p className="text-[var(--suave)]">{t("comunes.loading")}</p>
      </main>
    );
  }

  if (visto) {
    return (
      <main className="hyto-page hyto-tarea hyto-enviada">
        <header className="hyto-enviada-cab">
          <MileAnimada estado="lo-tengo" tamano={96} />
          <h1 className="hyto-tarea-titulo">{t("evidencia.youGotPaid")}</h1>
          <p className="hyto-tarea-meta">{t("evidencia.paidFor", { title: titulo })}</p>
        </header>
        <Recibo monto={monto} comprobante={comprobante} />
        <LineaRevision tarea={tarea} revisionCerrada monto={`${monto} USDC`} />
        <ActividadTarea tarea={tarea} />
        <div className="hyto-enviada-acciones">
          <Link href="/configuracion" className="hyto-btn hyto-btn-grande">
            {t("evidencia.viewWallet")}
          </Link>
          <Link href="/mis-tareas" className="hyto-btn-line">
            {t("evidencia.keepGoing")}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="hyto-page hyto-pagada">
      <Link href="/mis-tareas" className="hyto-pagada-cerrar" aria-label={t("evidencia.closePaid")} onClick={marcarVisto}>
        ✕
      </Link>
      <div className="hyto-solo-movil">
        <MileAnimada estado="pagado" tamano={190} />
      </div>
      <div className="hyto-solo-escritorio">
        <MileAnimada estado="pagado" tamano={220} />
      </div>
      <p className="hyto-burbuja">{nombre ? t("evidencia.youDidIt", { name: nombre }) : t("evidencia.youDidItNoName")}</p>
      <p className="hyto-pagada-kicker">{t("evidencia.youGotPaid")}</p>
      <p className="hyto-pagada-monto">+{monto} USDC</p>
      <p className="hyto-tarea-meta">{t("evidencia.paidFor", { title: titulo })}</p>
      <Recibo monto={monto} comprobante={comprobante} />
      <ActividadTarea tarea={tarea} />
      <div className="hyto-enviada-acciones">
        <Link href="/configuracion" className="hyto-btn hyto-btn-grande" onClick={marcarVisto}>
          {t("evidencia.viewWallet")}
        </Link>
        <Link href="/mis-tareas" className="hyto-btn-line" onClick={marcarVisto}>
          {t("evidencia.keepGoing")}
        </Link>
      </div>
    </main>
  );
}

function Recibo({ monto, comprobante }: { monto: string; comprobante: string | null }) {
  const t = useTexto();
  return (
    <section className="hyto-tarjeta hyto-recibo">
      <div>
        <span>{t("evidencia.taskPayment")}</span>
        <strong>{monto} USDC</strong>
      </div>
      <div>
        <span>{t("evidencia.youReceived")}</span>
        <strong className="hyto-recibo-lima">{monto} USDC</strong>
      </div>
      {comprobante ? (
        <a href={comprobante} target="_blank" rel="noreferrer">
          {t("evidencia.viewReceipt")}
        </a>
      ) : null}
    </section>
  );
}
