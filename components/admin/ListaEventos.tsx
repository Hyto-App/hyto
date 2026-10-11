"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Bienvenida, type PasoBienvenida } from "@/components/sesion/Bienvenida";
import { useModoDemo, useRolDemo } from "@/components/sesion/InsigniaDemo";
import { PrepararUsdc } from "@/components/sesion/PrepararUsdc";
import { useClaro, useTexto } from "@/components/ui/Idioma";
import { leerEstadoUsdc } from "@/lib/integrante/prepararUsdc";
import type { Clave } from "@/lib/ui/diccionario";

type Rol = "organizer" | "team" | "volunteer" | null;
type Evento = { id: string; nombre: string; rol?: Rol; pendientes?: number };

const ROL: Record<Exclude<Rol, null>, Clave> = {
  organizer: "eventos.organizer",
  team: "eventos.team",
  volunteer: "eventos.volunteer",
};

const CLAVE_BIENVENIDA = "hyto-bienvenida-oculta";

/** The welcome card can be hidden. The choice is kept in this browser only. */
function useBienvenidaOculta(): [boolean, () => void] {
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

  return [oculta, ocultar];
}

/** The single next step: open an event (the first with something pending), start the demo, or join with a code. */
function pasoDe(eventos: readonly Evento[], demo: boolean, rolDemo: string | null, puedeCrear: boolean): PasoBienvenida {
  const destacado = eventos.find((evento) => (evento.pendientes ?? 0) > 0) ?? eventos[0];
  if (demo) {
    const href = rolDemo !== "voluntario" && destacado ? `/eventos/${destacado.id}` : "/mis-tareas";
    return { tipo: "demo", href };
  }
  if (destacado) return { tipo: "abrir", href: `/eventos/${destacado.id}`, nombre: destacado.nombre };
  // With no projects, the empty state right below carries both buttons. The card does not repeat them.
  if (eventos.length === 0) return { tipo: "explicar" };
  return { tipo: "unirse", puedeCrear };
}

/**
 * Get ready to be paid stays on Events, outside the welcome, so it is there after the welcome is hidden.
 * It shows only while the account still needs it, or to report how it went.
 */
function CobroEventos() {
  const t = useTexto();
  const demo = useModoDemo();
  const [visible, setVisible] = useState(false);
  const consultar = useCallback(async () => {
    try {
      const listo = await leerEstadoUsdc();
      setVisible(!listo);
      return listo;
    } catch (error) {
      setVisible(true);
      throw error;
    }
  }, []);

  if (demo) return null;
  return (
    <section className="hyto-card hyto-welcome-step mt-6 p-5" hidden={!visible} aria-labelledby="hyto-cobro-title">
      <h2 id="hyto-cobro-title" className="hyto-welcome-step-title">
        {t("bienvenida.cobro")}
      </h2>
      <PrepararUsdc consultar={consultar} />
    </section>
  );
}

export function ListaEventos() {
  const t = useTexto();
  const claro = useClaro();
  const [eventos, setEventos] = useState<Evento[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);
  const demo = useModoDemo();
  const rolDemo = useRolDemo();
  // Any account can open «Crear proyecto» (Pao, 10-oct). Only the demo volunteer role stays on tasks.
  const muestraCrear = !(demo && rolDemo === "voluntario");
  const botones = (
    <div className={`hyto-dos-botones${muestraCrear ? "" : " is-uno"}`}>
      {muestraCrear ? (
        <Link href="/eventos/nuevo" className="hyto-btn">
          {t("crear.botonLista")}
        </Link>
      ) : null}
      <Link href="/join" className="hyto-btn-line">
        {t("eventos.joinCode")}
      </Link>
    </div>
  );
  const [bienvenidaOculta, ocultarBienvenida] = useBienvenidaOculta();
  // The welcome waits for the list, so its one step is the right one.
  const conBienvenida = !bienvenidaOculta && eventos !== null && !error;

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
    <main className="hyto-page">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="hyto-h1">{t("eventos.title")}</h1>
        {eventos && eventos.length === 0 && !error ? null : botones}
      </header>
      {conBienvenida ? (
        <div className="mt-6">
          <Bienvenida
            paso={pasoDe(eventos ?? [], demo, rolDemo, muestraCrear)}
            accion={
              <button type="button" onClick={ocultarBienvenida}>
                {t("tareas.hideWelcome")}
              </button>
            }
          />
        </div>
      ) : null}
      {!eventos ? (
        <div className="hyto-skel mt-6" aria-busy="true">
          <i />
          <span>
            <i />
            <i />
          </span>
        </div>
      ) : (
        <>
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
            <div className="hyto-tarjeta hyto-estado-vacio is-izquierda mt-6">
              <h2>{t("eventos.empty")}</h2>
              <p>{t(muestraCrear ? "eventos.emptyHelp" : "eventos.emptyHelpJoin")}</p>
              {botones}
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
                      {t(evento.rol === "organizer" ? "eventos.toReview" : "eventos.inReview", { n: evento.pendientes ?? 0 })}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <CobroEventos />
        </>
      )}
    </main>
  );
}
