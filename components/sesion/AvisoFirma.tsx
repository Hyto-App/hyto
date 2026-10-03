"use client";

import { AVISO_REINGRESO } from "@/lib/escrow/firmarCliente";
import { AVISO_ENTRAR } from "@/lib/sesion/avisos";
import { useClaro, useTexto } from "@/components/ui/Idioma";
import { mensajeClaro } from "@/lib/ui/claro";

export function AvisoFirma({ mensaje, className }: { mensaje: string; className?: string }) {
  const t = useTexto();
  const claro = useClaro();
  const canon = mensajeClaro(mensaje);
  const reingreso = canon === AVISO_REINGRESO || canon === AVISO_ENTRAR || mensaje === AVISO_REINGRESO || mensaje === AVISO_ENTRAR;
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
