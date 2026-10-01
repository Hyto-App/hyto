"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { RolDemo } from "@/lib/sesion/demo";

type EstadoDemo = {
  activo: boolean;
  rol: RolDemo | null;
};

const Contexto = createContext<EstadoDemo>({ activo: false, rol: null });

export function ProveedorModoDemo({
  activo,
  rol = null,
  children,
}: {
  activo: boolean;
  rol?: RolDemo | null;
  children: ReactNode;
}) {
  return <Contexto.Provider value={{ activo, rol: activo ? (rol ?? null) : null }}>{children}</Contexto.Provider>;
}

export function InsigniaDemo() {
  const { activo } = useContext(Contexto);
  if (!activo) return null;
  return (
    <span className="ml-2 inline-flex items-center rounded-full bg-[var(--acento)] px-2 py-0.5 align-middle text-xs font-semibold text-[var(--sobre-acento)]">
      Demo mode
    </span>
  );
}

export function useModoDemo(): boolean {
  return useContext(Contexto).activo;
}

export function useRolDemo(): RolDemo | null {
  return useContext(Contexto).rol;
}
