"use client";

import { useEffect, useState } from "react";
import { Numeros } from "@/components/admin/Numeros";
import { PastillaEstado } from "@/components/integrante/EstadoTarea";
import { leerMemoriaAdmin } from "@/lib/admin/memoria";
import { detalleMonto, enlaceCredencial, enlacePago, vistaAdmin } from "@/lib/admin/vista";
import { formatearMonto } from "@/lib/integrante/formato";
import type { VistaAdmin } from "@/lib/admin/tipos";

export function Informe() {
  const [vista, setVista] = useState<VistaAdmin | null>(null);

  useEffect(() => {
    setVista(vistaAdmin(leerMemoriaAdmin()));
  }, []);

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
          className="flex h-14 items-center justify-center rounded-full bg-[var(--acento)] px-6 text-base font-semibold text-white print:hidden"
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
                    {tarea.frase ? <p className="mt-3 text-sm leading-6 text-[var(--suave)]">{tarea.frase}</p> : null}
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
