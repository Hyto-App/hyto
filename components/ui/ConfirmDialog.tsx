"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { claseBoton } from "@/components/ui/Boton";
import { useClaro, useTexto } from "@/components/ui/Idioma";
import { acortarDireccion } from "@/lib/integrante/formato";
import { crearConfirmacion } from "@/lib/ui/confirmar";

type Props = {
  abierto: boolean;
  /** Called on cancel, ✕, Esc, backdrop and after a successful confirm. */
  onCerrar: () => void;
  titulo: string;
  /** Shown big, e.g. "20.00". The unit is added next to it. */
  monto?: string;
  destinatario?: { nombre?: string; direccion?: string };
  detalle?: string;
  irreversible?: boolean;
  confirmar: string;
  peligro?: boolean;
  onConfirmar: () => Promise<void>;
};

export function ConfirmDialog({ abierto, onCerrar, titulo, monto, destinatario, detalle, irreversible, confirmar, peligro, onConfirmar }: Props) {
  const t = useTexto();
  const claro = useClaro();
  const dialogo = useRef<HTMLDialogElement>(null);
  const origen = useRef<HTMLElement | null>(null);
  const cancelar = useRef<HTMLButtonElement>(null);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const idTitulo = useId();
  const idDetalle = useId();

  useEffect(() => {
    const el = dialogo.current;
    if (!el) return;
    if (abierto && !el.open) {
      origen.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setError(null);
      el.showModal();
      cancelar.current?.focus();
    } else if (!abierto && el.open) {
      el.close();
    }
  }, [abierto]);

  useEffect(() => {
    if (abierto) return;
    origen.current?.focus();
    origen.current = null;
  }, [abierto]);

  const ultimo = useRef({ onConfirmar, onCerrar, claro, t });
  ultimo.current = { onConfirmar, onCerrar, claro, t };
  const ejecutar = useMemo(
    () =>
      crearConfirmacion(
        () => ultimo.current.onConfirmar(),
        { ocupado: setOcupado, error: setError, cerrar: () => ultimo.current.onCerrar() },
        (fallo) => ultimo.current.claro(fallo instanceof Error && fallo.message ? fallo.message : ultimo.current.t("confirmar.failed")),
      ),
    [],
  );

  function cerrar() {
    if (!ocupado) onCerrar();
  }

  return (
    <dialog
      ref={dialogo}
      className="hyto-dialogo"
      aria-labelledby={idTitulo}
      aria-describedby={idDetalle}
      onCancel={(evento) => {
        evento.preventDefault();
        cerrar();
      }}
      onClick={(evento) => {
        if (evento.target === dialogo.current) cerrar();
      }}
    >
      <div className="hyto-dialogo-cuerpo">
        <button type="button" className="hyto-dialogo-cerrar" aria-label={t("confirmar.close")} onClick={cerrar}>
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
        <h2 id={idTitulo}>{titulo}</h2>
        <div id={idDetalle} className="grid gap-3">
          {monto ? (
            <p className="hyto-dialogo-monto">
              {monto}
              <small>USDC</small>
            </p>
          ) : null}
          {destinatario ? (
            <p className="hyto-dialogo-destino">
              {t("confirmar.to")} {destinatario.nombre ?? ""}
              {destinatario.nombre && destinatario.direccion ? " · " : ""}
              {destinatario.direccion ? <span>{acortarDireccion(destinatario.direccion)}</span> : null}
            </p>
          ) : null}
          {detalle ? <p className="text-sm text-[var(--suave)]">{detalle}</p> : null}
          {irreversible ? <p className="hyto-dialogo-aviso">{t("confirmar.irreversible")}</p> : null}
        </div>
        {error ? (
          <p role="alert" className="text-sm text-[var(--peligro)]">
            {error}
          </p>
        ) : null}
        <div className="hyto-dialogo-acciones">
          <button ref={cancelar} type="button" className={claseBoton("secundario")} disabled={ocupado} onClick={cerrar}>
            {t("confirmar.cancel")}
          </button>
          <button
            type="button"
            className={claseBoton(peligro ? "peligro" : "primario", true)}
            disabled={ocupado}
            aria-busy={ocupado}
            onClick={() => void ejecutar()}
          >
            {ocupado ? t("confirmar.working") : confirmar}
          </button>
        </div>
      </div>
    </dialog>
  );
}
