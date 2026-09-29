"use client";

import { createContext, useContext, type ReactNode } from "react";

const Contexto = createContext(false);

export function ProveedorModoDemo({ activo, children }: { activo: boolean; children: ReactNode }) {
  return <Contexto.Provider value={activo}>{children}</Contexto.Provider>;
}

export function InsigniaDemo() {
  const activo = useContext(Contexto);
  if (!activo) return null;
  return (
    <span className="ml-2 inline-flex items-center rounded-full border border-[var(--linea)] px-2 py-0.5 align-middle text-xs font-medium text-[var(--suave)]">
      Modo demo
    </span>
  );
}

export function useModoDemo(): boolean {
  return useContext(Contexto);
}
