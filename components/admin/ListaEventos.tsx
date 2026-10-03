"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useClaro, useTexto } from "@/components/ui/Idioma";
import type { Clave } from "@/lib/ui/diccionario";

type Rol = "organizer" | "team" | "volunteer" | null;
type Evento = { id: string; nombre: string; rol?: Rol; pendientes?: number };

const ROL: Record<Exclude<Rol, null>, Clave> = {
  organizer: "eventos.organizer",
  team: "eventos.team",
  volunteer: "eventos.volunteer",
};

export function ListaEventos() {
  const t = useTexto();
  const claro = useClaro();
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
        <h1 className="hyto-title">{t("eventos.title")}</h1>
        <div className="flex flex-wrap gap-2">
          <Link href="/eventos/nuevo" className="hyto-btn is-inline px-5">
            {t("eventos.create")}
          </Link>
          <Link href="/join" className="hyto-btn-line is-inline px-5">
            {t("eventos.joinCode")}
          </Link>
        </div>
      </header>
      {error ? (
        <div className="hyto-card mt-6 px-6 py-10">
          <p role="alert" className="text-lg font-semibold">
            {claro(error)}
          </p>
          <button type="button" className="hyto-btn mt-6 max-w-xs" onClick={() => setIntento((actual) => actual + 1)}>
            {t("comunes.tryAgain")}
          </button>
        </div>
      ) : eventos.length === 0 ? (
        <div className="hyto-card mt-6 px-6 py-10">
          <p className="text-lg font-semibold">{t("eventos.empty")}</p>
          <p className="mt-2 text-sm text-[var(--suave)]">{t("eventos.emptyHelp")}</p>
        </div>
      ) : (
        <ul className="mt-6 grid gap-3">
          {eventos.map((evento) => (
            <li key={evento.id}>
              <Link href={`/eventos/${evento.id}`} className="hyto-card block p-5">
                <p className="text-lg font-semibold">{evento.nombre}</p>
                <p className="mt-1 text-sm text-[var(--suave)]">
                  {evento.rol ? t(ROL[evento.rol]) : t("eventos.member")}
                  {" · "}
                  {t((evento.pendientes ?? 0) === 1 ? "eventos.pendingOne" : "eventos.pendingMany", { n: evento.pendientes ?? 0 })}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
