"use client";

import { useEffect } from "react";
import { useModoDemo } from "@/components/sesion/InsigniaDemo";
import { leerMemoriaAdmin } from "@/lib/admin/memoria";
import { rutaRetornoSegura, urlSignin } from "@/lib/sesion/retorno";

/** Query keys @cavos/kit's handleCallback reads on an OAuth return. */
const CLAVES_RETORNO_OAUTH = ["cavos_auth_code", "auth_data", "zk_auth_data"] as const;

export function esRetornoOAuth(params: URLSearchParams): boolean {
  return CLAVES_RETORNO_OAUTH.some((clave) => Boolean(params.get(clave)));
}

export function VigilarSesion() {
  const demo = useModoDemo();

  useEffect(() => {
    if (demo) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("signin") === "1") return;
    // A Google/Apple return carries a one-time Cavos code that Entrar is still
    // redeeming. Before POST /api/sesion lands, GET answers 401, and a redirect
    // here would drop the code and leave the person signed out with no notice.
    if (esRetornoOAuth(params)) return;
    if (!leerMemoriaAdmin().direccion) return;
    let viva = true;
    fetch("/api/sesion", { method: "GET", cache: "no-store" })
      .then((respuesta) => {
        if (!viva || respuesta.ok || respuesta.status !== 401) return;
        const aqui = rutaRetornoSegura(`${window.location.pathname}${window.location.search}`);
        window.location.replace(new URL(urlSignin(aqui === "/" ? null : aqui), window.location.origin).toString());
      })
      .catch(() => undefined);
    return () => {
      viva = false;
    };
  }, [demo]);

  return null;
}
