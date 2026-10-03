"use client";

import { useEffect, useState } from "react";
import { AvisoFirma } from "@/components/sesion/AvisoFirma";
import { useModoDemo } from "@/components/sesion/InsigniaDemo";
import { leerEstadoUsdc, prepararUsdcDeSesion, type UsdcListo } from "@/lib/integrante/prepararUsdc";
import { mensajeClaro, TEXTO } from "@/lib/ui/claro";

type Estado = "comprobando" | "listo" | "pendiente" | "preparando" | "hecho" | "error";

const CLASE = "hyto-btn mt-4 max-w-sm";

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
              : "If this account is new, we'll open it on the test network first. You'll confirm once so it can receive the event payment.";
  const mostrarBoton = estado === "pendiente" || estado === "preparando" || estado === "error";
  const terminado = estado === "listo" || estado === "hecho";
  const ocupado = estado === "comprobando" || estado === "preparando";

  return (
    <div className={terminado ? "hyto-payout is-done" : "hyto-payout"} data-estado={estado} aria-busy={ocupado}>
      {estado === "error" && aviso ? (
        <AvisoFirma mensaje={aviso} className="text-sm text-[var(--suave)]" />
      ) : mensaje ? (
        <p className={terminado ? "hyto-payout-done" : "text-sm leading-6 text-[var(--suave)]"} role="status" aria-live="polite">
          {terminado ? (
            <span className="hyto-payout-mark" aria-hidden="true">
              ✓
            </span>
          ) : null}
          {mensaje}
        </p>
      ) : null}
      {mostrarBoton ? (
        <button type="button" className={CLASE} disabled={estado === "preparando"} aria-busy={estado === "preparando"} onClick={() => void correr()}>
          {estado === "preparando" ? TEXTO.preparingPayout : TEXTO.preparePayout}
        </button>
      ) : null}
      {estado === "hecho" && hash ? (
        <a
          href={`https://stellar.expert/explorer/testnet/tx/${hash}`}
          className="hyto-btn-line is-inline mt-3 px-5"
        >
          {TEXTO.viewChain}
        </a>
      ) : null}
    </div>
  );
}
