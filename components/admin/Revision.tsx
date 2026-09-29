"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BotonPrincipal } from "@/components/integrante/BotonPrincipal";
import { PastillaEstado } from "@/components/integrante/EstadoTarea";
import { PastillaVeredicto } from "@/components/admin/PastillaVeredicto";
import { guardarDecision, leerMemoriaAdmin } from "@/lib/admin/memoria";
import { detalleMonto, enlaceCredencial, enlacePago, vistaAdmin } from "@/lib/admin/vista";
import { formatearFecha, formatearMonto, montoDeTarea } from "@/lib/integrante/formato";
import type { TareaAdmin } from "@/lib/admin/tipos";

export function Revision({ tareaId }: { tareaId: string }) {
  const [tarea, setTarea] = useState<TareaAdmin | null | undefined>(undefined);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    const vista = vistaAdmin(leerMemoriaAdmin());
    setTarea(vista.tareas.find((item) => item.id === tareaId) ?? null);
  }, [tareaId]);

  function decidir(decision: "pagado" | "pendiente") {
    const guardado = guardarDecision(tareaId, decision);
    if (guardado.aviso) {
      setAviso(guardado.aviso);
      return;
    }
    setAviso(null);
    const vista = vistaAdmin(guardado.memoria);
    setTarea(vista.tareas.find((item) => item.id === tareaId) ?? null);
  }

  if (tarea === undefined) {
    return <p className="text-[var(--suave)]">Cargando…</p>;
  }

  if (!tarea) {
    return (
      <main>
        <p className="text-lg">No encontramos esa tarea.</p>
        <Link href="/" className="mt-6 inline-block text-sm font-medium">
          Volver a la bandeja
        </Link>
      </main>
    );
  }

  const pago = enlacePago(tarea.hashPago);
  const credencial = enlaceCredencial(tarea.credencialUrl);
  const puedeDecidir = tarea.estado === "en revisión" && tarea.veredicto !== null;
  const pedirOtra = puedeDecidir && tarea.veredicto !== "cumplió";

  return (
    <main>
      <Link href="/" className="text-sm text-[var(--suave)] print:hidden">
        Bandeja
      </Link>
      <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <figure className="overflow-hidden rounded-3xl bg-[var(--papel)]">
          {tarea.frase ? (
            <div className="flex aspect-[4/3] flex-col justify-end bg-[var(--fondo)] p-8">
              <p className="text-sm text-[var(--suave)]">Evidencia de ejemplo</p>
              <p className="mt-2 text-lg font-medium leading-7">{tarea.titulo}</p>
            </div>
          ) : (
            <div className="flex aspect-[4/3] items-center justify-center px-8 text-center text-sm text-[var(--suave)]">
              Sin evidencia
            </div>
          )}
        </figure>

        <section className="rounded-3xl bg-[var(--papel)] p-6 sm:p-8">
          <p className="text-sm capitalize text-[var(--suave)]">
            {tarea.tipo} · {tarea.miembro}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{tarea.titulo}</h1>
          {tarea.condicion ? <p className="mt-3 text-sm leading-6 text-[var(--suave)]">{tarea.condicion}</p> : null}
          <p className="mt-6 text-2xl font-semibold tracking-tight">{montoDeTarea(tarea)}</p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            {tarea.veredicto ? <PastillaVeredicto veredicto={tarea.veredicto} /> : <PastillaEstado estado={tarea.estado} />}
          </div>
          {tarea.frase ? <p className="mt-4 text-base leading-7">{tarea.frase}</p> : null}

          {tarea.tipo === "reembolso" && tarea.montoRevisado && tarea.fecha ? (
            <dl className="mt-6 grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-[var(--suave)]">Monto</dt>
                <dd className="mt-1 text-xl font-semibold tracking-tight">{formatearMonto(tarea.montoRevisado)}</dd>
              </div>
              <div>
                <dt className="text-sm text-[var(--suave)]">Fecha</dt>
                <dd className="mt-1 text-xl font-semibold tracking-tight">{formatearFecha(tarea.fecha)}</dd>
              </div>
            </dl>
          ) : null}

          {puedeDecidir ? (
            <div className="mt-8">
              <BotonPrincipal type="button" onClick={() => decidir("pagado")}>
                Aprobar
              </BotonPrincipal>
            </div>
          ) : null}

          {pedirOtra ? (
            <button type="button" onClick={() => decidir("pendiente")} className="mt-4 text-sm text-[var(--suave)]">
              Pedir otra foto
            </button>
          ) : null}

          {aviso && tarea.estado !== "pagado" ? (
            <p role="alert" className="mt-4 text-sm leading-6 text-[var(--suave)]">
              {aviso}
            </p>
          ) : null}

          {tarea.estado === "pagado" ? (
            <div className="mt-8 space-y-3">
              <p className="text-lg font-medium">Pagado {formatearMonto(detalleMonto(tarea).cifra)}</p>
              {pago ? (
                <a href={pago} className="inline-block text-sm font-semibold underline-offset-4 hover:underline">
                  Ver pago
                </a>
              ) : (
                <p className="text-sm leading-6 text-[var(--suave)]">Vista de ejemplo, hasta que el pago esté conectado.</p>
              )}
              {credencial ? (
                <a href={credencial} className="block text-sm text-[var(--suave)] underline-offset-4 hover:underline">
                  Credencial
                </a>
              ) : null}
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
