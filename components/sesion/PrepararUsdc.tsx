"use client";

import { useEffect, useState } from "react";
import { AvisoFirma } from "@/components/sesion/AvisoFirma";
import { useModoDemo } from "@/components/sesion/InsigniaDemo";
import { leerEstadoUsdc, prepararUsdcDeSesion, type UsdcListo } from "@/lib/integrante/prepararUsdc";

type Estado = "comprobando" | "listo" | "pendiente" | "preparando" | "hecho" | "error";

const CLASE =
  "inline-flex h-10 items-center justify-center rounded-full bg-[var(--acento)] px-4 text-sm font-semibold text-[var(--sobre-acento)] disabled:cursor-not-allowed disabled:opacity-70";

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
        setAviso(error instanceof Error && error.message ? error.message : "Could not read the USDC trustline.");
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
      setAviso(error instanceof Error && error.message ? error.message : "Could not prepare the USDC trustline.");
    }
  }

  if (demo) return null;

  const mensaje =
    estado === "comprobando"
      ? "Checking USDC…"
      : estado === "listo"
        ? "USDC ready"
        : estado === "hecho"
          ? "USDC trustline added"
          : estado === "error"
            ? aviso
            : null;
  const mostrarBoton = estado === "pendiente" || estado === "preparando" || estado === "error";

  return (
    <div>
      {estado === "error" && aviso ? (
        <AvisoFirma mensaje={aviso} className="text-sm text-[var(--suave)]" />
      ) : mensaje ? (
        <p className="text-sm text-[var(--suave)]" role="status">
          {mensaje}
        </p>
      ) : null}
      {mostrarBoton ? (
        <button type="button" className={`${CLASE} mt-3`} disabled={estado === "preparando"} onClick={() => void correr()}>
          {estado === "preparando" ? "Preparing…" : "Prepare USDC"}
        </button>
      ) : null}
      {estado === "hecho" && hash ? (
        <a
          href={`https://stellar.expert/explorer/testnet/tx/${hash}`}
          className="mt-2 inline-block text-sm font-semibold underline-offset-4 hover:underline"
        >
          View transaction
        </a>
      ) : null}
    </div>
  );
}
