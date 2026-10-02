"use client";

import { useEffect, useState } from "react";
import { useModoDemo } from "@/components/sesion/InsigniaDemo";
import { leerMemoriaAdmin } from "@/lib/admin/memoria";
import { cerrarSesionEnCliente } from "@/lib/auth/cliente";

export function Salir({ className = "" }: { className?: string }) {
  const demo = useModoDemo();
  const [visible, setVisible] = useState(demo);
  const [saliendo, setSaliendo] = useState(false);

  useEffect(() => {
    if (demo) {
      setVisible(true);
      return;
    }
    if (leerMemoriaAdmin().direccion) {
      setVisible(true);
      return;
    }
    let viva = true;
    fetch("/api/sesion", { method: "GET", cache: "no-store" })
      .then((respuesta) => {
        if (viva) setVisible(respuesta.ok);
      })
      .catch(() => {
        if (viva) setVisible(false);
      });
    return () => {
      viva = false;
    };
  }, [demo]);

  if (!visible) return null;

  async function salir() {
    if (saliendo) return;
    setSaliendo(true);
    await cerrarSesionEnCliente();
  }

  return (
    <button
      type="button"
      onClick={() => void salir()}
      disabled={saliendo}
      className={`hyto-btn-danger ${className}`.trim()}
    >
      {saliendo ? "Signing out…" : "Sign out"}
    </button>
  );
}
