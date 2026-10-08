"use client";

import { useState, type MouseEvent } from "react";
import { GuiaPasskey } from "@/components/sesion/GuiaPasskey";
import { cerrarSesionEnCliente } from "@/lib/auth/cliente";
import { AVISO_DISPOSITIVO, AVISO_REINGRESO, AVISO_SIN_CUENTA_FIRMA } from "@/lib/escrow/firmarCliente";
import { AVISO_USDC_FIRMANTE, AVISO_USDC_OTRA_CUENTA } from "@/lib/integrante/avisosUsdc";
import { AVISO_ENTRAR } from "@/lib/sesion/avisos";
import { rutaRetornoSegura, urlSignin } from "@/lib/sesion/retorno";
import { useTexto } from "@/components/ui/Idioma";
import { TextoClaro } from "@/components/ui/TextoClaro";
import { mensajeClaro } from "@/lib/ui/claro";

const REINGRESO = new Set([AVISO_REINGRESO, AVISO_SIN_CUENTA_FIRMA, AVISO_ENTRAR, AVISO_USDC_FIRMANTE, AVISO_USDC_OTRA_CUENTA]);

type Props = {
  mensaje: string;
  className?: string;
  /** Lets the passkey guide offer Try again for the step that failed. */
  alReintentar?: () => void;
  reintentando?: boolean;
};

/** True for the notice a browser without the account key and without a passkey gets. */
export function esAvisoDispositivo(mensaje: string): boolean {
  return mensaje.trim() === AVISO_DISPOSITIVO || mensajeClaro(mensaje) === AVISO_DISPOSITIVO;
}

export function AvisoFirma({ mensaje, className, alReintentar, reintentando }: Props) {
  const t = useTexto();
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

  if (esAvisoDispositivo(mensaje)) {
    return <GuiaPasskey alReintentar={alReintentar} reintentando={reintentando} className={className} />;
  }

  return (
    <div className={className} role={reingreso ? "alert" : undefined}>
      <p>
        <TextoClaro mensaje={mensaje} />
      </p>
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
