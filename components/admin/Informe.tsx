"use client";

import { useEffect, useState } from "react";
import { Numeros } from "@/components/admin/Numeros";
import { useVistaAdmin } from "@/components/admin/usarVista";
import { PastillaEstado } from "@/components/integrante/EstadoTarea";
import { reintentarRevision } from "@/lib/admin/remoto";
import { bandejaDe, detalleMonto, enlaceCredencial, enlacePago, etiquetaOrigen, porPersona, resumir } from "@/lib/admin/vista";
import type { TareaAdmin, VistaAdmin } from "@/lib/admin/tipos";
import { formatearMonto } from "@/lib/integrante/formato";
import { TEXTO } from "@/lib/ui/claro";
import { etiquetaTipo, textoVisible } from "@/lib/ui/etiquetas";

export function Informe() {
  const cargada = useVistaAdmin();
  const [parche, setParche] = useState<VistaAdmin | null>(null);
  const [reintento, setReintento] = useState<string | null>(null);
  const [avisoId, setAvisoId] = useState<string | null>(null);
  const vista = parche ?? cargada;

  useEffect(() => {
    setParche(null);
  }, [cargada]);

  async function reintentar(id: string) {
    if (reintento) return;
    setReintento(id);
    setAvisoId(null);
    try {
      const detalle = await reintentarRevision(id);
      if (!detalle) {
        setAvisoId(id);
        return;
      }
      setParche((actual) => {
        const base = actual ?? cargada;
        return base ? conTarea(base, detalle.tarea) : base;
      });
    } finally {
      setReintento(null);
    }
  }

  if (!vista) {
    return <p className="text-[var(--suave)]">Loading…</p>;
  }

  return (
    <main>
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-[var(--suave)] print:text-black">Hyto</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Report</h1>
          <p className="mt-2 text-lg">{vista.nombre}</p>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--suave)]">
            Budget compared with what has been paid. Each task is one payment.
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="flex h-14 items-center justify-center rounded-full bg-[var(--acento)] px-6 text-base font-semibold text-[var(--sobre-acento)] transition hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--tinta)] print:hidden"
        >
          Print
        </button>
      </header>

      <section>
        <h2 className="text-lg font-semibold tracking-tight">Budget against spend</h2>
        <div className="mt-4">
          <Numeros resumen={vista.resumen} />
        </div>
      </section>

      <section className="mt-10 space-y-8">
        <h2 className="text-lg font-semibold tracking-tight">Detail</h2>
        {vista.personas.length === 0 ? <p className="text-[var(--suave)]">No tasks yet.</p> : null}
        {vista.personas.map((persona) => (
          <article key={persona.miembroId || persona.miembro}>
            <h3 className="text-base font-semibold">{textoVisible(persona.miembro)}</h3>
            <div className="mt-3 space-y-3">
              {persona.tareas.map((tarea) => {
                const pago = enlacePago(tarea.hashPago);
                const credencial = enlaceCredencial(tarea.credencialUrl);
                const detalle = detalleMonto(tarea);
                const cifra = detalle.hasta ? `Up to ${formatearMonto(detalle.cifra)}` : formatearMonto(detalle.cifra);
                const origen = etiquetaOrigen(tarea.origen);
                return (
                  <div key={tarea.id} className="rounded-3xl bg-[var(--papel)] p-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm text-[var(--suave)]">{etiquetaTipo(tarea.tipo)}</p>
                        <p className="mt-1 text-lg font-semibold tracking-tight">{textoVisible(tarea.titulo)}</p>
                      </div>
                      <PastillaEstado estado={tarea.estado} />
                    </div>
                    <p className="mt-4 text-xl font-semibold tracking-tight">{cifra}</p>
                    {detalle.tope && detalle.tope !== detalle.cifra ? (
                      <p className="mt-1 text-sm text-[var(--suave)]">Limit {formatearMonto(detalle.tope)}</p>
                    ) : null}
                    {origen ? <p className="mt-3 text-sm text-[var(--suave)]">{origen}</p> : null}
                    {tarea.origen === "error" && tarea.frase ? (
                      <p role="alert" className="mt-3 text-sm leading-6">
                        {textoVisible(tarea.frase)}
                      </p>
                    ) : tarea.frase ? (
                      <p className="mt-3 text-sm leading-6 text-[var(--suave)]">{textoVisible(tarea.frase)}</p>
                    ) : null}
                    {tarea.origen === "error" && !vista.ejemplo ? (
                      <button
                        type="button"
                        onClick={() => void reintentar(tarea.id)}
                        disabled={reintento === tarea.id}
                        className="mt-3 text-sm font-semibold underline-offset-4 hover:underline"
                      >
                        Retry review
                      </button>
                    ) : null}
                    {avisoId === tarea.id ? (
                      <p role="alert" className="mt-3 text-sm leading-6">
                        The review could not be retried.
                      </p>
                    ) : null}
                    {pago || credencial ? (
                      <p className="mt-4 flex flex-wrap gap-4 text-sm">
                        {pago ? (
                          <a href={pago} className="font-semibold underline-offset-4 hover:underline">
                            {TEXTO.viewChain}
                          </a>
                        ) : null}
                        {credencial ? (
                          <a href={credencial} className="text-[var(--suave)] underline-offset-4 hover:underline">
                            Credential
                          </a>
                        ) : null}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </article>
        ))}
      </section>

      {vista.ejemplo ? (
        <p className="mt-8 text-sm leading-6 text-[var(--suave)] print:hidden">
          Sample report, until live tasks load. A paid task can include a blockchain link.
        </p>
      ) : null}
    </main>
  );
}

function conTarea(vista: VistaAdmin, tarea: TareaAdmin): VistaAdmin {
  const tareas = vista.tareas.map((item) => (item.id === tarea.id ? tarea : item));
  return {
    ...vista,
    tareas,
    bandeja: bandejaDe(tareas),
    resumen: resumir(tareas),
    personas: porPersona(tareas),
  };
}
