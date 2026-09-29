"use client";

import { useEffect } from "react";
import { useModoDemo } from "@/components/sesion/InsigniaDemo";
import { leerMemoriaAdmin } from "@/lib/admin/memoria";

export function VigilarSesion() {
  const demo = useModoDemo();

  useEffect(() => {
    if (demo) return;
    if (new URLSearchParams(window.location.search).get("signin") === "1") return;
    if (!leerMemoriaAdmin().direccion) return;
    let viva = true;
    fetch("/api/sesion", { method: "GET", cache: "no-store" })
      .then((respuesta) => {
        if (!viva || respuesta.ok || respuesta.status !== 401) return;
        const destino = new URL(window.location.href);
        destino.pathname = "/";
        destino.search = "signin=1";
        window.location.replace(destino.toString());
      })
      .catch(() => undefined);
    return () => {
      viva = false;
    };
  }, [demo]);

  return null;
}
