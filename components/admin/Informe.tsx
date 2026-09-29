"use client";

import { useEffect, useState } from "react";
import { Numeros } from "@/components/admin/Numeros";
import { useVistaAdmin } from "@/components/admin/usarVista";
import { PastillaEstado } from "@/components/integrante/EstadoTarea";
import { reintentarRevision } from "@/lib/admin/remoto";
import { bandejaDe, detalleMonto, enlaceCredencial, enlacePago, etiquetaOrigen, porPersona, resumir } from "@/lib/admin/vista";
import type { TareaAdmin, VistaAdmin } from "@/lib/admin/tipos";
import { formatearMonto } from "@/lib/integrante/formato";

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
    return <p className="text-[var(--suave)]">Cargando…</p>;
  }

  return (
    <main>
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-[var(--suave)] print:text-black">Hyto</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Informe</h1>
          <p className="mt-2 text-lg">{vista.nombre}</p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="flex h-14 items-center justify-center rounded-full bg-[var(--acento)] px-6 text-base font-semibold text-[var(--sobre-acento)] transition hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--tinta)] print:hidden"
        >
          Imprimir
        </button>
      </header>

      <section>
        <h2 className="text-lg font-semibold tracking-tight">Presupuesto contra gasto</h2>
        <div className="mt-4">
          <Numeros resumen={vista.resumen} />
        </div>
      </section>

      <section className="mt-10 space-y-8">
        <h2 className="text-lg font-semibold tracking-tight">Detalle</h2>
        {vista.personas.map((persona) => (
          <article key={persona.miembroId || persona.miembro}>
            <h3 className="text-base font-semibold">{persona.miembro}</h3>
            <div className="mt-3 space-y-3">
              {persona.tareas.map((tarea) => {
                const pago = enlacePago(tarea.hashPago);
                const credencial = enlaceCredencial(tarea.credencialUrl);
                const detalle = detalleMonto(tarea);
                const cifra = detalle.hasta ? `Hasta ${formatearMonto(detalle.cifra)}` : formatearMonto(detalle.cifra);
                const origen = etiquetaOrigen(tarea.origen);
                return (
                  <div key={tarea.id} className="rounded-3xl bg-[var(--papel)] p-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm capitalize text-[var(--suave)]">{tarea.tipo}</p>
                        <p className="mt-1 text-lg font-semibold tracking-tight">{tarea.titulo}</p>
                      </div>
                      <PastillaEstado estado={tarea.estado} />
                    </div>
                    <p className="mt-4 text-xl font-semibold tracking-tight">{cifra}</p>
                    {detalle.tope && detalle.tope !== detalle.cifra ? (
                      <p className="mt-1 text-sm text-[var(--suave)]">Tope {formatearMonto(detalle.tope)}</p>
                    ) : null}
                    {origen ? <p className="mt-3 text-sm text-[var(--suave)]">{origen}</p> : null}
                    {tarea.origen === "error" && tarea.frase ? (
                      <p role="alert" className="mt-3 text-sm leading-6">
                        {tarea.frase}
                      </p>
                    ) : tarea.frase ? (
                      <p className="mt-3 text-sm leading-6 text-[var(--suave)]">{tarea.frase}</p>
                    ) : null}
                    {tarea.origen === "error" && !vista.ejemplo ? (
                      <button
                        type="button"
                        onClick={() => void reintentar(tarea.id)}
                        disabled={reintento === tarea.id}
                        className="mt-3 text-sm font-semibold underline-offset-4 hover:underline"
                      >
                        Reintentar revisión
                      </button>
                    ) : null}
                    {avisoId === tarea.id ? (
                      <p role="alert" className="mt-3 text-sm leading-6">
                        No se pudo reintentar la revisión.
                      </p>
                    ) : null}
                    {pago || credencial ? (
                      <p className="mt-4 flex flex-wrap gap-4 text-sm">
                        {pago ? (
                          <a href={pago} className="font-semibold underline-offset-4 hover:underline">
                            Ver pago
                          </a>
                        ) : null}
                        {credencial ? (
                          <a href={credencial} className="text-[var(--suave)] underline-offset-4 hover:underline">
                            Credencial
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
          Vista de ejemplo, hasta que las rutas respondan. Ver pago aparece cuando el pago ya tiene enlace.
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
