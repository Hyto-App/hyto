"use client";

import { useTexto } from "@/components/ui/Idioma";
import type { Clave } from "@/lib/ui/diccionario";
import { conHalo, rutaMile, type EstadoMile } from "@/lib/ui/mile";

export type { EstadoMile };

const ALT: Record<EstadoMile, Clave> = {
  descansando: "mile.alt.descansando",
  buscando: "mile.alt.buscando",
  "la-tengo": "mile.alt.laTengo",
  rechazado: "mile.alt.rechazado",
  icono: "mile.alt.icono",
  "cara-neutra": "mile.alt.caraNeutra",
  "cara-feliz": "mile.alt.caraFeliz",
};

type Props = {
  estado: EstadoMile;
  tamano?: number;
  halo?: boolean;
  /** Accessible text. Without it Mile is decorative (aria-hidden). Pass `true` for the default text of the state. */
  etiqueta?: string | true;
  className?: string;
};

/** Mile, static SVG per state. Both themes are rendered; CSS shows the one that matches `<html data-theme>`. */
export function Mile({ estado, tamano = 120, halo, etiqueta, className }: Props) {
  const t = useTexto();
  const alt = etiqueta === true ? t(ALT[estado]) : (etiqueta ?? "");
  const decorativo = alt === "";
  const nivel = Math.max(24, tamano);
  return (
    <span
      className={["hyto-mile", `hyto-mile-${estado}`, conHalo(nivel, halo) ? "hyto-mile-halo" : "", className].filter(Boolean).join(" ")}
      style={{ width: nivel, height: nivel }}
      {...(decorativo ? { "aria-hidden": true } : {})}
    >
      {(["dark", "light"] as const).map((tema) => (
        <img
          key={tema}
          src={rutaMile(estado, tema)}
          alt={decorativo || tema === "light" ? "" : alt}
          {...(!decorativo && tema === "light" ? { "aria-hidden": true } : {})}
          width={nivel}
          height={nivel}
          className={tema === "dark" ? "hyto-mile-oscuro" : "hyto-mile-claro"}
          draggable={false}
        />
      ))}
    </span>
  );
}
