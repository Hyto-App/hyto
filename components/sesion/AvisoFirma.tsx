"use client";

import { AVISO_REINGRESO } from "@/lib/escrow/firmarCliente";
import { AVISO_ENTRAR } from "@/lib/sesion/avisos";

export function AvisoFirma({ mensaje, className }: { mensaje: string; className?: string }) {
  const reingreso = mensaje === AVISO_REINGRESO || mensaje === AVISO_ENTRAR;
  return (
    <div className={className} role={reingreso ? "alert" : undefined}>
      <p>{mensaje}</p>
      {reingreso ? (
        <a href="/?signin=1" className="hyto-btn-line is-inline mt-3 px-5">
          Sign in again
        </a>
      ) : null}
    </div>
  );
}
