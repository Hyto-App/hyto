"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { GuiaPasskey } from "@/components/sesion/GuiaPasskey";
import { useClaro, useTexto } from "@/components/ui/Idioma";
import { revisarFirmaNavegador, type EstadoFirma, type OpcionesRevision } from "@/lib/auth/firmaNavegador";
import { bajarCapasParaCavos } from "@/lib/escrow/capaCavos";
import { AVISO_PASSKEY } from "@/lib/escrow/firmarCliente";

export type RevisarFirma = (opciones?: OpcionesRevision) => Promise<EstadoFirma>;

export type UsoFirma = {
  /** Null while checking (or when the check is off). */
  estado: EstadoFirma | null;
  restaurando: boolean;
  /** True once Try again brought the key into this browser. */
  restaurada: boolean;
  /** A passkey is on file, but the one picked (or none) didn't open the key here. */
  passkeyNoAbrio: boolean;
  /** Passkey mode: the Cavos vault restores the key from the person's passkey, if they added one. */
  restaurar: () => Promise<EstadoFirma | null>;
  /** The signature itself said this browser has no key (`needs-device-approval`). */
  marcarSinClave: (passkey: boolean) => void;
};

/**
 * One check for "can this browser sign?", shared by Settings and Lock budget. It connects the way
 * the signature does, without passkey mode, so it never opens a window on its own.
 */
export function useFirmaNavegador(activo: boolean, revisar: RevisarFirma = revisarFirmaNavegador): UsoFirma {
  const [estado, setEstado] = useState<EstadoFirma | null>(null);
  const [restaurando, setRestaurando] = useState(false);
  const [restaurada, setRestaurada] = useState(false);
  const [passkeyNoAbrio, setPasskeyNoAbrio] = useState(false);
  // Callers may pass a new function each render; the check runs once per activation.
  const revisarRef = useRef(revisar);
  revisarRef.current = revisar;

  useEffect(() => {
    if (!activo) {
      setEstado(null);
      return;
    }
    let viva = true;
    revisarRef.current()
      .then((resultado) => {
        if (viva) setEstado(resultado);
      })
      .catch(() => {
        if (viva) setEstado({ estado: "desconocido" });
      });
    return () => {
      viva = false;
    };
  }, [activo]);

  const restaurar = useCallback(async () => {
    setRestaurando(true);
    setPasskeyNoAbrio(false);
    const volver = bajarCapasParaCavos();
    try {
      const resultado = await revisarRef.current({ restaurar: true }).catch((): EstadoFirma => ({ estado: "desconocido" }));
      if (resultado.estado === "lista") {
        setRestaurada(true);
        setEstado(resultado);
      } else if (resultado.estado === "sin-clave") {
        setPasskeyNoAbrio(resultado.passkey);
        setEstado(resultado);
      }
      return resultado;
    } finally {
      volver();
      setRestaurando(false);
    }
  }, []);

  const marcarSinClave = useCallback((passkey: boolean) => {
    setRestaurada(false);
    setPasskeyNoAbrio(passkey);
    setEstado((actual) => ({
      estado: "sin-clave",
      direccion: actual && "direccion" in actual ? actual.direccion : null,
      passkey,
    }));
  }, []);

  return { estado, restaurando, restaurada, passkeyNoAbrio, restaurar, marcarSinClave };
}

export function sinClave(firma: UsoFirma): boolean {
  return firma.estado?.estado === "sin-clave";
}

type Props = {
  firma: UsoFirma;
  /** `cuenta` on Settings, `bloqueo` above Lock budget, `pago` above Approve and pay. */
  contexto: "cuenta" | "bloqueo" | "pago";
  className?: string;
  id?: string;
};

/**
 * Shown when this browser has no account key: says so plainly, then walks the person through
 * bringing it here (a passkey added where the account was created, then Try again here).
 */
export function ClaveNavegador({ firma, contexto, className, id }: Props) {
  const t = useTexto();
  const claro = useClaro();
  const propio = useId();
  const titulo = `${id ?? propio}-titulo`;
  if (firma.restaurada && firma.estado?.estado === "lista") {
    return (
      <p className={className} role="status" aria-live="polite">
        {t("claveNavegador.restaurada")}
      </p>
    );
  }
  if (!sinClave(firma)) return null;
  return (
    <section id={id} className={`hyto-clave-navegador ${className ?? ""}`.trim()} role="alert" aria-labelledby={titulo} data-contexto={contexto}>
      <p id={titulo} className="font-medium">
        {t("claveNavegador.faltaTitulo")}
      </p>
      <p className="mt-2 max-w-prose text-sm leading-6">
        {t(contexto === "cuenta" ? "claveNavegador.faltaCuenta" : contexto === "pago" ? "claveNavegador.faltaPago" : "claveNavegador.faltaBloqueo")}
      </p>
      {firma.passkeyNoAbrio ? <p className="mt-2 max-w-prose text-sm leading-6">{claro(AVISO_PASSKEY)}</p> : null}
      <GuiaPasskey className="mt-4" alReintentar={() => void firma.restaurar()} reintentando={firma.restaurando} />
    </section>
  );
}
