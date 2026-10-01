"use client";

import { useEffect, useState } from "react";
import { leerMemoriaAdmin } from "@/lib/admin/memoria";
import { cargarVistaOrganizador } from "@/lib/admin/remoto";
import { vistaAdmin } from "@/lib/admin/vista";
import type { VistaAdmin } from "@/lib/admin/tipos";
import { useModoDemo } from "@/components/sesion/InsigniaDemo";

export function useVistaAdmin(proyectoId?: string): VistaAdmin | null {
  const modoDemo = useModoDemo();
  const [vista, setVista] = useState<VistaAdmin | null>(null);

  useEffect(() => {
    let viva = true;
    if (proyectoId) {
      setVista(null);
      if (modoDemo) return;
      void cargarVistaOrganizador({ proyectoId }).then((remota) => {
        if (!viva || !remota) return;
        setVista(remota);
      });
      return () => {
        viva = false;
      };
    }
    setVista(vistaAdmin(leerMemoriaAdmin()));
    if (modoDemo) return;
    void cargarVistaOrganizador().then((remota) => {
      if (!viva || !remota) return;
      setVista(remota);
    });
    return () => {
      viva = false;
    };
  }, [modoDemo, proyectoId]);

  return vista;
}
