"use client";

import { AVISO_REINGRESO } from "@/lib/escrow/firmarCliente";
import { AVISO_USDC_FIRMANTE, AVISO_USDC_OTRA_CUENTA } from "@/lib/integrante/avisosUsdc";
import { AVISO_ENTRAR } from "@/lib/sesion/avisos";
import { useClaro, useTexto } from "@/components/ui/Idioma";
import { mensajeClaro } from "@/lib/ui/claro";

const REINGRESO = new Set([AVISO_REINGRESO, AVISO_ENTRAR, AVISO_USDC_FIRMANTE, AVISO_USDC_OTRA_CUENTA]);

export function AvisoFirma({ mensaje, className }: { mensaje: string; className?: string }) {
  const t = useTexto();
  const claro = useClaro();
  const reingreso = REINGRESO.has(mensajeClaro(mensaje)) || REINGRESO.has(mensaje);
  return (
    <div className={className} role={reingreso ? "alert" : undefined}>
      <p>{claro(mensaje)}</p>
      {reingreso ? (
        <a href="/?signin=1" className="hyto-btn-line is-inline mt-3 px-5">
          {t("entrar.signInAgain")}
        </a>
      ) : null}
    </div>
  );
}
