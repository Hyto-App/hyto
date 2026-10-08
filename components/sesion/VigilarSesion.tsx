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

const ESPERA_ENTRE_401_MS = 400;

/**
 * A single 401 during a deploy is not enough to sign the person out.
 * Three in a row, with a pause between them, are. Two instant 401s on a cold start are not.
 */
export async function sesionCerrada(fetchImpl: typeof fetch = fetch, esperar: (ms: number) => Promise<void> = espera): Promise<boolean> {
  const leer = () => fetchImpl("/api/sesion", { method: "GET", cache: "no-store" });
  for (let intento = 0; intento < 3; intento += 1) {
    const respuesta = await leer();
    if (respuesta.ok || respuesta.status !== 401) return false;
    if (intento < 2) await esperar(ESPERA_ENTRE_401_MS);
  }
  return true;
}

function espera(ms: number): Promise<void> {
  return new Promise((resolver) => setTimeout(resolver, ms));
}

export function VigilarSesion({ confirmada = false }: { confirmada?: boolean }) {
  const demo = useModoDemo();

  useEffect(() => {
    // The server already read this cookie from Postgres. A 401 on the follow-up fetch must not sign them out.
    if (demo || confirmada) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("signin") === "1") return;
    // `/` is already the sign-in screen. Replacing it with `/?signin=1` reloads
    // the document and drops the email code, whose nonce only lived in this tab.
    if (window.location.pathname === "/") return;
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
  }, [confirmada, demo]);

  return null;
}
