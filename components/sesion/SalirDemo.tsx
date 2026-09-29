"use client";

import { useState } from "react";
import { useModoDemo } from "@/components/sesion/InsigniaDemo";

export function SalirDemo() {
  const activo = useModoDemo();
  const [saliendo, setSaliendo] = useState(false);
  if (!activo) return null;

  async function salir() {
    if (saliendo) return;
    setSaliendo(true);
    try {
      await fetch("/api/sesion", { method: "DELETE" });
    } finally {
      window.location.reload();
    }
  }

  return (
    <button
      type="button"
      onClick={() => void salir()}
      disabled={saliendo}
      className="ml-3 align-middle text-sm text-[var(--suave)] underline-offset-2 hover:underline disabled:opacity-70"
    >
      {saliendo ? "Saliendo…" : "Salir del demo"}
    </button>
  );
}
