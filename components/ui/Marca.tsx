"use client";

import { useEffect, useState } from "react";
import { useTexto } from "@/components/ui/Idioma";
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

/** The slogan, "payout." in the accent. A heading on the landing, a paragraph inside the sign-in dialog. */
export function Eslogan({ como: Etiqueta = "p", className }: { como?: "h1" | "p"; className?: string }) {
  const t = useTexto();
  return (
    <Etiqueta className={["hyto-eslogan", className].filter(Boolean).join(" ")}>
      {t("landing.esloganAntes")} <em>{t("landing.esloganAcento")}</em>
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

/** Letters only. A parenthetical word and any symbol are dropped. One remaining word keeps its first letter; two or more use the first and the last. With no letter left, the email's first letter is the fallback. */
export function iniciales(nombre: string, email?: string | null): string {
  const partes = palabrasConLetras(nombre);
  if (partes.length >= 2) return `${letraDe(partes[0])}${letraDe(partes[partes.length - 1])}`.toUpperCase();
  if (partes.length === 1) return letraDe(partes[0]).toUpperCase();
  const delCorreo = letraDe((email ?? "").split("@")[0] ?? "");
  return delCorreo ? delCorreo.toUpperCase() : "•";
}

function palabrasConLetras(nombre: string): string[] {
  return nombre
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^\p{L}\s]/gu, " ")
    .split(/\s+/)
    .filter((parte) => /\p{L}/u.test(parte));
}

function letraDe(palabra: string): string {
  return palabra.match(/\p{L}/u)?.[0] ?? "";
}

function aplicarTema(tema: "dark" | "light") {
  document.documentElement.dataset.theme = tema;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", tema === "dark" ? "#0E1024" : "#F5F6FA");
}

export function Tema() {
  const t = useTexto();
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
  const etiqueta = oscuro ? t("tema.light") : t("tema.dark");
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
  plus: "M10 4v12M4 10h12",
  calendar: "M4 5.5h12V16H4zM4 9h12M7.5 3.5v3M12.5 3.5v3",
  clock: "M10 4.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM10 7v3.2l2 1.3",
  camera: "M3.5 7h2.6l1.2-1.8h5.4L13.9 7h2.6v8.5h-13zM10 8.6a2.7 2.7 0 1 0 0 5.4 2.7 2.7 0 0 0 0-5.4Z",
};

export function Icono({ nombre, tamano = 18, lleno = false }: { nombre: keyof typeof TRAZOS; tamano?: number; lleno?: boolean }) {
  return (
    <svg width={tamano} height={tamano} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d={TRAZOS[nombre]}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...(lleno ? { fill: "currentColor", fillOpacity: 0.22 } : {})}
      />
    </svg>
  );
}
