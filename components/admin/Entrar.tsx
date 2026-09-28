"use client";

import { useEffect, useState } from "react";
import { guardarDireccionAdmin, leerMemoriaAdmin } from "@/lib/admin/memoria";
import { acortarDireccion } from "@/lib/integrante/formato";
import { APP_SALT, appIdPublico, IDENTIDADES } from "@/lib/integrante/identidades";

export function Entrar() {
  const [direccion, setDireccion] = useState<string | null>(null);
  const [entrando, setEntrando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    setDireccion(leerMemoriaAdmin().direccion);
  }, []);

  async function entrar() {
    const appId = appIdPublico();
    if (!appId) {
      setAviso("El ingreso espera el identificador de Cavos.");
      return;
    }

    const organizador = IDENTIDADES.find((identidad) => identidad.id === "organizador");
    if (!organizador) return;

    setAviso(null);
    setEntrando(true);
    try {
      const { Cavos } = await import("@cavos/kit");
      const sesion = await Cavos.connect({
        chains: ["stellar"],
        defaultChain: "stellar",
        network: "testnet",
        appSalt: APP_SALT,
        appId,
        vault: true,
        identity: { userId: organizador.id, email: organizador.email },
      });
      const billetera = sesion.wallet("stellar");
      if (billetera.chain !== "stellar" || !billetera.address) {
        setAviso("No se pudo entrar.");
        return;
      }
      const guardado = guardarDireccionAdmin(billetera.address);
      setDireccion(billetera.address);
      if (guardado.aviso) setAviso(guardado.aviso);
    } catch (error) {
      setAviso(error instanceof Error ? error.message : "No se pudo entrar.");
    } finally {
      setEntrando(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      {direccion ? (
        <p className="font-mono text-sm text-[var(--suave)]">{acortarDireccion(direccion)}</p>
      ) : (
        <button
          type="button"
          onClick={() => void entrar()}
          disabled={entrando}
          className="flex h-11 items-center justify-center rounded-full bg-[var(--acento)] px-5 text-sm font-semibold text-white transition disabled:opacity-50"
        >
          {entrando ? "Entrando…" : "Entrar"}
        </button>
      )}
      {aviso ? <p className="max-w-xs text-right text-sm leading-6 text-[var(--suave)]">{aviso}</p> : null}
    </div>
  );
}
