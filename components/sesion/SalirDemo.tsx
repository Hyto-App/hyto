"use client";

import { useState } from "react";
import { useModoDemo } from "@/components/sesion/InsigniaDemo";
import { useTexto } from "@/components/ui/Idioma";

export function SalirDemo() {
  const activo = useModoDemo();
  const t = useTexto();
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
      {saliendo ? t("entrar.leaving") : t("entrar.leaveDemo")}
    </button>
  );
}
