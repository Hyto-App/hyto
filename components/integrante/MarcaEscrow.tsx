"use client";

import { useRef, useState } from "react";
import { useModoDemo } from "@/components/sesion/InsigniaDemo";
import { useClaro, useTexto } from "@/components/ui/Idioma";
import { AVISO_DEMO_FIRMA, ErrorFirmaCliente, firmarYEnviar, mensajeFirmaVisible } from "@/lib/escrow/firmarCliente";
import { evidenciaDeHito } from "@/lib/escrow/reserva";
import { BotonPrincipal } from "./BotonPrincipal";

export function MarcaEscrow({
  tareaId,
  contrato,
  evidenciaId,
  pagada,
}: {
  tareaId: string;
  contrato: string | null;
  evidenciaId: string | null;
  pagada: boolean;
}) {
  const t = useTexto();
  const claro = useClaro();
  const demo = useModoDemo();
  const [marcado, setMarcado] = useState(false);
  const [ocupado, setOcupado] = useState<"marcar" | "disputar" | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");
  const [disputada, setDisputada] = useState(false);
  const corriendo = useRef(false);

  if (!contrato || pagada) return null;

  async function marcar() {
    if (!contrato || !evidenciaId || corriendo.current) return;
    if (demo) {
      setAviso(AVISO_DEMO_FIRMA);
      return;
    }
    corriendo.current = true;
    setOcupado("marcar");
    setAviso(null);
    try {
      await firmarYEnviar("marcar", tareaId, {
        contrato,
        indice: 0,
        estado: "completed",
        evidencia: evidenciaDeHito(evidenciaId),
      });
      setMarcado(true);
    } catch (error) {
      const mensaje = error instanceof ErrorFirmaCliente ? mensajeFirmaVisible(error.message) : t("evidencia.markFailed");
      setAviso(mensaje);
    } finally {
      corriendo.current = false;
      setOcupado(null);
    }
  }

  async function disputar() {
    if (!contrato || corriendo.current) return;
    const razon = motivo.trim();
    if (!razon) {
      setAviso(t("evidencia.disputeReason"));
      return;
    }
    if (demo) {
      setAviso(AVISO_DEMO_FIRMA);
      return;
    }
    corriendo.current = true;
    setOcupado("disputar");
    setAviso(null);
    try {
      await firmarYEnviar("disputar", tareaId, { contrato, indice: 0, motivo: razon });
      setDisputada(true);
    } catch (error) {
      const mensaje = error instanceof ErrorFirmaCliente ? mensajeFirmaVisible(error.message) : t("pago.paymentFailed");
      setAviso(mensaje);
    } finally {
      corriendo.current = false;
      setOcupado(null);
    }
  }

  return (
    <section className="hyto-callout mt-4" aria-label={t("evidencia.markDone")}>
      {marcado ? <p>{t("evidencia.marked")}</p> : null}
      {evidenciaId && !marcado ? (
        <BotonPrincipal type="button" disabled={ocupado !== null} aria-busy={ocupado === "marcar"} onClick={() => void marcar()}>
          {ocupado === "marcar" ? t("evidencia.marking") : t("evidencia.markDone")}
        </BotonPrincipal>
      ) : null}
      {disputada ? (
        <p className="mt-3">{t("evidencia.disputeSent")}</p>
      ) : (
        <form
          className="mt-4 grid gap-2"
          onSubmit={(evento) => {
            evento.preventDefault();
            void disputar();
          }}
        >
          <p className="text-sm leading-6 text-[var(--suave)]">{t("evidencia.disputeHint")}</p>
          <label className="text-sm" htmlFor={`disputa-${tareaId}`}>
            {t("evidencia.disputeReason")}
            <textarea
              id={`disputa-${tareaId}`}
              className="hyto-input mt-2"
              maxLength={500}
              value={motivo}
              onChange={(evento) => setMotivo(evento.target.value)}
            />
          </label>
          <button type="submit" className="hyto-btn-line is-inline px-5" disabled={ocupado !== null}>
            {ocupado === "disputar" ? t("pago.disputingLong") : t("evidencia.dispute")}
          </button>
        </form>
      )}
      {aviso ? (
        <p role="alert" className="mt-3 text-sm">
          {claro(aviso)}
        </p>
      ) : null}
    </section>
  );
}
