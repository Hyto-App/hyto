"use client";

import { useMemo, useState } from "react";
import { useIdioma, useTexto } from "@/components/ui/Idioma";
import { nombreEnIdioma } from "@/lib/sesion/nombre";
import type { Idioma } from "@/lib/ui/idioma";
import type { Sugerido } from "@/lib/perfil/sugeridos";

export const EVENTO_INVITAR_CORREO = "hyto:invitar-correo";

function nombreEn(persona: Sugerido, idioma: Idioma): string {
  return persona.nombre ? nombreEnIdioma(persona.nombre, idioma) : persona.email;
}

/** Demo names like «Volunteer (demo)» read in the screen's language. */
function useNombreDe() {
  const idioma = useIdioma();
  return (persona: Sugerido) => nombreEn(persona, idioma);
}

function useLinea() {
  const t = useTexto();
  return (persona: Sugerido) => {
    const tareas =
      persona.tareasHechas === 0
        ? t("sugeridos.sinTareas")
        : persona.tareasHechas === 1
          ? t("sugeridos.unaTarea")
          : t("sugeridos.variasTareas", { n: persona.tareasHechas });
    if (!persona.yaTrabajo) return `${t("sugeridos.nuevoEnEvento")} · ${tareas}`;
    const eventos = persona.eventosEnComun === 1 ? t("sugeridos.unEvento") : t("sugeridos.variosEventos", { n: persona.eventosEnComun });
    const linea = t("sugeridos.lineaComun", { eventos, tareas });
    return persona.enEsteEvento ? linea : `${linea} · ${t("sugeridos.noEstaEnEvento")}`;
  };
}

/** Direct invite for someone this organizer already worked with; the server reads the email. */
function useInvitar(proyectoId: string) {
  const [enlaces, setEnlaces] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [enCurso, setEnCurso] = useState<string | null>(null);
  async function invitar(usuarioId: string) {
    setError(null);
    setEnCurso(usuarioId);
    try {
      const respuesta = await fetch(`/api/eventos/${encodeURIComponent(proyectoId)}/invitaciones`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tipo: "direct", usuarioId, rol: "volunteer" }),
      });
      const cuerpo = (await respuesta.json().catch(() => null)) as { secreto?: string; aviso?: string } | null;
      if (!respuesta.ok || !cuerpo?.secreto) {
        setError(cuerpo?.aviso ?? "Could not create the invite.");
        return;
      }
      setEnlaces((actuales) => ({ ...actuales, [usuarioId]: `${window.location.origin}/join/${cuerpo.secreto}` }));
    } finally {
      setEnCurso(null);
    }
  }
  return { enlaces, error, enCurso, invitar };
}

function FilaInvitada({ persona, enlace }: { persona: Sugerido; enlace: string }) {
  const t = useTexto();
  const nombreDe = useNombreDe();
  const [copiado, setCopiado] = useState(false);
  return (
    <div className="grid gap-2 pb-3">
      <p role="status" className="sg-rm">
        {t("sugeridos.invitado", { nombre: nombreDe(persona) })}
      </p>
      <p className="sg-enlace">{enlace}</p>
      <div className="sg-acciones">
        <button
          type="button"
          className="hyto-btn-line is-inline px-4"
          onClick={() =>
            void navigator.clipboard.writeText(enlace).then(() => {
              setCopiado(true);
              window.setTimeout(() => setCopiado(false), 2000);
            })
          }
        >
          {copiado ? t("eventos.copied") : t("sugeridos.copiarEnlace")}
        </button>
      </div>
    </div>
  );
}

function Fila({
  persona,
  elegido,
  accion,
}: {
  persona: Sugerido;
  elegido: boolean;
  accion: React.ReactNode;
}) {
  const linea = useLinea();
  const nombreDe = useNombreDe();
  return (
    <div className="sg-row">
      <div className={`sg-ra${elegido ? " is-on" : ""}`} aria-hidden="true">
        {persona.iniciales}
      </div>
      <div className="sg-datos">
        <p className="sg-rn">{nombreDe(persona)}</p>
        <p className="sg-rm">{linea(persona)}</p>
      </div>
      {accion}
    </div>
  );
}

function filtrar(lista: Sugerido[], busqueda: string): Sugerido[] {
  const q = busqueda.trim().toLowerCase();
  if (!q) return lista;
  return lista.filter((persona) => `${persona.nombre ?? ""} ${persona.email}`.toLowerCase().includes(q));
}

/** Pick one person for a task. «Ya trabajó con usted» first, this event's newcomers next, then invite by email. */
export function SugeridosAsignar({
  proyectoId,
  tarea,
  sugeridos,
  actualId,
  onAsignar,
  onCerrar,
}: {
  proyectoId: string;
  tarea: { id: string; titulo: string };
  sugeridos: Sugerido[];
  actualId: string;
  onAsignar: (usuarioId: string) => Promise<void> | void;
  onCerrar: () => void;
}) {
  const t = useTexto();
  const nombreDe = useNombreDe();
  const [busqueda, setBusqueda] = useState("");
  const [elegido, setElegido] = useState(actualId);
  const [enviando, setEnviando] = useState(false);
  const { enlaces, error, enCurso, invitar } = useInvitar(proyectoId);
  const yaTrabajo = useMemo(() => filtrar(sugeridos.filter((persona) => persona.yaTrabajo), busqueda), [sugeridos, busqueda]);
  const nuevos = useMemo(() => filtrar(sugeridos.filter((persona) => !persona.yaTrabajo && persona.enEsteEvento), busqueda), [sugeridos, busqueda]);
  const persona = sugeridos.find((item) => item.usuarioId === elegido) ?? null;
  const hayGente = sugeridos.length > 0;
  const idTitulo = `sg-titulo-${tarea.id}`;

  function accionPara(item: Sugerido) {
    if (!item.enEsteEvento) {
      if (enlaces[item.usuarioId]) return null;
      return (
        <button
          type="button"
          className="sg-add is-texto"
          aria-label={t("sugeridos.invitarA", { nombre: nombreDe(item) })}
          disabled={enCurso === item.usuarioId}
          onClick={() => void invitar(item.usuarioId)}
        >
          {t("sugeridos.invitar")}
        </button>
      );
    }
    const on = elegido === item.usuarioId;
    return (
      <button
        type="button"
        className={`sg-add${on ? " is-on" : ""}`}
        aria-pressed={on}
        aria-label={t(on ? "sugeridos.quitar" : "sugeridos.elegir", { nombre: nombreDe(item) })}
        onClick={() => setElegido(on ? "" : item.usuarioId)}
      >
        {on ? "✓" : "+"}
      </button>
    );
  }

  function lista(items: Sugerido[]) {
    return (
      <ul className="sg-lista">
        {items.map((item) => (
          <li key={item.usuarioId}>
            <Fila persona={item} elegido={elegido === item.usuarioId} accion={accionPara(item)} />
            {enlaces[item.usuarioId] ? <FilaInvitada persona={item} enlace={enlaces[item.usuarioId]} /> : null}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <section className="sg-panel" aria-labelledby={idTitulo} data-sugeridos="asignar">
      <div>
        <h3 id={idTitulo} className="sg-titulo">
          {t("sugeridos.asignarTitulo", { tarea: tarea.titulo })}
        </h3>
        {hayGente ? <p className="sg-sub">{t("sugeridos.asignarSub")}</p> : null}
      </div>
      {persona ? (
        <div className="sg-chips">
          <span className="sg-chip">
            <span className="sg-mini" aria-hidden="true">
              {persona.iniciales}
            </span>
            <span>{nombreDe(persona)}</span>
            <button type="button" aria-label={t("sugeridos.quitar", { nombre: nombreDe(persona) })} onClick={() => setElegido("")}>
              ×
            </button>
          </span>
        </div>
      ) : null}
      {hayGente ? (
        <>
          <label className="sr-only" htmlFor={`sg-buscar-${tarea.id}`}>
            {t("sugeridos.buscar")}
          </label>
          <input
            id={`sg-buscar-${tarea.id}`}
            className="hyto-input"
            type="search"
            value={busqueda}
            placeholder={t("sugeridos.buscar")}
            onChange={(evento) => setBusqueda(evento.target.value)}
          />
        </>
      ) : (
        <p className="sg-vacio">{t("sugeridos.vacio")}</p>
      )}
      {yaTrabajo.length > 0 ? (
        <div>
          <h4 className="sg-h">{t("sugeridos.yaTrabajo")}</h4>
          {lista(yaTrabajo)}
        </div>
      ) : null}
      {nuevos.length > 0 ? (
        <div>
          <h4 className="sg-h">{t("sugeridos.enEsteEvento")}</h4>
          {lista(nuevos)}
        </div>
      ) : null}
      {hayGente && busqueda.trim() && yaTrabajo.length + nuevos.length === 0 ? <p className="sg-vacio">{t("sugeridos.sinResultados")}</p> : null}
      {error ? (
        <p role="alert" className="text-sm text-[var(--peligro)]">
          {error}
        </p>
      ) : null}
      <button type="button" className="sg-inv" onClick={() => window.dispatchEvent(new CustomEvent(EVENTO_INVITAR_CORREO))}>
        ✉ {t("sugeridos.invitarNuevo")}
      </button>
      <div className="sg-acciones">
        {hayGente ? (
          <button
            type="button"
            className="hyto-btn is-inline px-6"
            disabled={enviando || elegido === actualId}
            onClick={async () => {
              setEnviando(true);
              try {
                await onAsignar(elegido);
              } finally {
                setEnviando(false);
              }
            }}
          >
            {elegido ? t("sugeridos.asignarUna") : t("sugeridos.quitarAsignacion")}
          </button>
        ) : null}
        <button type="button" className="hyto-btn-line is-inline px-6" onClick={onCerrar}>
          {t("sugeridos.cerrar")}
        </button>
      </div>
    </section>
  );
}

/** Inside the invite panel: people from this organizer's other events who are not in this one yet. */
export function SugeridosInvitar({ proyectoId, sugeridos }: { proyectoId: string; sugeridos: Sugerido[] }) {
  const t = useTexto();
  const nombreDe = useNombreDe();
  const { enlaces, error, enCurso, invitar } = useInvitar(proyectoId);
  const fuera = sugeridos.filter((persona) => persona.yaTrabajo && !persona.enEsteEvento);
  return (
    <div className="sg-panel" data-sugeridos="invitar">
      <h3 className="sg-h">{t("sugeridos.yaTrabajo")}</h3>
      {fuera.length === 0 ? (
        <p className="sg-vacio">{t("sugeridos.vacio")}</p>
      ) : (
        <ul className="sg-lista">
          {fuera.map((item) => (
            <li key={item.usuarioId}>
              <Fila
                persona={item}
                elegido={false}
                accion={
                  enlaces[item.usuarioId] ? null : (
                    <button
                      type="button"
                      className="sg-add is-texto"
                      aria-label={t("sugeridos.invitarA", { nombre: nombreDe(item) })}
                      disabled={enCurso === item.usuarioId}
                      onClick={() => void invitar(item.usuarioId)}
                    >
                      {t("sugeridos.invitar")}
                    </button>
                  )
                }
              />
              {enlaces[item.usuarioId] ? <FilaInvitada persona={item} enlace={enlaces[item.usuarioId]} /> : null}
            </li>
          ))}
        </ul>
      )}
      {error ? (
        <p role="alert" className="text-sm text-[var(--peligro)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
