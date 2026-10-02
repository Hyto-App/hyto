"use client";

import Link from "next/link";
import { useState } from "react";
import { Numeros } from "@/components/admin/Numeros";
import { PastillaVeredicto } from "@/components/admin/PastillaVeredicto";
import { volverAlEjemplo } from "@/lib/admin/memoria";
import { vistaAdmin } from "@/lib/admin/vista";
import { montoDeTarea } from "@/lib/integrante/formato";
import { etiquetaTipo, etiquetaVeredicto, textoVisible } from "@/lib/ui/etiquetas";
import { useVistaAdmin } from "@/components/admin/usarVista";
import { iniciales } from "@/components/ui/Marca";
import type { Veredicto, VistaAdmin } from "@/lib/admin/tipos";

type Filtro = "all" | Veredicto;

const FILTROS: { id: Filtro; etiqueta: string }[] = [
  { id: "all", etiqueta: "All" },
  { id: "cumplió", etiqueta: etiquetaVeredicto("cumplió") },
  { id: "parcial", etiqueta: etiquetaVeredicto("parcial") },
  { id: "insuficiente", etiqueta: etiquetaVeredicto("insuficiente") },
];

export function Bandeja({
  proyectoId,
  miembros = [],
}: {
  proyectoId?: string;
  miembros?: { usuarioId: string; email: string }[];
} = {}) {
  const estado = useVistaAdmin(proyectoId);
  const base = estado.vista;
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

  if (estado.error) {
    return (
      <main className="hyto-page">
        <p role="alert">{estado.error}</p>
        <button type="button" className="hyto-btn mt-4 max-w-xs" onClick={estado.reintentar}>
          Try again
        </button>
      </main>
    );
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
  return (
    <main className="hyto-page">
      {proyectoId ? null : (
        <header className="hyto-page-head">
          <div>
            <p className="text-sm font-semibold">{vista.nombre}</p>
            <h1 className="hyto-title mt-2">Inbox</h1>
            <p className="hyto-sub">
              {vista.bandeja.length === 0
                ? "No submissions yet."
                : `${vista.bandeja.length} submission${vista.bandeja.length === 1 ? "" : "s"} waiting for your review`}
            </p>
            {vista.propio ? (
              <button type="button" onClick={usarEjemplo} className="mt-3 text-sm text-[var(--suave)]">
                Back to the ZEEK example
              </button>
            ) : null}
          </div>
        </header>
      )}

      <Numeros resumen={vista.resumen} />

      <section className="mt-8">
        <div className="hyto-tabs mt-4 flex" role="tablist" aria-label="Filter submissions">
          {FILTROS.map((item) => (
            <button key={item.id} type="button" role="tab" aria-selected={filtro === item.id} onClick={() => setFiltro(item.id)}>
              {item.etiqueta}
            </button>
          ))}
        </div>

        {vista.bandeja.length === 0 ? (
          <div className="hyto-card mt-4 px-6 py-10 text-center">
            <p className="text-lg font-semibold">Nothing to approve</p>
            <p className="mt-2 text-[var(--suave)]">When someone sends a photo, it shows up here.</p>
            {proyectoId ? (
              <button type="button" className="hyto-btn mx-auto mt-6 max-w-xs" onClick={() => document.getElementById("invitar")?.click()}>
                Invite
              </button>
            ) : (
              <Link href="/eventos/nuevo" className="hyto-btn mx-auto mt-6 max-w-xs">
                Create event
              </Link>
            )}
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
                <div className="p-5">
                  <p className="text-sm text-[var(--suave)]">{etiquetaTipo(seleccion.tipo)} · {textoVisible(seleccion.miembro)}</p>
                  <h3 className="mt-1 text-2xl font-semibold tracking-tight">{textoVisible(seleccion.titulo)}</h3>
                  <p className="hyto-amount mt-2 text-xl">{montoDeTarea(seleccion)}</p>
                  {seleccion.frase ? <p className="mt-3 text-sm leading-6">{textoVisible(seleccion.frase)}</p> : null}
                  {proyectoId && miembros.length > 0 ? (
                    <label className="mt-4 block text-sm" htmlFor={`asignar-${seleccion.id}`}>
                      Assign
                      <select
                        id={`asignar-${seleccion.id}`}
                        className="hyto-input mt-2"
                        value={seleccion.miembroId}
                        onChange={(evento) => {
                          const usuarioId = evento.target.value;
                          void fetch(`/api/tareas/${encodeURIComponent(seleccion.id)}/asignar`, {
                            method: "POST",
                            headers: { "content-type": "application/json" },
                            body: JSON.stringify({ usuarioId }),
                          }).then(() => estado.reintentar());
                        }}
                      >
                        <option value="">Unassigned</option>
                        {miembros.map((persona) => (
                          <option key={persona.usuarioId} value={persona.usuarioId}>
                            {persona.email}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
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
                <p className="mt-6 text-sm leading-6 text-[var(--suave)]">Mile only suggests. You approve every payment.</p>
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
