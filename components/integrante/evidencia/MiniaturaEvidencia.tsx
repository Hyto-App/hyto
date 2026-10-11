"use client";

import { useState } from "react";

/**
 * The small picture on the result card. A photo shows as an image. A PDF, a text list, a missing file,
 * or an image that fails to load shows a clean file icon instead of a broken image with cut-off alt text.
 */
export function MiniaturaEvidencia({ src, documento, etiqueta }: { src: string | null; documento: boolean; etiqueta: string }) {
  const [fallo, setFallo] = useState(false);
  if (src && !documento && !fallo) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={etiqueta} onError={() => setFallo(true)} />;
  }
  return (
    <span className="hyto-resumen-icono" role="img" aria-label={etiqueta}>
      <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
        <path d="M14 3v5h5" />
        <path d="M9 13h6M9 17h4" />
      </svg>
    </span>
  );
}
