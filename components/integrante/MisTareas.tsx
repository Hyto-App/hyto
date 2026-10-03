"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PastillaEstado } from "@/components/integrante/EstadoTarea";
import { useModoDemo } from "@/components/sesion/InsigniaDemo";
import { formatearMonto, montoDeTarea } from "@/lib/integrante/formato";
import { agruparPorEvento, idsMejorPagadas, ordenarPorPago, type OrdenTareas } from "@/lib/integrante/orden-pago";
import { etiquetaDificultad, etiquetaEstado, etiquetaPrioridad, etiquetaTipo, textoVisible } from "@/lib/ui/etiquetas";
import { listarTareas } from "@/lib/integrante/rutas";
import type { EstadoTarea, Tarea } from "@/lib/integrante/tipos";

type Filtro = "all" | EstadoTarea;

const ORDENES: { id: OrdenTareas; etiqueta: string }[] = [
  { id: "prioridad", etiqueta: "Priority" },
  { id: "mayor", etiqueta: "Highest pay" },
  { id: "defecto", etiqueta: "Default" },
];

const FILTROS: { id: Filtro; etiqueta: string }[] = [
  { id: "all", etiqueta: "All" },
  { id: "pendiente", etiqueta: "Pending" },
  { id: "en revisión", etiqueta: etiquetaEstado("en revisión") },
  { id: "pagado", etiqueta: etiquetaEstado("pagado") },
];

function InsigniasClasificacion({ tarea }: { tarea: Tarea }) {
  const prioridad = etiquetaPrioridad(tarea.prioridad);
  const dificultad = etiquetaDificultad(tarea.dificultad);
  if (!prioridad && !dificultad) return null;
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      {prioridad ? (
        <span className="hyto-pill hyto-pill-ok">
          <i className="hyto-dot" aria-hidden="true" />
          {prioridad}
        </span>
      ) : null}
      {dificultad ? (
        <span className="hyto-pill hyto-pill-muted">
          <i className="hyto-dot" aria-hidden="true" />
          {dificultad}
        </span>
      ) : null}
    </div>
  );
}

function suma(tareas: Tarea[], estado: EstadoTarea): number {
  return tareas.filter((tarea) => tarea.estado === estado).reduce((total, tarea) => total + (Number(tarea.tope ?? tarea.monto) || 0), 0);
}

export function MisTareas() {
  const demo = useModoDemo();
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [nombres, setNombres] = useState<Record<string, string>>({});
  const [ejemplo, setEjemplo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lista, setLista] = useState(false);
  const [filtro, setFiltro] = useState<Filtro>("all");
  const [orden, setOrden] = useState<OrdenTareas>("defecto");
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let activo = true;
    setLista(false);
    setError(null);
    listarTareas({ miembroId: "" }, { muestra: demo }).then((resultado) => {
      if (!activo) return;
      setTareas(resultado.tareas);
      setEjemplo(resultado.ejemplo);
      setError(resultado.error);
      setLista(true);
    });
    void fetch("/api/proyectos")
      .then(async (respuesta) => (respuesta.ok ? respuesta.json() : null))
      .then((cuerpo: { proyectos?: { id: string; nombre: string }[] } | null) => {
        if (!activo || !cuerpo?.proyectos) return;
        const mapa: Record<string, string> = {};
        for (const evento of cuerpo.proyectos) mapa[evento.id] = evento.nombre;
        setNombres(mapa);
      })
      .catch(() => undefined);
    return () => {
      activo = false;
    };
  }, [demo, intento]);

  const visibles = filtro === "all" ? tareas : tareas.filter((tarea) => tarea.estado === filtro);
  const cuenta = (estado: EstadoTarea) => tareas.filter((tarea) => tarea.estado === estado).length;
  const mejores = idsMejorPagadas(tareas);
  const porEvento = agruparPorEvento(ordenarPorPago(visibles, orden), orden === "defecto" ? "unir" : "seguir");
  const pendientes = cuenta("pendiente");

  return (
    <main className="hyto-page">
      <header className="hyto-page-head">
        <div>
          <h1 className="hyto-title">My tasks</h1>
        </div>
        {lista && tareas.length > 0 ? (
          <div className="hyto-kpis w-full sm:max-w-md">
            <article>
              <p className="text-sm text-[var(--suave)]">Earned</p>
              <p className="hyto-amount mt-2 text-xl text-[var(--acento-texto)]">{formatearMonto(String(suma(tareas, "pagado")))}</p>
            </article>
            <article>
              <p className="text-sm text-[var(--suave)]">In review</p>
              <p className="hyto-amount mt-2 text-xl">{formatearMonto(String(suma(tareas, "en revisión")))}</p>
            </article>
            <article>
              <p className="text-sm text-[var(--suave)]">To do</p>
              <p className="hyto-amount mt-2 text-xl">
                {pendientes} {pendientes === 1 ? "task" : "tasks"}
              </p>
            </article>
          </div>
        ) : null}
      </header>

      {!lista ? (
        <p className="text-[var(--suave)]" aria-live="polite">
          Loading tasks…
        </p>
      ) : null}

      {lista && error ? (
        <div className="hyto-card px-6 py-10">
          <p role="alert" className="text-lg font-semibold">
            {error}
          </p>
          <button type="button" className="hyto-btn mt-6 max-w-xs" onClick={() => setIntento((actual) => actual + 1)}>
            Try again
          </button>
        </div>
      ) : null}

      {lista && !error && tareas.length === 0 ? (
        <div className="hyto-card px-6 py-10">
          <p className="text-lg font-semibold">No tasks yet.</p>
          <p className="mt-2 text-sm leading-6 text-[var(--suave)]">Join an event with a code.</p>
          <Link href="/join" className="hyto-btn mt-6 max-w-xs">
            Join with code
          </Link>
        </div>
      ) : null}

      {lista && tareas.length > 0 ? (
        <>
          <div className="flex flex-col gap-1 lg:flex-row lg:items-end lg:justify-between">
            <div className="hyto-chips flex lg:hidden" role="tablist" aria-label="Filter tasks">
              {FILTROS.map((item) => (
                <button key={item.id} type="button" role="tab" aria-selected={filtro === item.id} onClick={() => setFiltro(item.id)}>
                  {item.etiqueta} {item.id === "all" ? tareas.length : cuenta(item.id)}
                </button>
              ))}
            </div>
            <div className="hyto-tabs hidden lg:flex lg:min-w-0 lg:flex-1" role="tablist" aria-label="Filter tasks">
              {FILTROS.map((item) => (
                <button key={item.id} type="button" role="tab" aria-selected={filtro === item.id} onClick={() => setFiltro(item.id)}>
                  {item.etiqueta} {item.id === "all" ? tareas.length : cuenta(item.id)}
                </button>
              ))}
            </div>
            <div className="hyto-chips flex items-center" role="group" aria-label="Sort tasks">
              <span className="px-1 text-sm font-medium text-[var(--suave)]">Sort</span>
              {ORDENES.map((item) => (
                <button key={item.id} type="button" aria-pressed={orden === item.id} onClick={() => setOrden(item.id)}>
                  {item.etiqueta}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-8">
            {porEvento.map((grupo, indice) => (
              <section key={`${grupo.proyectoId}-${indice}`}>
                <h2 className="text-sm font-semibold text-[var(--suave)]">{nombres[grupo.proyectoId] ?? "Event"}</h2>
                <div className="mt-3 grid gap-3">
                  {grupo.tareas.map((tarea) => (
                    <article key={tarea.id} className="hyto-card p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm text-[var(--suave)]">{etiquetaTipo(tarea.tipo)}</p>
                          <h3 className="mt-1 text-xl font-semibold tracking-tight">{textoVisible(tarea.titulo)}</h3>
                          <InsigniasClasificacion tarea={tarea} />
                        </div>
                        <p className="hyto-amount shrink-0 text-lg">{montoDeTarea(tarea)}</p>
                      </div>
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <PastillaEstado estado={tarea.estado} />
                        {mejores.has(tarea.id) ? (
                          <span className="hyto-pill hyto-pill-ok">
                            <i className="hyto-dot" aria-hidden="true" />
                            Best paid
                          </span>
                        ) : null}
                      </div>
                      {tarea.estado === "pendiente" ? (
                        <Link href={`/tareas/${tarea.id}`} className="hyto-btn mt-4">
                          Open camera
                        </Link>
                      ) : (
                        <Link href={`/tareas/${tarea.id}`} className="hyto-btn-line mt-4">
                          View task
                        </Link>
                      )}
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </>
      ) : null}

      {ejemplo ? <p className="mt-6 text-sm text-[var(--suave)]">Sample</p> : null}
    </main>
  );
}
