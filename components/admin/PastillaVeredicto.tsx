"use client";

import { useLayoutEffect, useRef } from "react";
import type { Veredicto } from "@/lib/admin/tipos";
import { useIdioma } from "@/components/ui/Idioma";
import { etiquetaDesdeNota } from "@/lib/revision/pesos";
import { etiquetaVeredicto, textoNota } from "@/lib/ui/etiquetas";

const CLASE: Record<Veredicto, string> = {
  cumplió: "hyto-pill-ok",
  parcial: "hyto-pill-mid",
  insuficiente: "hyto-pill-bad",
};

/** Used when the stylesheet has not set `--hyto-duracion` yet. Matches 1.2s in globals.css. */
const DURACION_RESPALDO_MS = 1200;

function prefiereQuieto(): boolean {
  if (typeof window.matchMedia !== "function") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function duracionMs(nodo: HTMLElement): number {
  const crudo = getComputedStyle(nodo).getPropertyValue("--hyto-duracion").trim();
  if (crudo.endsWith("ms")) {
    const ms = Number.parseFloat(crudo);
    if (Number.isFinite(ms) && ms > 0) return ms;
  }
  if (crudo.endsWith("s")) {
    const segundos = Number.parseFloat(crudo);
    if (Number.isFinite(segundos) && segundos > 0) return segundos * 1000;
  }
  return DURACION_RESPALDO_MS;
}

/** Ease-out cubic. The pill color uses CSS `ease-out` for the same short move. */
function easeOut(t: number): number {
  const resto = 1 - t;
  return 1 - resto * resto * resto;
}

function escribir(nodo: HTMLElement, valor: number, exacto: boolean) {
  nodo.style.setProperty("--hyto-nota", String(Math.round(valor)));
  nodo.style.setProperty("--hyto-llenado", exacto ? String(valor) : valor.toFixed(2));
}

export function PastillaVeredicto({ veredicto, nota = null }: { veredicto: Veredicto; nota?: number | null }) {
  const idioma = useIdioma();
  const banda = typeof nota === "number" ? etiquetaDesdeNota(nota) : veredicto;
  const etiqueta = etiquetaVeredicto(banda, idioma);
  const texto = textoNota(etiqueta, nota, idioma);
  const destino = typeof nota === "number" && Number.isFinite(nota) ? nota : null;
  const pillRef = useRef<HTMLSpanElement>(null);
  const mostrado = useRef(0);

  useLayoutEffect(() => {
    const nodo = pillRef.current;
    if (!nodo || destino === null) return;
    if (prefiereQuieto()) {
      mostrado.current = destino;
      escribir(nodo, destino, true);
      return;
    }
    const desde = mostrado.current;
    if (desde === destino) {
      escribir(nodo, destino, true);
      return;
    }
    const ms = duracionMs(nodo);
    const inicio = performance.now();
    let reloj = inicio - 1;
    let frame = 0;
    const paso = (ahora: number) => {
      const marca = ahora > reloj ? ahora : reloj + 16;
      reloj = marca;
      const t = Math.min(1, (marca - inicio) / ms);
      const exacto = t >= 1;
      const valor = exacto ? destino : desde + (destino - desde) * easeOut(t);
      mostrado.current = exacto ? destino : valor;
      escribir(nodo, valor, exacto);
      if (!exacto) frame = requestAnimationFrame(paso);
    };
    frame = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(frame);
  }, [destino]);

  const clase = `hyto-pill hyto-pill-veredicto ${CLASE[banda]}`;
  if (destino === null) {
    return (
      <span className={clase}>
        <i className="hyto-dot" aria-hidden="true" />
        {texto}
      </span>
    );
  }

  return (
    <span ref={pillRef} className={`${clase} hyto-pill-con-barra`} role="group" aria-label={texto}>
      <i className="hyto-dot" aria-hidden="true" />
      <span className="hyto-pill-vista" aria-hidden="true" data-etiqueta={etiqueta} />
      <span className="hyto-pill-sr" aria-hidden="true">
        {texto}
      </span>
      <span className="hyto-pill-bar" aria-hidden="true">
        <span />
      </span>
    </span>
  );
}
