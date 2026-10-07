"use client";

import { useEffect, useState } from "react";
import { AvisoFirma } from "@/components/sesion/AvisoFirma";
import { useModoDemo } from "@/components/sesion/InsigniaDemo";
import { useClaro, useTexto } from "@/components/ui/Idioma";
import { leerEstadoUsdc, prepararUsdcDeSesion, type UsdcListo } from "@/lib/integrante/prepararUsdc";

type Estado = "comprobando" | "listo" | "pendiente" | "preparando" | "hecho" | "error";

const CLASE = "hyto-btn mt-4 max-w-sm";

type Props = {
  consultar?: () => Promise<boolean>;
  preparar?: () => Promise<UsdcListo>;
};

export function PrepararUsdc({ consultar = leerEstadoUsdc, preparar = () => prepararUsdcDeSesion() }: Props) {
  const demo = useModoDemo();
  const t = useTexto();
  const claro = useClaro();
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
        setAviso(error instanceof Error && error.message ? error.message : "We couldn't check whether this account can receive payment. Try again.");
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
      setAviso(error instanceof Error && error.message ? error.message : "We couldn't get this account ready to receive payment. Try again.");
    }
  }

  if (demo) return null;

  const mensaje =
    estado === "comprobando"
      ? t("pago.checkingPayout")
      : estado === "listo"
        ? t("pago.payoutReady")
        : estado === "hecho"
          ? t("pago.payoutDone")
          : estado === "preparando"
            ? t("cuenta.confirmWindow")
            : estado === "error"
              ? aviso
                ? claro(aviso)
                : null
              : t("cuenta.newAccount");
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
          {estado === "preparando" ? t("pago.preparingPayout") : t("pago.preparePayout")}
        </button>
      ) : null}
      {estado === "hecho" && hash ? (
        <a
          href={`https://stellar.expert/explorer/testnet/tx/${hash}`}
          className="hyto-btn-line is-inline mt-3 px-5"
        >
          {t("pago.viewChain")}
        </a>
      ) : null}
      {estado === "hecho" ? (
        <p className="mt-3 text-sm leading-6 text-[var(--suave)]">
          <a href="/configuracion" className="underline underline-offset-4">
            {t("cuenta.passkeyAviso")}
          </a>
        </p>
      ) : null}
    </div>
  );
}
