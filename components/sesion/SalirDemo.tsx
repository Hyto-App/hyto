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
      className="hyto-btn-danger"
    >
      {saliendo ? "Leaving…" : "Leave demo"}
    </button>
  );
}
