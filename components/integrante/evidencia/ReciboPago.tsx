"use client";

import Link from "next/link";
import { EnlaceExplorador } from "@/components/ui/EnlaceExplorador";
import { useIdioma, useTexto } from "@/components/ui/Idioma";
import { datosRecibo } from "@/lib/integrante/recibo";
import type { Tarea } from "@/lib/integrante/tipos";
import { textoVisible } from "@/lib/ui/etiquetas";

export function ReciboPago({ tarea }: { tarea: Tarea }) {
  const t = useTexto();
  const idioma = useIdioma();
  const datos = datosRecibo(tarea, idioma);
  const volver = (
    <Link href={`/tareas/${encodeURIComponent(tarea.id)}`} className="hyto-btn-line is-inline px-5">
      {t("evidencia.receiptBack")}
    </Link>
  );

  if (tarea.estado !== "pagado") {
    return (
      <main className="hyto-page hyto-recibo-pagina">
        <h1>{t("evidencia.receiptTitle")}</h1>
        <p className="text-sm leading-6 text-[var(--suave)]">{t("evidencia.receiptNotPaid")}</p>
        {volver}
      </main>
    );
  }

  if (!datos) {
    return (
      <main className="hyto-page hyto-recibo-pagina">
        <h1>{t("evidencia.receiptTitle")}</h1>
        <p className="text-sm leading-6 text-[var(--suave)]">{t("evidencia.receiptMissing")}</p>
        {volver}
      </main>
    );
  }

  const filas = [
    { etiqueta: t("evidencia.youReceived"), valor: datos.neto, lima: true },
    { etiqueta: t("evidencia.setAside"), valor: datos.bruto, lima: false },
    { etiqueta: t("evidencia.fee"), valor: datos.comision, lima: false },
    { etiqueta: t("comunes.date"), valor: datos.fecha ?? "—", lima: false },
    { etiqueta: t("titulos.task"), valor: textoVisible(datos.tarea, idioma), lima: false },
    { etiqueta: t("comunes.event"), valor: datos.evento ? textoVisible(datos.evento, idioma) : "—", lima: false },
  ];

  return (
    <main className="hyto-page hyto-recibo-pagina">
      <h1>{t("evidencia.receiptTitle")}</h1>
      <p className="hyto-recibo-neto">{datos.neto}</p>
      <p className="text-sm text-[var(--suave)]">{t("evidencia.youReceived")}</p>
      <section className="hyto-tarjeta hyto-recibo">
        {filas.map((fila) => (
          <div key={fila.etiqueta}>
            <span>{fila.etiqueta}</span>
            <strong className={fila.lima ? "hyto-recibo-lima" : undefined}>{fila.valor}</strong>
          </div>
        ))}
      </section>
      {datos.red ? (
        <p className="hyto-recibo-red">
          {t("evidencia.networkNote")}{" "}
          <EnlaceExplorador href={datos.red}>{t("pago.viewChain")}</EnlaceExplorador>
        </p>
      ) : null}
      {volver}
    </main>
  );
}
