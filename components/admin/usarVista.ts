"use client";

import { useEffect, useState } from "react";
import { leerMemoriaAdmin } from "@/lib/admin/memoria";
import { cargarVistaOrganizador } from "@/lib/admin/remoto";
import { vistaAdmin } from "@/lib/admin/vista";
import type { VistaAdmin } from "@/lib/admin/tipos";
import { useModoDemo } from "@/components/sesion/InsigniaDemo";

export function useVistaAdmin(proyectoId?: string): {
  vista: VistaAdmin | null;
  error: string | null;
  reintentar: () => void;
} {
  const modoDemo = useModoDemo();
  const [vista, setVista] = useState<VistaAdmin | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let viva = true;
    setVista(null);
    setError(null);
    if (!proyectoId && modoDemo) {
      setVista(vistaAdmin(leerMemoriaAdmin()));
      return;
    }
    void cargarVistaOrganizador(proyectoId ? { proyectoId } : {}).then((remota) => {
      if (!viva) return;
      if (!remota) {
        setError("Could not load this event.");
        return;
      }
      setVista(remota);
    });
    return () => {
      viva = false;
    };
  }, [modoDemo, proyectoId, intento]);

  return { vista, error, reintentar: () => setIntento((actual) => actual + 1) };
}
