"use client";

import Link from "next/link";
import { useState } from "react";
import { Numeros } from "@/components/admin/Numeros";
import { PastillaVeredicto } from "@/components/admin/PastillaVeredicto";
import { volverAlEjemplo } from "@/lib/admin/memoria";
import { vistaAdmin } from "@/lib/admin/vista";
import { montoDeTarea } from "@/lib/integrante/formato";
import { etiquetaTipo, textoVisible } from "@/lib/ui/etiquetas";
import { useVistaAdmin } from "@/components/admin/usarVista";
import type { VistaAdmin } from "@/lib/admin/tipos";

export function Bandeja() {
  const base = useVistaAdmin();
  const [elegida, setElegida] = useState<VistaAdmin | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const vista = elegida ?? base;

  function usarEjemplo() {
    const guardado = volverAlEjemplo();
    setAviso(guardado.aviso);
    if (guardado.aviso) return;
    setElegida(vistaAdmin(guardado.memoria));
  }

  if (!vista) {
    return <p className="text-[var(--suave)]">Loading…</p>;
  }

  return (
    <main>
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">{vista.nombre}</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--suave)]">
          Open a task to see the photo, the recommendation, and the payment.
        </p>
        {vista.propio ? (
          <button type="button" onClick={usarEjemplo} className="mt-3 text-sm text-[var(--suave)]">
            Back to the ZEEK example
          </button>
        ) : null}
      </header>

      <Numeros resumen={vista.resumen} />

      <section className="mt-10">
        <h2 className="text-lg font-semibold tracking-tight">To approve</h2>
        {vista.bandeja.length === 0 ? (
          <p className="mt-4 text-[var(--suave)]">Nothing to approve yet. When a volunteer sends a photo, it shows up here.</p>
        ) : null}
        <div className="mt-4 space-y-4">
          {vista.bandeja.map((tarea) => (
            <article key={tarea.id} className="rounded-3xl bg-[var(--papel)] p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-[var(--suave)]">
                    {etiquetaTipo(tarea.tipo)} · {textoVisible(tarea.miembro)}
                  </p>
                  <h3 className="mt-1 text-xl font-semibold tracking-tight">
                    <Link href={`/revision/${tarea.id}`} className="underline-offset-4 hover:underline">
                      {textoVisible(tarea.titulo)}
                    </Link>
                  </h3>
                </div>
                {tarea.veredicto ? <PastillaVeredicto veredicto={tarea.veredicto} /> : null}
              </div>
              <div className="mt-6 flex items-end justify-between gap-4">
                <p className="text-2xl font-semibold tracking-tight">{montoDeTarea(tarea)}</p>
                <Link href={`/revision/${tarea.id}`} className="text-sm font-semibold">
                  Review
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      {aviso ? <p className="mt-8 text-sm leading-6 text-[var(--suave)]">{aviso}</p> : null}

      {vista.ejemplo ? (
        <p className="mt-8 text-sm leading-6 text-[var(--suave)]">Sample event, until live tasks load.</p>
      ) : null}
    </main>
  );
}
