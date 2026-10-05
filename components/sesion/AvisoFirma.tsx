"use client";

import { useState, type MouseEvent } from "react";
import { cerrarSesionEnCliente } from "@/lib/auth/cliente";
import { AVISO_REINGRESO } from "@/lib/escrow/firmarCliente";
import { AVISO_USDC_FIRMANTE, AVISO_USDC_OTRA_CUENTA } from "@/lib/integrante/avisosUsdc";
import { AVISO_ENTRAR } from "@/lib/sesion/avisos";
import { rutaRetornoSegura, urlSignin } from "@/lib/sesion/retorno";
import { useClaro, useTexto } from "@/components/ui/Idioma";
import { mensajeClaro } from "@/lib/ui/claro";

const REINGRESO = new Set([AVISO_REINGRESO, AVISO_ENTRAR, AVISO_USDC_FIRMANTE, AVISO_USDC_OTRA_CUENTA]);

export function AvisoFirma({ mensaje, className }: { mensaje: string; className?: string }) {
  const t = useTexto();
  const claro = useClaro();
  const [saliendo, setSaliendo] = useState(false);
  const reingreso = REINGRESO.has(mensajeClaro(mensaje)) || REINGRESO.has(mensaje);

  // With the Hyto cookie still alive, /?signin=1 sends the person back to Events with the same
  // expired Cavos token. Signing out first is what lets a new sign-in replace it.
  async function volverAEntrar(evento: MouseEvent<HTMLAnchorElement>) {
    evento.preventDefault();
    if (saliendo) return;
    setSaliendo(true);
    const aqui = rutaRetornoSegura(`${window.location.pathname}${window.location.search}`);
    await cerrarSesionEnCliente(urlSignin(aqui === "/" ? null : aqui));
  }

  return (
    <div className={className} role={reingreso ? "alert" : undefined}>
      <p>{claro(mensaje)}</p>
      {reingreso ? (
        <a
          href="/?signin=1"
          onClick={(evento) => void volverAEntrar(evento)}
          aria-disabled={saliendo || undefined}
          className="hyto-btn-line is-inline mt-3 px-5"
        >
          {t("entrar.signInAgain")}
        </a>
      ) : null}
    </div>
  );
}
