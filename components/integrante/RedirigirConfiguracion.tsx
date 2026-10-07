"use client";

import { useEffect } from "react";
import { destinoConfiguracion } from "@/lib/integrante/configuracion";

/** Keeps `?add=passkey` and `#passkey` when `/cuentas` opens Settings. */
export function RedirigirConfiguracion() {
  useEffect(() => {
    window.location.replace(destinoConfiguracion(window.location.search, window.location.hash));
  }, []);
  return null;
}
