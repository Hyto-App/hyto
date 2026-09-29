"use client";

import { AVISO_REINGRESO } from "@/lib/escrow/firmarCliente";
import { AVISO_ENTRAR } from "@/lib/sesion/avisos";

export function AvisoFirma({ mensaje, className }: { mensaje: string; className?: string }) {
  const reingreso = mensaje === AVISO_REINGRESO || mensaje === AVISO_ENTRAR;
  return (
    <p className={className} role={reingreso ? "alert" : undefined}>
      {mensaje}
      {reingreso ? (
        <>
          {" "}
          <a href="/?signin=1" className="font-semibold underline underline-offset-2">
            Sign in again
          </a>
        </>
      ) : null}
    </p>
  );
}
