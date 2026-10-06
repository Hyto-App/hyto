"use client";

import { useState } from "react";
import { AvisoFirma } from "@/components/sesion/AvisoFirma";
import { useModoDemo } from "@/components/sesion/InsigniaDemo";
import { useTexto } from "@/components/ui/Idioma";
import { agregarPasskey, AVISO_PASSKEY_FALLO } from "@/lib/auth/passkey";

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

  return (
    <section className="hyto-card p-5 sm:p-6" data-estado={estado} aria-busy={estado === "agregando"}>
      <h2 className="text-sm font-medium text-[var(--suave)]">{t("cuenta.passkeyTitulo")}</h2>
      <p className="mt-2 max-w-prose text-sm leading-6">{t("cuenta.passkeyDetalle")}</p>
      {estado === "hecho" ? (
        <p className="mt-3 max-w-prose text-sm leading-6" role="status" aria-live="polite">
          {t("cuenta.passkeyListo")}
        </p>
      ) : null}
      {estado === "error" && aviso ? <AvisoFirma mensaje={aviso} className="mt-3 text-sm text-[var(--suave)]" /> : null}
      {estado !== "hecho" ? (
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
