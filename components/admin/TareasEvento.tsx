"use client";

import { useState } from "react";
import { useClaro, useIdioma, useTexto } from "@/components/ui/Idioma";
import { montoDeTarea } from "@/lib/integrante/formato";
import { etiquetaEstado, textoVisible } from "@/lib/ui/etiquetas";
import type { EstadoTarea, TipoTarea } from "@/lib/integrante/tipos";

export type FilaTareaEvento = {
  id: string;
  titulo: string;
  tipo: TipoTarea;
  monto: string;
  tope: string | null;
  condicion: string;
  estado: string;
  miembroId: string;
  bloqueo: string | null;
};

type Borrador = {
  titulo: string;
  condicion: string;
  monto: string;
  tope: string;
  miembroId: string;
};

export function TareasEvento({
  tareas,
  miembros,
}: {
  tareas: FilaTareaEvento[];
  miembros: { usuarioId: string; email: string }[];
}) {
  const t = useTexto();
  const claro = useClaro();
  const idioma = useIdioma();
  const [filas, setFilas] = useState(tareas);
  const [aviso, setAviso] = useState<string | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [borrador, setBorrador] = useState<Borrador | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function asignar(tareaId: string, usuarioId: string) {
    setAviso(null);
    const respuesta = await fetch(`/api/tareas/${encodeURIComponent(tareaId)}/asignar`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ usuarioId }),
    });
    if (!respuesta.ok) {
      const cuerpo = (await respuesta.json().catch(() => null)) as { aviso?: string } | null;
      setAviso(cuerpo?.aviso ?? "Could not assign that task.");
      return;
    }
    setFilas((actuales) => actuales.map((fila) => (fila.id === tareaId ? { ...fila, miembroId: usuarioId } : fila)));
  }

  function abrir(tarea: FilaTareaEvento) {
    setAviso(null);
    setEditandoId(tarea.id);
    setBorrador({
      titulo: tarea.titulo,
      condicion: tarea.condicion,
      monto: tarea.monto,
      tope: tarea.tope ?? tarea.monto,
      miembroId: tarea.miembroId,
    });
  }

  async function guardar(tarea: FilaTareaEvento) {
    if (!borrador || guardando) return;
    setAviso(null);
    setGuardando(true);
    const cuerpo: Record<string, string> = {
      titulo: borrador.titulo,
      condicion: borrador.condicion,
      monto: borrador.monto,
      miembroId: borrador.miembroId,
    };
    if (tarea.tipo === "reembolso") cuerpo.tope = borrador.tope;
    const respuesta = await fetch(`/api/tareas/${encodeURIComponent(tarea.id)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(cuerpo),
    });
    const json = (await respuesta.json().catch(() => null)) as {
      aviso?: string;
      tarea?: { titulo: string; condicion: string; monto: string; tope: string | null; miembroId: string };
    } | null;
    setGuardando(false);
    if (!respuesta.ok || !json?.tarea) {
      setAviso(json?.aviso ?? "Could not save that task.");
      if (respuesta.status === 409 && json?.aviso) {
        setFilas((actuales) => actuales.map((fila) => (fila.id === tarea.id ? { ...fila, bloqueo: json.aviso ?? fila.bloqueo } : fila)));
        setEditandoId(null);
        setBorrador(null);
      }
      return;
    }
    setFilas((actuales) =>
      actuales.map((fila) =>
        fila.id === tarea.id
          ? {
              ...fila,
              titulo: json.tarea!.titulo,
              condicion: json.tarea!.condicion,
              monto: json.tarea!.monto,
              tope: json.tarea!.tope,
              miembroId: json.tarea!.miembroId,
            }
          : fila,
      ),
    );
    setEditandoId(null);
    setBorrador(null);
  }

  if (filas.length === 0) {
    return (
      <main className="hyto-page">
        <p className="text-lg font-semibold">{t("eventos.noTasks")}</p>
      </main>
    );
  }

  return (
    <main className="hyto-page">
      <ul className="grid gap-3">
        {filas.map((tarea) => {
          const editando = editandoId === tarea.id && borrador && !tarea.bloqueo;
          return (
            <li key={tarea.id} className={`hyto-card grid gap-3 p-5 ${editando ? "" : "sm:grid-cols-[1fr_16rem] sm:items-start"}`}>
              <div>
                <p className="text-lg font-semibold">{textoVisible(tarea.titulo, idioma)}</p>
                <p className="mt-1 text-sm text-[var(--suave)]">
                  {etiquetaEstado(tarea.estado as EstadoTarea, idioma)} · {montoDeTarea(tarea)}
                </p>
                {tarea.condicion ? <p className="mt-2 text-sm text-[var(--suave)]">{textoVisible(tarea.condicion, idioma)}</p> : null}
              </div>
              {editando && borrador ? (
                <form
                  className="grid gap-4 sm:grid-cols-2"
                  onSubmit={(evento) => {
                    evento.preventDefault();
                    void guardar(tarea);
                  }}
                >
                  <label className="block text-sm text-[var(--suave)] sm:col-span-2" htmlFor={`titulo-${tarea.id}`}>
                    {t("eventos.titleLabel")}
                    <input
                      id={`titulo-${tarea.id}`}
                      value={borrador.titulo}
                      onChange={(evento) => setBorrador({ ...borrador, titulo: evento.target.value })}
                      className="hyto-input mt-2"
                    />
                  </label>
                  <label className="block text-sm text-[var(--suave)] sm:col-span-2" htmlFor={`condicion-${tarea.id}`}>
                    {t("eventos.photoMust")}
                    <input
                      id={`condicion-${tarea.id}`}
                      value={borrador.condicion}
                      onChange={(evento) => setBorrador({ ...borrador, condicion: evento.target.value })}
                      className="hyto-input mt-2"
                    />
                  </label>
                  <label className="block text-sm text-[var(--suave)]" htmlFor={`monto-${tarea.id}`}>
                    {t("eventos.amount")}
                    <input
                      id={`monto-${tarea.id}`}
                      inputMode="decimal"
                      value={borrador.monto}
                      onChange={(evento) => setBorrador({ ...borrador, monto: evento.target.value })}
                      className="hyto-input mt-2"
                    />
                  </label>
                  {tarea.tipo === "reembolso" ? (
                    <label className="block text-sm text-[var(--suave)]" htmlFor={`tope-${tarea.id}`}>
                      {t("eventos.limitUsdc")}
                      <input
                        id={`tope-${tarea.id}`}
                        inputMode="decimal"
                        value={borrador.tope}
                        onChange={(evento) => setBorrador({ ...borrador, tope: evento.target.value })}
                        className="hyto-input mt-2"
                      />
                    </label>
                  ) : null}
                  <label className="block text-sm text-[var(--suave)] sm:col-span-2" htmlFor={`asignar-editar-${tarea.id}`}>
                    {t("eventos.assign")}
                    <select
                      id={`asignar-editar-${tarea.id}`}
                      className="hyto-input mt-2"
                      value={borrador.miembroId}
                      onChange={(evento) => setBorrador({ ...borrador, miembroId: evento.target.value })}
                    >
                      <option value="">{t("comunes.unassigned")}</option>
                      {miembros.map((persona) => (
                        <option key={persona.usuarioId} value={persona.usuarioId}>
                          {persona.email}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="flex flex-wrap gap-2 sm:col-span-2">
                    <button type="submit" className="hyto-btn is-inline px-5" disabled={guardando}>
                      {t("eventos.save")}
                    </button>
                    <button
                      type="button"
                      className="hyto-btn-line is-inline px-5"
                      onClick={() => {
                        setEditandoId(null);
                        setBorrador(null);
                      }}
                    >
                      {t("eventos.cancel")}
                    </button>
                  </div>
                </form>
              ) : (
                <div>
                  <label className="text-sm" htmlFor={`asignar-${tarea.id}`}>
                    {t("eventos.assign")}
                    <select
                      id={`asignar-${tarea.id}`}
                      className="hyto-input mt-2"
                      value={tarea.miembroId}
                      disabled={Boolean(tarea.bloqueo)}
                      aria-describedby={tarea.bloqueo ? `bloqueo-${tarea.id}` : undefined}
                      onChange={(evento) => void asignar(tarea.id, evento.target.value)}
                    >
                      <option value="">{t("comunes.unassigned")}</option>
                      {miembros.map((persona) => (
                        <option key={persona.usuarioId} value={persona.usuarioId}>
                          {persona.email}
                        </option>
                      ))}
                    </select>
                  </label>
                  {tarea.bloqueo ? (
                    <p id={`bloqueo-${tarea.id}`} className="mt-3 text-sm text-[var(--suave)]">
                      {claro(tarea.bloqueo)}
                    </p>
                  ) : (
                    <button type="button" className="hyto-btn-line is-inline mt-3 px-5" onClick={() => abrir(tarea)}>
                      {t("eventos.edit")}
                    </button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {aviso ? (
        <p role="alert" className="mt-4 text-sm text-[var(--peligro)]">
          {claro(aviso)}
        </p>
      ) : null}
    </main>
  );
}
