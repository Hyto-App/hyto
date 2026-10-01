"use client";

import { useEffect, useState } from "react";
import { AvisoFirma } from "@/components/sesion/AvisoFirma";
import { useModoDemo } from "@/components/sesion/InsigniaDemo";
import { leerEstadoUsdc, prepararUsdcDeSesion, type UsdcListo } from "@/lib/integrante/prepararUsdc";
import { mensajeClaro, TEXTO } from "@/lib/ui/claro";

type Estado = "comprobando" | "listo" | "pendiente" | "preparando" | "hecho" | "error";

const CLASE = "hyto-btn mt-3 w-auto px-5";

type Props = {
  consultar?: () => Promise<boolean>;
  preparar?: () => Promise<UsdcListo>;
};

export function PrepararUsdc({ consultar = leerEstadoUsdc, preparar = () => prepararUsdcDeSesion() }: Props) {
  const demo = useModoDemo();
  const [estado, setEstado] = useState<Estado>("comprobando");
  const [aviso, setAviso] = useState<string | null>(null);
  const [hash, setHash] = useState<string | null>(null);

  useEffect(() => {
    if (demo) return;
    let viva = true;
    consultar()
      .then((listo) => {
        if (!viva) return;
        setEstado(listo ? "listo" : "pendiente");
        setAviso(null);
      })
      .catch((error: unknown) => {
        if (!viva) return;
        setEstado("error");
        setAviso(mensajeClaro(error instanceof Error && error.message ? error.message : "We couldn't check whether this account can receive payment. Try again."));
      });
    return () => {
      viva = false;
    };
  }, [consultar, demo]);

  async function correr() {
    if (estado === "preparando" || estado === "comprobando" || estado === "listo" || estado === "hecho") return;
    setEstado("preparando");
    setAviso(null);
    try {
      const listo = await preparar();
      setHash(listo.hash);
      setEstado("hecho");
    } catch (error) {
      setEstado("error");
      setAviso(mensajeClaro(error instanceof Error && error.message ? error.message : "We couldn't get this account ready to receive payment. Try again."));
    }
  }

  if (demo) return null;

  const mensaje =
    estado === "comprobando"
      ? TEXTO.checkingPayout
      : estado === "listo"
        ? TEXTO.payoutReady
        : estado === "hecho"
          ? TEXTO.payoutDone
          : estado === "preparando"
            ? "Confirm in the window if it asks. This can take a minute."
            : estado === "error"
              ? aviso
              : "This lets the account receive the event payment. You'll confirm once.";
  const mostrarBoton = estado === "pendiente" || estado === "preparando" || estado === "error";

  return (
    <div>
      {estado === "error" && aviso ? (
        <AvisoFirma mensaje={aviso} className="text-sm text-[var(--suave)]" />
      ) : mensaje ? (
        <p className="text-sm leading-6 text-[var(--suave)]" role="status" aria-live="polite">
          {mensaje}
        </p>
      ) : null}
      {mostrarBoton ? (
        <button type="button" className={`${CLASE} mt-3`} disabled={estado === "preparando"} aria-busy={estado === "preparando"} onClick={() => void correr()}>
          {estado === "preparando" ? TEXTO.preparingPayout : TEXTO.preparePayout}
        </button>
      ) : null}
      {estado === "hecho" && hash ? (
        <a
          href={`https://stellar.expert/explorer/testnet/tx/${hash}`}
          className="mt-2 inline-block text-sm font-semibold underline-offset-4 hover:underline"
        >
          {TEXTO.viewChain}
        </a>
      ) : null}
    </div>
  );
}
