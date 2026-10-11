"use client";

import { useEffect, useId, useRef } from "react";
import { useTexto } from "@/components/ui/Idioma";
import type { Clave } from "@/lib/ui/diccionario";
import { conDetalle, desplazarOjos, estadoMile, type EstadoMile, type EstadoMileEntrada } from "@/lib/ui/mile";

export type { EstadoMile, EstadoMileEntrada };

const ALT: Record<EstadoMile, Clave> = {
  reposo: "mile.alt.descansando",
  mirando: "mile.alt.mirando",
  leyendo: "mile.alt.buscando",
  listo: "mile.alt.laTengo",
  recomendando: "mile.alt.recomendando",
  celebrando: "mile.alt.caraFeliz",
  preocupada: "mile.alt.rechazado",
};

// Body outline of the approved mile.svg, smoothed: same silhouette with far fewer points.
const CUERPO =
  "M36.5,-119.3 C28,-122 19,-118 19.3,-107 C19.5,-95 28,-82 40.5,-67.3 C46,-60 50,-55 54.6,-49.9 L125,0 L54.6,49.9 L0,125 L-54.6,49.9 L-125,0 L-54.6,-49.9 C-50,-55 -40,-68 -30.3,-83.5 C-20,-100 -10,-111 -3,-119.7 C6,-126 14,-128 20.5,-128.7 C30,-128 34,-123 36.5,-119.3 Z";
const DESTELLO = "M0,-125 Q42,-42 125,0 Q42,42 0,125 Q-42,42 -125,0 Q-42,-42 0,-125 Z";

type Props = {
  estado: EstadoMileEntrada;
  tamano?: number;
  /** Accessible text. Without it Mile is decorative (aria-hidden). Pass `true` for the default text of the state. */
  etiqueta?: string | true;
  className?: string;
};

/** Mile, inline SVG. Layers are classes and the ids carry a useId prefix, so several instances never collide. Theme and motion live in mile.css. */
export function Mile({ estado: entrada, tamano = 120, etiqueta, className }: Props) {
  const t = useTexto();
  const base = `mile${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const estado = estadoMile(entrada);
  const alt = etiqueta === true ? t(ALT[estado]) : (etiqueta ?? "");
  const decorativo = alt === "";
  const nivel = Math.max(24, tamano);
  const detalle = conDetalle(nivel);
  const ojos = useRef<SVGGElement>(null);
  const svg = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (estado !== "mirando") return;
    const nodo = ojos.current;
    const caja = svg.current;
    if (!nodo || !caja || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const alMover = (e: PointerEvent) => {
      const r = caja.getBoundingClientRect();
      const { x, y } = desplazarOjos(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2));
      nodo.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    };
    window.addEventListener("pointermove", alMover, { passive: true });
    return () => {
      window.removeEventListener("pointermove", alMover);
      nodo.style.transform = "";
    };
  }, [estado]);

  const izq = `${base}-ojo-izq`;
  const der = `${base}-ojo-der`;
  const forma = `${base}-destello`;
  return (
    <span
      className={["hyto-mile", `hyto-mile-${estado}`, className].filter(Boolean).join(" ")}
      style={{ width: nivel, height: nivel }}
      {...(decorativo ? { "aria-hidden": true } : {})}
    >
      <svg
        key={estado}
        ref={svg}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="-180 -190 360 380"
        width={nivel}
        height={nivel}
        className="mile"
        data-mile={estado}
        {...(decorativo ? { "aria-hidden": true, focusable: false } : { role: "img", "aria-label": alt })}
      >
        <defs>
          <path id={forma} d={DESTELLO} />
          <clipPath id={izq}>
            <rect x="-36" y="-27" width="22" height="50" rx="11" />
          </clipPath>
          <clipPath id={der}>
            <rect x="32" y="-27" width="22" height="50" rx="11" />
          </clipPath>
        </defs>
        {detalle ? <ellipse className="mile-sombra" cx="0" cy="168" rx="70" ry="9" fill="#000" opacity=".28" /> : null}
        <g className="mile-raiz">
          <g className="mile-cuerpo-grupo">
            <path d={CUERPO} fill="none" stroke="var(--mile-contorno, transparent)" strokeWidth="30" strokeLinejoin="round" />
            <path d={CUERPO} fill="#B7EE34" stroke="#B7EE34" strokeWidth="22" strokeLinejoin="round" />
            <g className="mile-sello">
              <circle cx="-72" cy="28" r="17" fill="none" stroke="#8CC21C" strokeWidth="3.5" />
              <g transform="translate(-73 29) scale(0.5)" fill="#8CC21C" stroke="#8CC21C" strokeWidth="4" strokeLinejoin="round">
                <polygon points="-3.4,-16.0 5.6,-16.0 -7.0,14.0 -16.0,14.0" />
                <polygon points="10.7,-9.0 19.7,-9.0 10.0,14.0 1.0,14.0" />
              </g>
            </g>
            <g className="mile-cara">
              <g ref={ojos} className="mile-ojos">
                <g className="mile-ojos-abiertos">
                  <rect x="-36" y="-27" width="22" height="50" rx="11" fill="#14162B" />
                  <rect x="32" y="-27" width="22" height="50" rx="11" fill="#14162B" />
                </g>
                <g className="mile-ojos-felices">
                  <path d="M-52,6 Q-34,-34 -16,6" fill="none" stroke="#14162B" strokeWidth="12" strokeLinecap="round" />
                  <path d="M16,6 Q34,-34 52,6" fill="none" stroke="#14162B" strokeWidth="12" strokeLinecap="round" />
                </g>
                <g className="mile-ojos-preocupados">
                  <polygon points="-43.5,-3.9 -28.6,-15.1 -28.5,10 -36,17.5 -43.5,10" fill="#14162B" stroke="#14162B" strokeWidth="7" strokeLinejoin="round" />
                  <polygon points="28.6,-15.1 43.5,-3.9 43.5,10 36,17.5 28.5,10" fill="#14162B" stroke="#14162B" strokeWidth="7" strokeLinejoin="round" />
                </g>
              </g>
              <g className="mile-parpados">
                <g clipPath={`url(#${izq})`}>
                  <rect className="mile-parpado" x="-40" y="-31" width="30" height="58" fill="#B7EE34" />
                </g>
                <g clipPath={`url(#${der})`}>
                  <rect className="mile-parpado" x="28" y="-31" width="30" height="58" fill="#B7EE34" />
                </g>
              </g>
              <path className="mile-boca" d="M-8,42 Q2,52 12,42" fill="none" stroke="#14162B" strokeWidth="7" strokeLinecap="round" />
            </g>
          </g>
          <path className="mile-check" d="M78,-92 L94,-76 L124,-112" fill="none" stroke="#14162B" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" />
          <g className="mile-chispas" fill="#FA0560">
            <circle cx="-120" cy="-110" r="7" />
            <circle cx="140" cy="-70" r="6" />
            <circle cx="-140" cy="60" r="5" />
            <circle cx="120" cy="100" r="7" />
          </g>
        </g>
        {detalle ? (
          <g className="mile-destello">
            <g transform="translate(132 -120) rotate(10) scale(0.13)">
              <use href={`#${forma}`} fill="#FA0560" stroke="#FA0560" strokeWidth="22" strokeLinejoin="round" />
            </g>
          </g>
        ) : null}
      </svg>
    </span>
  );
}
