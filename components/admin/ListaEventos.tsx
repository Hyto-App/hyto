"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Evento = { id: string; nombre: string };

export function ListaEventos() {
  const [eventos, setEventos] = useState<Evento[] | null>(null);
  const [vacio, setVacio] = useState(false);

  useEffect(() => {
    let vivo = true;
    void fetch("/api/proyectos")
      .then(async (respuesta) => {
        if (!vivo) return;
        if (respuesta.status === 404) {
          setEventos([]);
          setVacio(true);
          return;
        }
        if (!respuesta.ok) {
          setEventos([]);
          return;
        }
        const cuerpo = (await respuesta.json()) as { proyectos?: Evento[] };
        const lista = cuerpo.proyectos ?? [];
        setEventos(lista);
        setVacio(lista.length === 0);
      })
      .catch(() => {
        if (vivo) setEventos([]);
      });
    return () => {
      vivo = false;
    };
  }, []);

  if (!eventos) {
    return (
      <main className="hyto-page" aria-busy="true">
        <div className="hyto-skel">
          <i />
          <span>
            <i />
            <i />
          </span>
        </div>
      </main>
    );
  }

  return (
    <main className="hyto-page">
      <h1 className="hyto-title">My events</h1>
      {vacio ? (
        <div className="hyto-card mt-6 px-6 py-10">
          <p className="text-lg font-semibold">No events yet.</p>
          <p className="mt-2 text-sm text-[var(--suave)]">Create one or join with a code.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/eventos/nuevo" className="hyto-btn max-w-xs">
              Create event
            </Link>
            <Link href="/join" className="hyto-btn-line max-w-xs">
              Join with code
            </Link>
          </div>
        </div>
      ) : (
        <ul className="mt-6 grid gap-3">
          {eventos.map((evento) => (
            <li key={evento.id}>
              <Link href={`/eventos/${evento.id}`} className="hyto-card block p-5 text-lg font-semibold">
                {evento.nombre}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
