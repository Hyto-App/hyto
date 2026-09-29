"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Numeros } from "@/components/admin/Numeros";
import { PastillaVeredicto } from "@/components/admin/PastillaVeredicto";
import { leerMemoriaAdmin, volverAlEjemplo } from "@/lib/admin/memoria";
import { vistaAdmin } from "@/lib/admin/vista";
import { montoDeTarea } from "@/lib/integrante/formato";
import type { VistaAdmin } from "@/lib/admin/tipos";

export function Bandeja() {
  const [vista, setVista] = useState<VistaAdmin | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    setVista(vistaAdmin(leerMemoriaAdmin()));
  }, []);

  function usarEjemplo() {
    const guardado = volverAlEjemplo();
    setAviso(guardado.aviso);
    if (guardado.aviso) return;
    setVista(vistaAdmin(guardado.memoria));
  }

  if (!vista) {
    return <p className="text-[var(--suave)]">Cargando…</p>;
  }

  return (
    <main>
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">{vista.nombre}</h1>
        {vista.propio ? (
          <button type="button" onClick={usarEjemplo} className="mt-3 text-sm text-[var(--suave)]">
            Volver al ejemplo de ZEEK
          </button>
        ) : null}
      </header>

      <Numeros resumen={vista.resumen} />

      <section className="mt-10">
        <h2 className="text-lg font-semibold tracking-tight">Por aprobar</h2>
        {vista.bandeja.length === 0 ? <p className="mt-4 text-[var(--suave)]">Nada por aprobar.</p> : null}
        <div className="mt-4 space-y-4">
          {vista.bandeja.map((tarea) => (
            <article key={tarea.id} className="rounded-3xl bg-[var(--papel)] p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm capitalize text-[var(--suave)]">
                    {tarea.tipo} · {tarea.miembro}
                  </p>
                  <h3 className="mt-1 text-xl font-semibold tracking-tight">
                    <Link href={`/revision/${tarea.id}`} className="underline-offset-4 hover:underline">
                      {tarea.titulo}
                    </Link>
                  </h3>
                </div>
                {tarea.veredicto ? <PastillaVeredicto veredicto={tarea.veredicto} /> : null}
              </div>
              <div className="mt-6 flex items-end justify-between gap-4">
                <p className="text-2xl font-semibold tracking-tight">{montoDeTarea(tarea)}</p>
                <Link href={`/revision/${tarea.id}`} className="text-sm font-semibold">
                  Revisar
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      {aviso ? (
        <p role="alert" className="mt-8 text-sm leading-6 text-[var(--suave)]">
          {aviso}
        </p>
      ) : null}

      {vista.ejemplo ? (
        <p className="mt-8 text-sm leading-6 text-[var(--suave)]">Vista de ejemplo, hasta que las rutas respondan.</p>
      ) : null}
    </main>
  );
}
