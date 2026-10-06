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

/** A single 401 during a deploy is not enough to sign the person out. Two in a row are. */
export async function sesionCerrada(fetchImpl: typeof fetch = fetch): Promise<boolean> {
  const leer = () => fetchImpl("/api/sesion", { method: "GET", cache: "no-store" });
  const primera = await leer();
  if (primera.ok || primera.status !== 401) return false;
  const segunda = await leer();
  return !segunda.ok && segunda.status === 401;
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
    void sesionCerrada()
      .then((cerrada) => {
        if (!viva || !cerrada) return;
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
