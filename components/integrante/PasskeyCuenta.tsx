"use client";

import { useEffect, useRef, useState } from "react";
import { AvisoFirma } from "@/components/sesion/AvisoFirma";
import { GuiaPasskey } from "@/components/sesion/GuiaPasskey";
import { useModoDemo } from "@/components/sesion/InsigniaDemo";
import { useTexto } from "@/components/ui/Idioma";
import { agregarPasskey, AVISO_PASSKEY_FALLO, AVISO_PASSKEY_SIN_CLAVE } from "@/lib/auth/passkey";
import { ANCLA_PASSKEY, pidePasskey } from "@/lib/integrante/enlacePasskey";
import { mensajeClaro } from "@/lib/ui/claro";

type Estado = "inicio" | "agregando" | "hecho" | "error";

type Props = {
  agregar?: () => Promise<void>;
};

/** Account card: add a passkey so another phone or computer can confirm for this account. */
export function PasskeyCuenta({ agregar = () => agregarPasskey() }: Props) {
  const demo = useModoDemo();
  const t = useTexto();
  const [estado, setEstado] = useState<Estado>("inicio");
  const [aviso, setAviso] = useState<string | null>(null);
  const [resaltada, setResaltada] = useState(false);
  const tarjeta = useRef<HTMLElement>(null);

  // Arriving from the guide's link (/account?add=passkey#passkey): bring this card into view and
  // mark it. The card mounts after Account loads, so the browser's own jump to the hash misses it.
  useEffect(() => {
    if (demo || !pidePasskey(window.location.search, window.location.hash)) return;
    setResaltada(true);
    const nodo = tarjeta.current;
    if (!nodo) return;
    const quieto = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    nodo.scrollIntoView?.({ behavior: quieto ? "auto" : "smooth", block: "center" });
    nodo.focus({ preventScroll: true });
  }, [demo]);

  async function correr() {
    if (estado === "agregando") return;
    setEstado("agregando");
    setAviso(null);
    try {
      await agregar();
      setEstado("hecho");
    } catch (error) {
      setAviso(error instanceof Error && error.message ? error.message : AVISO_PASSKEY_FALLO);
      setEstado("error");
    }
  }

  if (demo) return null;

  // This browser has no account key, so adding a passkey here can't work: guide them to the
  // browser where they signed up instead of offering the same button again.
  const sinClave = estado === "error" && aviso !== null && mensajeClaro(aviso) === AVISO_PASSKEY_SIN_CLAVE;

  return (
    <section
      ref={tarjeta}
      id={ANCLA_PASSKEY}
      tabIndex={-1}
      className={`hyto-card hyto-passkey p-5 sm:p-6${resaltada ? " is-resaltada" : ""}`}
      data-estado={estado}
      aria-busy={estado === "agregando"}
    >
      {resaltada && estado !== "hecho" ? <p className="hyto-passkey-chip">{t("cuenta.passkeyEmpieza")}</p> : null}
      <h2 className="text-sm font-medium text-[var(--suave)]">{t("cuenta.passkeyTitulo")}</h2>
      <p className="hyto-note mt-3 max-w-prose" role="note">
        {t("cuenta.passkeyDetalle")}
      </p>
      <p className="mt-3 max-w-prose text-sm leading-6">{t("cuenta.passkeyPorQue")}</p>
      <p className="mt-2 max-w-prose text-sm leading-6 text-[var(--suave)]">{t("cuenta.passkeyTelefono")}</p>
      {estado === "hecho" ? (
        <p className="mt-3 max-w-prose text-sm leading-6" role="status" aria-live="polite">
          {t("cuenta.passkeyListo")}
        </p>
      ) : null}
      {sinClave ? (
        <GuiaPasskey variante="cuenta" className="mt-4" />
      ) : estado === "error" && aviso ? (
        <AvisoFirma mensaje={aviso} className="mt-3 text-sm text-[var(--suave)]" />
      ) : null}
      {estado !== "hecho" && !sinClave ? (
        <button
          type="button"
          className="hyto-btn is-inline mt-5 px-5"
          disabled={estado === "agregando"}
          aria-busy={estado === "agregando"}
          onClick={() => void correr()}
        >
          {estado === "agregando" ? t("cuenta.passkeyAgregando") : t("cuenta.passkeyAgregar")}
        </button>
      ) : null}
    </section>
  );
}
