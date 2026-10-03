"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useClaro, useTexto } from "@/components/ui/Idioma";
import type { DetalleRevision } from "@/lib/admin/remoto";
import {
  correrReintento,
  esperaFondo,
  reintentoFondoEnCurso,
  soltarAnclaFondo,
  suscribirReintentoFondo,
} from "@/lib/admin/reintento-fondo";

export function ReintentoFondo({
  tareaId,
  onDetalle,
}: {
  tareaId: string;
  onDetalle: (detalle: DetalleRevision) => void;
}) {
  const alListo = useRef(onDetalle);
  alListo.current = onDetalle;

  useEffect(() => {
    let viva = true;
    let cancelar = () => {};
    const programar = (espera: number) => {
      const timer = setTimeout(tick, espera);
      cancelar = () => clearTimeout(timer);
    };
    const tick = () => {
      if (!viva) return;
      const espera = esperaFondo(tareaId, Date.now());
      if (espera === null) return;
      if (espera > 0) {
        programar(espera);
        return;
      }
      void correrReintento(tareaId, "fondo").then((resultado) => {
        if (!viva) return;
        if (!resultado) {
          const otra = esperaFondo(tareaId, Date.now());
          if (otra !== null && otra > 0) programar(otra);
          return;
        }
        if (!resultado.ok) {
          if (/no longer be reviewed/i.test(resultado.aviso)) return;
          tick();
          return;
        }
        alListo.current(resultado.detalle);
        if (resultado.detalle.tarea.origen === "error") tick();
      });
    };
    tick();
    return () => {
      viva = false;
      cancelar();
      soltarAnclaFondo(tareaId);
    };
  }, [tareaId]);

  return null;
}

export function BotonReintentarRevision({
  tareaId,
  onDetalle,
}: {
  tareaId: string;
  onDetalle: (detalle: DetalleRevision) => void;
}) {
  const t = useTexto();
  const claro = useClaro();
  const [manual, setManual] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const ocupado = useSyncExternalStore(
    suscribirReintentoFondo,
    () => reintentoFondoEnCurso(tareaId),
    () => false,
  );
  const cargando = manual || ocupado;

  async function pulsar() {
    if (cargando) return;
    setManual(true);
    setAviso(null);
    try {
      const resultado = await correrReintento(tareaId, "manual");
      if (!resultado || !resultado.ok) {
        setAviso(resultado?.aviso ?? "The review could not be retried.");
        return;
      }
      onDetalle(resultado.detalle);
    } finally {
      setManual(false);
    }
  }

  return (
    <div className="mt-4 print:hidden">
      <button type="button" className="hyto-btn-line max-w-xs" onClick={() => void pulsar()} disabled={cargando} aria-busy={cargando}>
        {cargando ? t("bandeja.retrying") : t("bandeja.retry")}
      </button>
      {aviso ? (
        <p role="alert" className="mt-2 text-sm leading-6">
          {claro(aviso)}
        </p>
      ) : null}
    </div>
  );
}

export function AccionesRevisionFallida({
  tareaId,
  onDetalle,
}: {
  tareaId: string;
  onDetalle: (detalle: DetalleRevision) => void;
}) {
  return (
    <>
      <ReintentoFondo tareaId={tareaId} onDetalle={onDetalle} />
      <BotonReintentarRevision tareaId={tareaId} onDetalle={onDetalle} />
    </>
  );
}
