"use client";

import { useRouter } from "next/navigation";
import { useTexto } from "@/components/ui/Idioma";

type Props = { href?: string; etiqueta?: "volver" | "cancelar"; className?: string };

/** "‹ Back" / "‹ Cancel". Goes back inside the app when there is history, else to `href`. */
export function Volver({ href = "/mis-tareas", etiqueta = "volver", className }: Props) {
  const t = useTexto();
  const router = useRouter();

  function ir() {
    const interno = typeof document !== "undefined" && document.referrer !== "" && new URL(document.referrer).origin === window.location.origin;
    if (interno && window.history.length > 1) router.back();
    else router.push(href);
  }

  return (
    <button type="button" className={["hyto-volver", className].filter(Boolean).join(" ")} onClick={ir}>
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="m12 4-6 6 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span>{t(etiqueta === "cancelar" ? "nav.cancel" : "nav.back")}</span>
    </button>
  );
}
