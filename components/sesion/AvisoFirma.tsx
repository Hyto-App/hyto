"use client";

import { AVISO_REINGRESO } from "@/lib/escrow/firmarCliente";

export function AvisoFirma({ mensaje, className }: { mensaje: string; className?: string }) {
  const reingreso = mensaje === AVISO_REINGRESO;
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
