"use client";

import { useIdioma, useTexto } from "@/components/ui/Idioma";
import { formatearFecha } from "@/lib/integrante/formato";
import { lineaMontoMile } from "@/lib/ui/monto-mile";

/** Mile's amount on top. The printed total and the rate stay collapsed. */
export function MontoMile({
  impreso,
  moneda,
  montoUsd,
  tasa,
  fecha,
  fechaImpresa,
}: {
  impreso?: string | null;
  moneda?: string | null;
  montoUsd?: string | null;
  tasa?: number | null;
  fecha?: string | null;
  fechaImpresa?: string | null;
}) {
  const t = useTexto();
  const idioma = useIdioma();
  const linea = lineaMontoMile({ montoOriginal: impreso, moneda, montoUsd }, idioma);
  const tasaTexto =
    impreso && moneda && moneda !== "USD"
      ? montoUsd && tasa
        ? t("revision.printedConverted", { monto: impreso, tasa: String(tasa), moneda })
        : t("revision.printedNotConverted", { monto: impreso })
      : null;
  const fechaRara = !fecha && fechaImpresa ? t("revision.printedDate", { fecha: fechaImpresa }) : null;
  if (!linea && !fecha && !tasaTexto && !fechaRara) return null;

  return (
    <div className="mt-6">
      {linea ? (
        <>
          <p className="text-sm text-[var(--suave)]">{t("revision.amountReceipt")}</p>
          <p className="hyto-amount mt-1 text-xl">{linea}</p>
        </>
      ) : null}
      <p className="mt-2 text-sm text-[var(--suave)]">
        {t("comunes.date")} {fecha ? formatearFecha(fecha, idioma) : t("revision.notShown")}
      </p>
      {tasaTexto || fechaRara ? (
        <details className="hyto-mile-mas mt-2">
          <summary>{t("revision.amountDetails")}</summary>
          {tasaTexto ? <p className="mt-2 text-sm leading-6 text-[var(--suave)]">{tasaTexto}</p> : null}
          {fechaRara ? <p className="mt-2 text-sm leading-6 text-[var(--suave)]">{fechaRara}</p> : null}
        </details>
      ) : null}
    </div>
  );
}
