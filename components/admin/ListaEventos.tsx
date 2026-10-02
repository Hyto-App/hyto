"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Rol = "organizer" | "team" | "volunteer" | null;
type Evento = { id: string; nombre: string; rol?: Rol; pendientes?: number };

const ROL: Record<Exclude<Rol, null>, string> = {
  organizer: "Organizer",
  team: "Team",
  volunteer: "Volunteer",
};

export function ListaEventos() {
  const [eventos, setEventos] = useState<Evento[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let vivo = true;
    setEventos(null);
    setError(null);
    void fetch("/api/proyectos")
      .then(async (respuesta) => {
        if (!vivo) return;
        if (respuesta.status === 404) {
          setEventos([]);
          return;
        }
        if (!respuesta.ok) {
          setError("Could not load events.");
          setEventos([]);
          return;
        }
        const cuerpo = (await respuesta.json()) as { proyectos?: Evento[] };
        setEventos(cuerpo.proyectos ?? []);
      })
      .catch(() => {
        if (!vivo) return;
        setError("Could not load events.");
        setEventos([]);
      });
    return () => {
      vivo = false;
    };
  }, [intento]);

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
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="hyto-title">Events</h1>
        <div className="flex flex-wrap gap-2">
          <Link href="/eventos/nuevo" className="hyto-btn is-inline px-5">
            + Create
          </Link>
          <Link href="/join" className="hyto-btn-line is-inline px-5">
            Join with code
          </Link>
        </div>
      </header>
      {error ? (
        <div className="hyto-card mt-6 px-6 py-10">
          <p role="alert" className="text-lg font-semibold">
            {error}
          </p>
          <button type="button" className="hyto-btn mt-6 max-w-xs" onClick={() => setIntento((actual) => actual + 1)}>
            Try again
          </button>
        </div>
      ) : eventos.length === 0 ? (
        <div className="hyto-card mt-6 px-6 py-10">
          <p className="text-lg font-semibold">No events yet.</p>
          <p className="mt-2 text-sm text-[var(--suave)]">Create one or join with a code.</p>
        </div>
      ) : (
        <ul className="mt-6 grid gap-3">
          {eventos.map((evento) => (
            <li key={evento.id}>
              <Link href={`/eventos/${evento.id}`} className="hyto-card block p-5">
                <p className="text-lg font-semibold">{evento.nombre}</p>
                <p className="mt-1 text-sm text-[var(--suave)]">
                  {evento.rol ? ROL[evento.rol] : "Member"}
                  {" · "}
                  {evento.pendientes ?? 0} {evento.rol === "organizer" ? "to review" : "in review"}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
