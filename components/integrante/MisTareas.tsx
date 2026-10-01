"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { claseBoton } from "@/components/integrante/BotonPrincipal";
import { InsigniaDemo } from "@/components/sesion/InsigniaDemo";
import { Salir } from "@/components/sesion/Salir";
import { SalirDemo } from "@/components/sesion/SalirDemo";
import { PastillaEstado } from "@/components/integrante/EstadoTarea";
import { leerMemoria, guardarMiembro } from "@/lib/integrante/almacen";
import { acortarDireccion, montoDeTarea } from "@/lib/integrante/formato";
import { etiquetaTipo, textoVisible } from "@/lib/ui/etiquetas";
import { MIEMBROS } from "@/lib/integrante/identidades";
import { listarTareas } from "@/lib/integrante/rutas";
import type { Tarea } from "@/lib/integrante/tipos";

export function MisTareas() {
  const [miembroId, setMiembroId] = useState("voluntario-1");
  const [direccion, setDireccion] = useState<string | null>(null);
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [ejemplo, setEjemplo] = useState(false);
  const [lista, setLista] = useState(false);

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

  function elegir(id: string) {
    if (id === miembroId) return;
    guardarMiembro(id);
    setMiembroId(id);
    setLista(false);
  }

  const siguiente = lista ? (tareas.find((tarea) => tarea.estado === "pendiente") ?? null) : null;

  return (
    <main>
      <header className="mb-8">
        <p className="text-sm text-[var(--suave)]">
          Hyto
          <InsigniaDemo />
          <SalirDemo />
          <Salir className="ml-3 align-middle" />
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">My tasks</h1>
        {ejemplo ? (
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm" role="group" aria-label="Member">
            {MIEMBROS.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={item.id === miembroId}
                onClick={() => elegir(item.id)}
                className={item.id === miembroId ? "font-semibold" : "text-[var(--suave)]"}
              >
                {textoVisible(item.nombre)}
              </button>
            ))}
          </div>
        ) : null}
        {direccion ? <p className="mt-3 font-mono text-sm text-[var(--suave)]">{acortarDireccion(direccion)}</p> : null}
      </header>

      {!lista ? (
        <p className="text-[var(--suave)]" aria-live="polite">
          Loading tasks…
        </p>
      ) : null}

      {lista && tareas.length === 0 ? <p className="text-lg text-[var(--suave)]">You have no tasks.</p> : null}

      {lista && tareas.length > 0 ? (
        <div className="space-y-4">
          {tareas.map((tarea) => {
            const esSiguiente = siguiente?.id === tarea.id;
            return (
              <article key={tarea.id} className="rounded-3xl bg-[var(--papel)] p-6">
                <p className="text-sm text-[var(--suave)]">{etiquetaTipo(tarea.tipo)}</p>
                <h2 className="mt-1 text-xl font-semibold tracking-tight">
                  <Link href={`/tareas/${tarea.id}`} className="underline-offset-4 hover:underline">
                    {textoVisible(tarea.titulo)}
                  </Link>
                </h2>
                {tarea.condicion ? <p className="mt-2 text-sm leading-6 text-[var(--suave)]">{textoVisible(tarea.condicion)}</p> : null}
                <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
                  <p className="text-2xl font-semibold tracking-tight">{montoDeTarea(tarea)}</p>
                  <PastillaEstado estado={tarea.estado} />
                </div>
                {!esSiguiente && tarea.estado === "pendiente" ? (
                  <Link
                    href={`/tareas/${tarea.id}`}
                    aria-label={`Upload evidence for ${textoVisible(tarea.titulo)}`}
                    className="mt-5 inline-block text-sm font-medium text-[var(--suave)]"
                  >
                    Upload this evidence
                  </Link>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : null}

      {siguiente ? (
        <Link href={`/tareas/${siguiente.id}`} aria-label={`Upload evidence for ${textoVisible(siguiente.titulo)}`} className={`${claseBoton} mt-6`}>
          Upload evidence
        </Link>
      ) : null}

      {ejemplo && lista ? (
        <p className="mt-6 text-sm leading-6 text-[var(--suave)]">Example view, until the routes respond.</p>
      ) : null}

      <p className="mt-10">
        <Link href="/cuentas" className="text-sm text-[var(--suave)]">
          Demo accounts
        </Link>
      </p>
    </main>
  );
}
