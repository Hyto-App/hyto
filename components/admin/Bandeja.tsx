"use client";

import Link from "next/link";
import { Invitar } from "@/components/eventos/Invitar";
import { useState } from "react";
import { Numeros } from "@/components/admin/Numeros";
import { PastillaVeredicto } from "@/components/admin/PastillaVeredicto";
import { volverAlEjemplo } from "@/lib/admin/memoria";
import { vistaAdmin } from "@/lib/admin/vista";
import { formatearMonto, montoDeTarea } from "@/lib/integrante/formato";
import { etiquetaTipo, textoVisible } from "@/lib/ui/etiquetas";
import { useVistaAdmin } from "@/components/admin/usarVista";
import { iniciales } from "@/components/ui/Marca";
import type { Veredicto, VistaAdmin } from "@/lib/admin/tipos";

type Filtro = "all" | Veredicto;

const FILTROS: { id: Filtro; etiqueta: string }[] = [
  { id: "all", etiqueta: "All" },
  { id: "cumplió", etiqueta: "Meets" },
  { id: "parcial", etiqueta: "Partial" },
  { id: "insuficiente", etiqueta: "Doesn't meet" },
];

export function Bandeja() {
  const base = useVistaAdmin();
  const [elegida, setElegida] = useState<VistaAdmin | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<Filtro>("all");
  const [selId, setSelId] = useState<string | null>(null);
  const vista = elegida ?? base;

  function usarEjemplo() {
    const guardado = volverAlEjemplo();
    setAviso(guardado.aviso);
    if (guardado.aviso) return;
    setElegida(vistaAdmin(guardado.memoria));
    setSelId(null);
  }

  if (!vista) {
    return (
      <main className="hyto-page" aria-busy="true">
        <p className="hyto-sub">Loading…</p>
        <div className="mt-4 grid gap-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="hyto-skel">
              <i />
              <span>
                <i />
                <i />
              </span>
            </div>
          ))}
        </div>
      </main>
    );
  }

  const visibles = filtro === "all" ? vista.bandeja : vista.bandeja.filter((tarea) => tarea.veredicto === filtro);
  const seleccion = visibles.find((tarea) => tarea.id === selId) ?? visibles[0] ?? null;
  const presupuesto = Number(vista.resumen.presupuesto) || 0;
  const pagado = Number(vista.resumen.pagado) || 0;
  const ancho = presupuesto > 0 ? Math.min(100, (pagado / presupuesto) * 100) : 0;

  return (
    <main className="hyto-page">
      <header className="hyto-page-head">
        <div>
          <p className="text-sm font-semibold">{vista.nombre}</p>
          <h1 className="hyto-title mt-2">My events</h1>
          <p className="hyto-sub">
            {vista.tareas.length === 0
              ? "No events yet. Create one or join with a code."
              : vista.bandeja.length === 0
                ? "Nothing to approve yet."
                : `${vista.bandeja.length} submission${vista.bandeja.length === 1 ? "" : "s"} waiting for your review`}
          </p>
          {vista.tareas.length > 0 ? (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Invitar />
              <Link href="/informe" className="text-sm font-medium">
                Report
              </Link>
            </div>
          ) : null}
          {vista.tareas.length === 0 ? (
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/proyectos/nuevo" className="hyto-btn">
                Create event
              </Link>
              <Link href="/unirse" className="hyto-btn-line">
                Join with code
              </Link>
            </div>
          ) : null}
          {vista.propio ? (
            <button type="button" onClick={usarEjemplo} className="mt-3 text-sm text-[var(--suave)]">
              Back to the ZEEK example
            </button>
          ) : null}
        </div>
        <div className="min-w-[220px] flex-1 sm:max-w-sm">
          <div className="mb-2 flex items-center justify-between text-sm text-[var(--suave)]">
            <span>Paid of budget</span>
            <span className="hyto-amount text-[var(--tinta)]">{formatearMonto(vista.resumen.pendiente)} left</span>
          </div>
          <div className="hyto-bar" aria-hidden="true">
            <span style={{ width: `${ancho}%` }} />
          </div>
        </div>
      </header>

      <Numeros resumen={vista.resumen} />

      <section className="mt-8">
        <h2 className="text-lg font-semibold tracking-tight">To approve</h2>
        <p className="mt-1 text-sm text-[var(--suave)]">Oldest first</p>
        <div className="hyto-tabs mt-4 flex" role="tablist" aria-label="Filter submissions">
          {FILTROS.map((item) => (
            <button key={item.id} type="button" aria-pressed={filtro === item.id} onClick={() => setFiltro(item.id)}>
              {item.etiqueta}
            </button>
          ))}
        </div>

        {vista.tareas.length === 0 ? null : vista.bandeja.length === 0 ? (
          <div className="hyto-card mt-4 px-6 py-10 text-center">
            <p className="text-lg font-semibold">All caught up</p>
            <p className="mt-2 text-[var(--suave)]">Nothing to approve yet. When a volunteer sends a photo, it shows up here.</p>
            <Link href="/informe" className="hyto-btn-line mx-auto mt-6 max-w-xs">
              View report
            </Link>
          </div>
        ) : (
          <div className="hyto-inbox">
            <div className="grid gap-2">
              {visibles.length === 0 ? <p className="text-sm text-[var(--suave)]">Nothing in this view.</p> : null}
              {visibles.map((tarea) => {
                const activo = seleccion?.id === tarea.id;
                return (
                  <button
                    key={tarea.id}
                    type="button"
                    onClick={() => setSelId(tarea.id)}
                    className={`hyto-row ${activo ? "is-on bg-[var(--papel)]" : "hover:bg-[var(--papel)]"}`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="hyto-avatar">{iniciales(textoVisible(tarea.miembro))}</span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-start justify-between gap-3">
                          <span className="block font-semibold">{textoVisible(tarea.miembro)}</span>
                          <span className="hyto-amount text-sm">{montoDeTarea(tarea)}</span>
                        </span>
                        <span className="mt-1 block text-sm text-[var(--suave)]">{textoVisible(tarea.titulo)}</span>
                        <span className="mt-2 flex items-center justify-between gap-2">
                          <span className="text-xs text-[var(--suave)]">{etiquetaTipo(tarea.tipo)}</span>
                          {tarea.veredicto ? <PastillaVeredicto veredicto={tarea.veredicto} /> : null}
                        </span>
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {seleccion ? (
              <article className="hyto-card overflow-hidden">
                <div className="flex h-48 items-end bg-[var(--superficie-2)] p-6">
                  <p className="text-sm text-[var(--suave)]">No photo in the list. Open the review to see it.</p>
                </div>
                <div className="p-5">
                  <p className="text-sm text-[var(--suave)]">{etiquetaTipo(seleccion.tipo)} · {textoVisible(seleccion.miembro)}</p>
                  <h3 className="mt-1 text-2xl font-semibold tracking-tight">{textoVisible(seleccion.titulo)}</h3>
                  <p className="hyto-amount mt-2 text-xl">{montoDeTarea(seleccion)}</p>
                  {seleccion.frase ? <p className="mt-3 text-sm leading-6">{textoVisible(seleccion.frase)}</p> : null}
                  <Link href={`/revision/${seleccion.id}`} className="hyto-btn mt-5">
                    Review
                  </Link>
                </div>
              </article>
            ) : (
              <div />
            )}

            {seleccion ? (
              <aside className="hyto-panel">
                <p className="text-sm text-[var(--suave)]">Recommendation</p>
                <div className="mt-3">{seleccion.veredicto ? <PastillaVeredicto veredicto={seleccion.veredicto} /> : <p className="text-sm text-[var(--suave)]">No recommendation yet</p>}</div>
                {seleccion.condicion ? (
                  <>
                    <p className="mt-5 text-sm font-medium">Photo must show</p>
                    <p className="mt-2 text-sm leading-6 text-[var(--suave)]">{textoVisible(seleccion.condicion)}</p>
                  </>
                ) : null}
                <p className="mt-6 text-sm leading-6 text-[var(--suave)]">Laya only suggests. You approve every payment.</p>
                <Link href={`/revision/${seleccion.id}`} className="mt-4 inline-block text-sm font-semibold">
                  Open review
                </Link>
              </aside>
            ) : (
              <div />
            )}
          </div>
        )}
      </section>

      {aviso ? <p className="mt-8 text-sm leading-6 text-[var(--suave)]">{aviso}</p> : null}

      {vista.ejemplo ? <p className="mt-8 text-sm leading-6 text-[var(--suave)]">Sample event, until live tasks load.</p> : null}
    </main>
  );
}
