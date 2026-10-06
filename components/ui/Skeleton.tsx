import type { CSSProperties } from "react";

/** Placeholder block (`--superficie-3`). No animation. */
export function Skeleton({ ancho = "100%", alto = 16, radio, className }: { ancho?: number | string; alto?: number | string; radio?: number | string; className?: string }) {
  const estilo: CSSProperties = { width: ancho, height: alto, ...(radio !== undefined ? { borderRadius: radio } : {}) };
  return <span className={["hyto-bloque", className].filter(Boolean).join(" ")} style={estilo} aria-hidden="true" />;
}
