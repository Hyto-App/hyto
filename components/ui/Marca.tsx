"use client";

import { useEffect, useState } from "react";

const TEMA_CLAVE = "hyto-tema";

export function Logo() {
  return (
    <span className="hyto-logo">
      <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="currentColor" d="M13.4 1.2 3.6 13.4h6.4l-.8 9.4 10.2-12.6h-6.6L13.4 1.2Z" />
      </svg>
      hyto
    </span>
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
  if (meta) meta.setAttribute("content", tema === "dark" ? "#0B0C12" : "#F4F5F0");
}

export function Tema() {
  const [tema, setTema] = useState<"dark" | "light" | null>(null);

  useEffect(() => {
    const guardado = window.localStorage.getItem(TEMA_CLAVE);
    const oscuro = typeof window.matchMedia === "function" && window.matchMedia("(prefers-color-scheme: dark)").matches;
    const siguiente = guardado === "dark" || guardado === "light" ? guardado : oscuro ? "dark" : "light";
    aplicarTema(siguiente);
    setTema(siguiente);
  }, []);

  function alternar() {
    const siguiente = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    aplicarTema(siguiente);
    window.localStorage.setItem(TEMA_CLAVE, siguiente);
    setTema(siguiente);
  }

  return (
    <button type="button" className="hyto-tema" onClick={alternar} aria-label={tema === "dark" ? "Switch to light theme" : "Switch to dark theme"}>
      {tema === "dark" ? "Light" : "Dark"}
    </button>
  );
}

const TRAZOS: Record<string, string> = {
  inbox: "M3 6.5h14M3 6.5l7 6 7-6M3 6.5V17h14V6.5",
  report: "M4 16V9M10 16V4M16 16v-5",
  projects: "M4 5h12v12H4zM4 8h12",
  tasks: "M5 6h10M5 10h10M5 14h6",
  wallet: "M3 7h14v10H3zM3 10h14M13 13h2",
  join: "M10 4v8M6 8h8M4 16h12",
};

export function Icono({ nombre }: { nombre: keyof typeof TRAZOS }) {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d={TRAZOS[nombre]} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
