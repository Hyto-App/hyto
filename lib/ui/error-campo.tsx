"use client";

import { useEffect } from "react";

/** A field error: the message belongs to that control, and the control receives focus. */
export type ErrorCampo = { id: string; mensaje: string };

export function useEnfocarError(error: ErrorCampo | null): void {
  const id = error?.id ?? null;
  const mensaje = error?.mensaje ?? null;
  useEffect(() => {
    if (!id) return;
    const nodo = document.getElementById(id);
    if (nodo instanceof HTMLElement) nodo.focus();
  }, [id, mensaje]);
}

export function propsError(
  error: ErrorCampo | null,
  id: string,
  ayuda?: string,
): { "aria-invalid"?: true; "aria-describedby"?: string } {
  const propio = error?.id === id;
  const descrito = [ayuda, propio ? `${id}-error` : undefined].filter(Boolean).join(" ");
  return {
    ...(propio ? { "aria-invalid": true as const } : {}),
    ...(descrito ? { "aria-describedby": descrito } : {}),
  };
}

export function AvisoCampo({ id, mensaje }: { id: string; mensaje: string | null }) {
  if (!mensaje) return null;
  return (
    <p id={id} role="alert" className="mt-2 text-sm text-[var(--peligro)]">
      {mensaje}
    </p>
  );
}
