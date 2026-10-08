"use client";

import Link from "next/link";
import { useState } from "react";
import { FichaVoluntario } from "@/components/perfil/Ficha";
import { useIdioma, useTexto } from "@/components/ui/Idioma";
import { TextoClaro } from "@/components/ui/TextoClaro";
import type { FichaVoluntario as Ficha } from "@/lib/perfil/reglas";
import { lineaMontoTarea, textosSaldo } from "@/lib/integrante/formato";
import { montoBloqueable } from "@/lib/tareas/monto-bloqueable";
import { faltaParaBloquear } from "@/lib/escrow/saldo";
import { avisoMontoEntrada, escribirMonto } from "@/lib/tareas/monto-entrada";
import { estadoConFoto, etiquetaDificultad, etiquetaEstado, etiquetaPrioridad, textoVisible } from "@/lib/ui/etiquetas";
import type { DificultadTarea, EstadoTarea, PrioridadTarea, TipoTarea } from "@/lib/integrante/tipos";

export type FilaTareaEvento = {
  id: string;
  titulo: string;
  tipo: TipoTarea;
  monto: string;
  tope: string | null;
  condicion: string;
  estado: string;
  miembroId: string;
  prioridad: PrioridadTarea;
  dificultad: DificultadTarea | null;
  bloqueo: string | null;
  tieneFoto: boolean;
  montoConfirmado?: string | null;
  montoRevisado?: string | null;
};

type Borrador = {
  titulo: string;
  condicion: string;
  monto: string;
  tope: string;
  miembroId: string;
};

function faltaDeBorrador(tarea: FilaTareaEvento, borrador: Borrador, saldo: string | null) {
  const subida = montoBloqueable(tarea, {
    monto: borrador.monto,
    tope: tarea.tipo === "reembolso" ? borrador.tope : undefined,
  });
  if (!subida) return null;
  return faltaParaBloquear(saldo, subida);
}

function FichaAsignada({
  miembros,
  miembroId,
}: {
  miembros: { usuarioId: string; email?: string; ficha?: Ficha }[];
  miembroId: string;
}) {
  const persona = miembros.find((item) => item.usuarioId === miembroId);
  if (!persona?.ficha) return null;
  return <FichaVoluntario ficha={persona.ficha} nombre={persona.email} />;
}

export function TareasEvento({
  tareas,
  miembros,
  saldo = null,
}: {
  tareas: FilaTareaEvento[];
  miembros: { usuarioId: string; email: string; ficha?: Ficha }[];
  saldo?: string | null;
}) {
  const t = useTexto();
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

  async function clasificar(tareaId: string, cambio: { prioridad?: PrioridadTarea; dificultad?: DificultadTarea | null }) {
    setAviso(null);
    const previa = filas.find((fila) => fila.id === tareaId);
    setFilas((actuales) => actuales.map((fila) => (fila.id === tareaId ? { ...fila, ...cambio } : fila)));
    const respuesta = await fetch(`/api/tareas/${encodeURIComponent(tareaId)}/clasificar`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(cambio),
    });
    if (!respuesta.ok) {
      if (previa) {
        setFilas((actuales) =>
          actuales.map((fila) => (fila.id === tareaId ? { ...fila, prioridad: previa.prioridad, dificultad: previa.dificultad } : fila)),
        );
      }
      const cuerpo = (await respuesta.json().catch(() => null)) as { aviso?: string } | null;
      setAviso(cuerpo?.aviso ?? t("clasificacion.saveFail"));
    }
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
    const montoMal = avisoMontoEntrada(borrador.monto) ?? (tarea.tipo === "reembolso" ? avisoMontoEntrada(borrador.tope) : null);
    if (montoMal) {
      setAviso(montoMal);
      return;
    }
    const falta = faltaDeBorrador(tarea, borrador, saldo);
    if (falta) {
      setAviso(t("errores.saldoNoCubre", textosSaldo(falta, idioma)));
      return;
    }
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
          const prioridad = etiquetaPrioridad(tarea.prioridad, idioma);
          const dificultad = etiquetaDificultad(tarea.dificultad, idioma);
          const editando = editandoId === tarea.id && borrador && !tarea.bloqueo;
          const faltaFila = editando && borrador ? faltaDeBorrador(tarea, borrador, saldo) : null;
          return (
            <li key={tarea.id} className="hyto-card grid gap-4 p-5">
              <div className="min-w-0">
                <p className="text-lg font-semibold">{textoVisible(tarea.titulo, idioma)}</p>
                <p className="mt-1 text-sm text-[var(--suave)]">
                  {etiquetaEstado(estadoConFoto(tarea.estado, tarea.tieneFoto) as EstadoTarea, idioma)} · {lineaMontoTarea(tarea, idioma, (amount) => t("eventos.limit", { amount }))}
                </p>
                {prioridad || dificultad ? (
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
                ) : null}
                {!editando && tarea.condicion ? <p className="mt-2 text-sm text-[var(--suave)]">{textoVisible(tarea.condicion, idioma)}</p> : null}
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
                      aria-invalid={avisoMontoEntrada(borrador.monto) ? true : undefined}
                      onChange={(evento) => setBorrador({ ...borrador, monto: escribirMonto(evento.target.value) })}
                      className="hyto-input mt-2"
                    />
                    {avisoMontoEntrada(borrador.monto) ? (
                      <p role="alert" className="mt-2 text-sm text-[var(--peligro)]">
                        {avisoMontoEntrada(borrador.monto)}
                      </p>
                    ) : null}
                  </label>
                  {tarea.tipo === "reembolso" ? (
                    <label className="block text-sm text-[var(--suave)]" htmlFor={`tope-${tarea.id}`}>
                      {t("eventos.limitUsdc")}
                      <input
                        id={`tope-${tarea.id}`}
                        inputMode="decimal"
                        value={borrador.tope}
                        aria-invalid={avisoMontoEntrada(borrador.tope) || faltaFila ? true : undefined}
                        aria-describedby={faltaFila ? `saldo-${tarea.id}` : undefined}
                        onChange={(evento) => setBorrador({ ...borrador, tope: escribirMonto(evento.target.value) })}
                        className="hyto-input mt-2"
                      />
                    </label>
                  ) : null}
                  {faltaFila ? (
                    <p id={`saldo-${tarea.id}`} role="alert" className="text-sm leading-6 text-[var(--peligro)] sm:col-span-2">
                      {t("errores.saldoNoCubre", textosSaldo(faltaFila, idioma))}
                    </p>
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
                    <button type="submit" className="hyto-btn is-inline px-5" disabled={guardando || Boolean(faltaFila)}>
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
                  <FichaAsignada miembros={miembros} miembroId={tarea.miembroId} />
                  {tarea.bloqueo ? (
                    <p id={`bloqueo-${tarea.id}`} className="mt-3 text-sm text-[var(--suave)]">
                      <TextoClaro mensaje={tarea.bloqueo} />
                    </p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {tarea.estado === "pendiente" && !tarea.tieneFoto && !tarea.bloqueo ? (
                      <Link href={`/revision/${tarea.id}`} className="hyto-btn is-inline px-5">
                        {t("pago.lockBudget")}
                      </Link>
                    ) : (
                      <Link href={`/revision/${tarea.id}`} className="hyto-btn-line is-inline px-5">
                        {t("bandeja.openReview")}
                      </Link>
                    )}
                    {tarea.bloqueo ? null : (
                      <button type="button" className="hyto-btn-line is-inline px-5" onClick={() => abrir(tarea)}>
                        {t("eventos.edit")}
                      </button>
                    )}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="text-sm" htmlFor={`prioridad-${tarea.id}`}>
                  {t("clasificacion.priority")}
                  <select
                    id={`prioridad-${tarea.id}`}
                    className="hyto-input mt-2"
                    value={tarea.prioridad}
                    onChange={(evento) => void clasificar(tarea.id, { prioridad: evento.target.value as PrioridadTarea })}
                  >
                    <option value="normal">{t("clasificacion.normal")}</option>
                    <option value="high">{t("clasificacion.high")}</option>
                  </select>
                </label>
                <label className="text-sm" htmlFor={`dificultad-${tarea.id}`}>
                  {t("clasificacion.difficulty")}
                  <select
                    id={`dificultad-${tarea.id}`}
                    className="hyto-input mt-2"
                    value={tarea.dificultad ?? ""}
                    onChange={(evento) =>
                      void clasificar(tarea.id, { dificultad: evento.target.value === "" ? null : (evento.target.value as DificultadTarea) })
                    }
                  >
                    <option value="">{t("clasificacion.notSet")}</option>
                    <option value="easy">{t("clasificacion.easy")}</option>
                    <option value="medium">{t("clasificacion.medium")}</option>
                    <option value="hard">{t("clasificacion.hard")}</option>
                  </select>
                </label>
              </div>
            </li>
          );
        })}
      </ul>
      {aviso ? (
        <p role="alert" className="mt-4 text-sm text-[var(--peligro)]">
          <TextoClaro mensaje={aviso} />
        </p>
      ) : null}
    </main>
  );
}
