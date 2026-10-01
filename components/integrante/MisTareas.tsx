"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { claseBoton } from "@/components/integrante/BotonPrincipal";
import { PastillaEstado } from "@/components/integrante/EstadoTarea";
import { leerMemoria } from "@/lib/integrante/almacen";
import { formatearMonto, montoDeTarea } from "@/lib/integrante/formato";
import { etiquetaEstado, etiquetaTipo, textoVisible } from "@/lib/ui/etiquetas";
import { listarTareas } from "@/lib/integrante/rutas";
import type { EstadoTarea, Tarea } from "@/lib/integrante/tipos";

type Filtro = "all" | EstadoTarea;

const FILTROS: { id: Filtro; etiqueta: string }[] = [
  { id: "all", etiqueta: "All" },
  { id: "pendiente", etiqueta: "Pending" },
  { id: "en revisión", etiqueta: etiquetaEstado("en revisión") },
  { id: "pagado", etiqueta: etiquetaEstado("pagado") },
];

function suma(tareas: Tarea[], estado: EstadoTarea): number {
  return tareas.filter((tarea) => tarea.estado === estado).reduce((total, tarea) => total + (Number(tarea.tope ?? tarea.monto) || 0), 0);
}

export function MisTareas() {
  const [miembroId, setMiembroId] = useState("voluntario-1");
  const [direccion, setDireccion] = useState<string | null>(null);
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [ejemplo, setEjemplo] = useState(false);
  const [lista, setLista] = useState(false);
  const [filtro, setFiltro] = useState<Filtro>("all");
  const [selId, setSelId] = useState<string | null>(null);

  useEffect(() => {
    const memoria = leerMemoria();
    setMiembroId(memoria.miembroId);
  }, []);

  useEffect(() => {
    let activo = true;
    const memoria = leerMemoria();
    setDireccion(memoria.cuentas[miembroId]?.direccion ?? null);
    listarTareas({ miembroId, wallet: memoria.cuentas[miembroId]?.direccion }, { estados: memoria.estados }).then(
      (resultado) => {
        if (!activo) return;
        setTareas(resultado.tareas);
        setEjemplo(resultado.ejemplo);
        setLista(true);
      },
    );
    return () => {
      activo = false;
    };
  }, [miembroId]);

  const siguiente = lista ? (tareas.find((tarea) => tarea.estado === "pendiente") ?? null) : null;
  const visibles = filtro === "all" ? tareas : tareas.filter((tarea) => tarea.estado === filtro);
  const seleccion = visibles.find((tarea) => tarea.id === selId) ?? siguiente ?? visibles[0] ?? null;
  const cuenta = (estado: EstadoTarea) => tareas.filter((tarea) => tarea.estado === estado).length;

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
              <p className="hyto-amount mt-2 text-xl">{cuenta("pendiente")} tasks</p>
            </article>
          </div>
        ) : null}
      </header>

      {!lista ? (
        <p className="text-[var(--suave)]" aria-live="polite">
          Loading tasks…
        </p>
      ) : null}

      {lista && tareas.length === 0 ? (
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
          <div className="hyto-chips flex lg:hidden" role="tablist" aria-label="Filter tasks">
            {FILTROS.map((item) => (
              <button key={item.id} type="button" role="tab" aria-selected={filtro === item.id} onClick={() => setFiltro(item.id)}>
                {item.etiqueta} {item.id === "all" ? tareas.length : cuenta(item.id)}
              </button>
            ))}
          </div>
          <div className="hyto-tabs hidden lg:flex" role="tablist" aria-label="Filter tasks">
            {FILTROS.map((item) => (
              <button key={item.id} type="button" role="tab" aria-selected={filtro === item.id} onClick={() => setFiltro(item.id)}>
                {item.etiqueta} {item.id === "all" ? tareas.length : cuenta(item.id)}
              </button>
            ))}
          </div>
          <div className="hyto-split">
            <div className="grid gap-3">
              {visibles.map((tarea) => {
                const esSiguiente = siguiente?.id === tarea.id;
                const activo = seleccion?.id === tarea.id;
                return (
                  <Link key={tarea.id} href={`/tareas/${tarea.id}`} className={`hyto-card block p-5 ${activo ? "is-on" : ""}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm text-[var(--suave)]">{etiquetaTipo(tarea.tipo)}</p>
                        <h2 className="mt-1 text-xl font-semibold tracking-tight">{textoVisible(tarea.titulo)}</h2>
                      </div>
                      <p className="hyto-amount text-lg">{montoDeTarea(tarea)}</p>
                    </div>
                    <div className="mt-4">
                      <PastillaEstado estado={tarea.estado} />
                    </div>
                    {tarea.condicion ? <p className="mt-3 text-sm leading-6 text-[var(--suave)]">{textoVisible(tarea.condicion)}</p> : null}
                  </Link>
                );
              })}
            </div>
            {seleccion ? (
              <aside className="hyto-panel">
                <p className="text-sm text-[var(--suave)]">{seleccion.id === siguiente?.id ? "Next up" : etiquetaTipo(seleccion.tipo)}</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">{textoVisible(seleccion.titulo)}</h2>
                <p className="hyto-amount mt-4 text-3xl">{montoDeTarea(seleccion)}</p>
                <p className="mt-1 text-sm text-[var(--suave)]">Held until the organizer approves the photo.</p>
                {seleccion.condicion ? (
                  <>
                    <p className="mt-5 text-sm font-medium">Your photo must show</p>
                    <p className="mt-2 text-sm leading-6 text-[var(--suave)]">{textoVisible(seleccion.condicion)}</p>
                  </>
                ) : null}
                <p className="mt-5 text-sm leading-6 text-[var(--suave)]">Laya checks your photo, then the organizer approves.</p>
              </aside>
            ) : null}
          </div>
        </>
      ) : null}

      {siguiente ? (
        <Link href={`/tareas/${siguiente.id}`} aria-label={`Upload evidence for ${textoVisible(siguiente.titulo)}`} className={`${claseBoton} mt-6`}>
          Upload evidence
        </Link>
      ) : null}

    </main>
  );
}
