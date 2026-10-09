"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bienvenida } from "@/components/sesion/Bienvenida";
import { useClaro, useTexto } from "@/components/ui/Idioma";
import { Mile } from "@/components/ui/Mile";
import type { Clave } from "@/lib/ui/diccionario";

type Rol = "organizer" | "team" | "volunteer" | null;
type Evento = { id: string; nombre: string; rol?: Rol; pendientes?: number };

const ROL: Record<Exclude<Rol, null>, Clave> = {
  organizer: "eventos.organizer",
  team: "eventos.team",
  volunteer: "eventos.volunteer",
};

const CLAVE_BIENVENIDA = "hyto-bienvenida-oculta";

/** The welcome card goes after the page head and can be hidden. The choice is kept in this browser only. */
function BienvenidaColapsable() {
  const t = useTexto();
  const [oculta, setOculta] = useState(false);

  useEffect(() => {
    try {
      setOculta(window.localStorage.getItem(CLAVE_BIENVENIDA) === "1");
    } catch {
      // Storage can be blocked. The card then shows every time.
    }
  }, []);

  function ocultar() {
    setOculta(true);
    try {
      window.localStorage.setItem(CLAVE_BIENVENIDA, "1");
    } catch {
      // Not saved. It comes back next visit.
    }
  }

  if (oculta) return null;
  return (
    <div className="mt-6">
      <Bienvenida
        accion={
          <button type="button" onClick={ocultar}>
            {t("tareas.hideWelcome")}
          </button>
        }
      />
    </div>
  );
}

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

  return (
    <main className="hyto-page hyto-movil-eventos">
      <header className="hyto-eventos-cabeza">
        <div>
          <h1 className="hyto-h1">{t("eventos.title")}</h1>
          {eventos && eventos.length > 0 ? <p className="hyto-sub">{t("eventos.count", { n: eventos.length })}</p> : null}
        </div>
        <div className="hyto-pulgar">
          <Link href="/eventos/nuevo" className="hyto-btn">
            {t("eventos.create")}
          </Link>
          <Link href="/join" className="hyto-btn-line">
            {t("eventos.joinCode")}
          </Link>
        </div>
      </header>
      <BienvenidaColapsable />
      {!eventos ? (
        <div className="hyto-carga-eventos" aria-busy="true">
          <p className="sr-only">{t("eventos.loading")}</p>
          <span className="hyto-bloque" />
          <span className="hyto-bloque" />
        </div>
      ) : error ? (
        <div className="hyto-card hyto-estado-vacio hyto-aparecer" role="alert">
          <Mile estado="rechazado" tamano={72} />
          <h2>{claro(error)}</h2>
          <div className="hyto-pulgar">
            <button type="button" className="hyto-btn" onClick={() => setIntento((actual) => actual + 1)}>
              {t("comunes.tryAgain")}
            </button>
          </div>
        </div>
      ) : eventos.length === 0 ? (
        <div className="hyto-card hyto-estado-vacio hyto-aparecer">
          <Mile estado="icono" tamano={72} />
          <h2>{t("eventos.empty")}</h2>
          <p>{t("eventos.emptyHelp")}</p>
        </div>
      ) : (
        <ul className="hyto-lista-eventos">
          {eventos.map((evento) => (
            <li key={evento.id}>
              <Link href={`/eventos/${evento.id}`} className="hyto-card hyto-evento-fila hyto-aparecer">
                <span className="hyto-evento-nombre">{evento.nombre}</span>
                <span className="hyto-evento-meta">
                  {evento.rol ? t(ROL[evento.rol]) : t("eventos.member")}
                  {" · "}
                  {t(evento.rol === "organizer" ? "eventos.toReview" : "eventos.inReview", { n: evento.pendientes ?? 0 })}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
