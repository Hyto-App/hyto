"use client";

import { useEffect, useState } from "react";
import {
  TRANSFORM_MARCA,
  TRAZO_ISOTIPO,
  TRAZO_PALABRA,
  VIEWBOX_ISOTIPO,
  VIEWBOX_LOGO,
} from "@/components/ui/marca/trazos";

const TEMA_CLAVE = "hyto-tema";

type PropsMarca = { className?: string; title?: string };

/** Official logo: lime isotipo + "hyto" in the text color (all #08090C in light). */
export function Logo({ className, title = "Hyto" }: PropsMarca = {}) {
  return (
    <svg
      className={["hyto-logo", className].filter(Boolean).join(" ")}
      viewBox={VIEWBOX_LOGO}
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      <g transform={TRANSFORM_MARCA}>
        <path className="hyto-logo-iso" d={TRAZO_ISOTIPO} />
        <path d={TRAZO_PALABRA} />
      </g>
    </svg>
  );
}

/** Isotipo alone, for the mobile header, a collapsed sidebar, and icons. */
export function Isotipo({ className, title = "Hyto" }: PropsMarca = {}) {
  return (
    <svg
      className={["hyto-isotipo", className].filter(Boolean).join(" ")}
      viewBox={VIEWBOX_ISOTIPO}
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      <g transform={TRANSFORM_MARCA}>
        <path d={TRAZO_ISOTIPO} />
      </g>
    </svg>
  );
}

/** The slogan, "Get paid." in the accent. A heading on the landing, a paragraph inside the sign-in dialog. */
export function Eslogan({ como: Etiqueta = "p", className }: { como?: "h1" | "p"; className?: string }) {
  return (
    <Etiqueta className={["hyto-eslogan", className].filter(Boolean).join(" ")}>
      Prove your worth. <em>Get paid.</em>
    </Etiqueta>
  );
}

/** Decorative milestone ring from the mockups: one arc done, two milestones reached. */
export function AnilloHitos({ className }: { className?: string }) {
  return (
    <svg className={["hyto-anillo", className].filter(Boolean).join(" ")} viewBox="0 0 170 170" fill="none" aria-hidden="true">
      <circle cx="85" cy="85" r="70" stroke="var(--anillo-pista)" strokeWidth="8" />
      <path d="M85 15a70 70 0 0 1 66 93" stroke="var(--anillo-arco)" strokeWidth="8" strokeLinecap="round" />
      <circle cx="85" cy="15" r="8" fill="var(--anillo-arco)" />
      <circle cx="151" cy="108" r="8" fill="var(--anillo-arco)" />
      <circle cx="44" cy="142" r="6" fill="var(--anillo-pista)" />
      <circle cx="18" cy="70" r="6" fill="var(--anillo-pista)" />
    </svg>
  );
}

export function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "•";
  if (partes.length === 1) return partes[0].slice(0, 1).toUpperCase();
  return `${partes[0][0] ?? ""}${partes[partes.length - 1][0] ?? ""}`.toUpperCase();
}

function aplicarTema(tema: "dark" | "light") {
  document.documentElement.dataset.theme = tema;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", tema === "dark" ? "#08090C" : "#F4F5F0");
}

export function Tema() {
  const [tema, setTema] = useState<"dark" | "light" | null>(null);

  useEffect(() => {
    const guardado = window.localStorage.getItem(TEMA_CLAVE);
    // Dark is the brand default. Light only when the person picked it.
    const siguiente = guardado === "light" ? "light" : "dark";
    aplicarTema(siguiente);
    setTema(siguiente);
  }, []);

  function alternar() {
    const siguiente = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    aplicarTema(siguiente);
    window.localStorage.setItem(TEMA_CLAVE, siguiente);
    setTema(siguiente);
  }

  const oscuro = tema !== "light";
  const etiqueta = oscuro ? "Switch to light theme" : "Switch to dark theme";
  return (
    <button type="button" className="hyto-tema" onClick={alternar} aria-label={etiqueta} title={etiqueta}>
      {oscuro ? <Sol /> : <Luna />}
    </button>
  );
}

function Sol() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" />
    </svg>
  );
}

function Luna() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
    </svg>
  );
}

const TRAZOS: Record<string, string> = {
  inbox: "M3 6.5h14M3 6.5l7 6 7-6M3 6.5V17h14V6.5",
  report: "M4 16V9M10 16V4M16 16v-5",
  projects: "M4 5h12v12H4zM4 8h12",
  tasks: "M5 6h10M5 10h10M5 14h6",
  wallet: "M3 7h14v10H3zM3 10h14M13 13h2",
};

export function Icono({ nombre }: { nombre: keyof typeof TRAZOS }) {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d={TRAZOS[nombre]} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
