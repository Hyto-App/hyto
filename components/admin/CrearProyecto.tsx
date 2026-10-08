"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BotonPrincipal } from "@/components/integrante/BotonPrincipal";
import { useClaro, useIdioma, useTexto } from "@/components/ui/Idioma";
import { useModoDemo } from "@/components/sesion/InsigniaDemo";
import { normalizarMonto } from "@/lib/admin/vista";
import { AVISO_MONTO_INVALIDO } from "@/lib/escrow/monto";
import { avisoMontoEntrada, escribirMonto } from "@/lib/tareas/monto-entrada";
import { formatearMonto } from "@/lib/integrante/formato";
import type { DificultadTarea, PrioridadTarea, TipoTarea } from "@/lib/integrante/tipos";
import { AVISO_PROYECTO_DEMO } from "@/lib/sesion/demo";
import { contextoAbierto } from "@/lib/ui/campos-evento";
import { AreaTexto, Contador, IconoCandado, ZonaPortada } from "./CamposEvento";

const TIPOS_PORTADA = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES_PORTADA = 5 * 1024 * 1024;

type Fila = {
  clave: string;
  titulo: string;
  tipo: TipoTarea;
  monto: string;
  condicion: string;
  asignado: string;
  prioridad: PrioridadTarea;
  dificultad: DificultadTarea | "";
};

const FILA_INICIAL: Fila = {
  clave: "1",
  titulo: "",
  tipo: "trabajo",
  monto: "",
  condicion: "",
  asignado: "",
  prioridad: "normal",
  dificultad: "",
};

function filaNueva(): Fila {
  return {
    clave: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    titulo: "",
    tipo: "trabajo",
    monto: "",
    condicion: "",
    asignado: "",
    prioridad: "normal",
    dificultad: "",
  };
}

export function CrearProyecto() {
  const router = useRouter();
  const modoDemo = useModoDemo();
  const t = useTexto();
  const claro = useClaro();
  const idioma = useIdioma();
  const [nombre, setNombre] = useState("");
  const [filas, setFilas] = useState<Fila[]>([FILA_INICIAL]);
  const [aviso, setAviso] = useState<string | null>(null);
  const [descripcion, setDescripcion] = useState("");
  const [contextoIa, setContextoIa] = useState("");
  const [portada, setPortada] = useState<File | null>(null);
  const [contextoAbiertoPorUsuario, setContextoAbiertoPorUsuario] = useState(false);
  const [creadoId, setCreadoId] = useState<string | null>(null);

  function cambiar(clave: string, cambio: Partial<Fila>) {
    setFilas((actuales) => actuales.map((fila) => (fila.clave === clave ? { ...fila, ...cambio } : fila)));
  }

  async function fondear() {
    if (modoDemo) {
      setAviso(AVISO_PROYECTO_DEMO);
      return;
    }
    const nombreLimpio = nombre.trim();
    if (!nombreLimpio) {
      setAviso("Enter an event name.");
      return;
    }
    if (portada && !TIPOS_PORTADA.includes(portada.type)) {
      setAviso(t("eventos.coverType"));
      return;
    }
    if (portada && portada.size > MAX_BYTES_PORTADA) {
      setAviso(t("eventos.coverSize"));
      return;
    }

    const tareas = filas
      .map((fila) => ({
        titulo: fila.titulo.trim(),
        tipo: fila.tipo,
        monto: normalizarMonto(fila.monto),
        montoCrudo: fila.monto.trim(),
        condicion: fila.condicion.trim(),
        asignado: fila.asignado.trim(),
        prioridad: fila.prioridad,
        dificultad: fila.dificultad || null,
      }))
      .filter((fila) => fila.titulo || fila.montoCrudo);

    if (tareas.length === 0) {
      setAviso("Add at least one task with a title and an amount.");
      return;
    }
    if (tareas.some((fila) => !fila.titulo)) {
      setAviso("Every task needs a title.");
      return;
    }
    if (tareas.some((fila) => fila.montoCrudo && !fila.monto)) {
      setAviso(AVISO_MONTO_INVALIDO);
      return;
    }
    if (tareas.some((fila) => !fila.monto)) {
      setAviso("Every task needs an amount greater than zero.");
      return;
    }

    const payload = tareas.map(({ montoCrudo: _omit, ...fila }) => fila);

    let respuesta: Response;
    try {
      respuesta = await fetch("/api/proyectos", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ nombre: nombreLimpio, descripcion: descripcion.trim(), contextoIa: contextoIa.trim(), tareas: payload }),
      });
    } catch {
      setAviso("Could not reach the server. Check your connection and try again.");
      return;
    }
    const cuerpo = (await respuesta.json().catch(() => null)) as { aviso?: string; proyecto?: { id?: string } } | null;
    if (!respuesta.ok || !cuerpo?.proyecto?.id) {
      setAviso(cuerpo?.aviso ?? "Could not create the event. Please try again.");
      return;
    }
    const id = cuerpo.proyecto.id;
    if (portada) {
      const datos = new FormData();
      datos.set("portada", portada);
      const subida = await fetch(`/api/eventos/${encodeURIComponent(id)}/portada`, { method: "POST", body: datos }).catch(() => null);
      if (!subida?.ok) {
        setCreadoId(id);
        setAviso(t("eventos.coverNotSaved"));
        return;
      }
    }
    router.push(`/eventos/${id}`);
  }

  let trabajo = 0;
  let reembolso = 0;
  for (const fila of filas) {
    const monto = normalizarMonto(fila.monto);
    if (!monto) continue;
    const centavos = Math.round(Number(monto) * 100);
    if (fila.tipo === "reembolso") reembolso += centavos;
    else trabajo += centavos;
  }
  const total = ((trabajo + reembolso) / 100).toString();

  return (
    <main className="hyto-page">
      <p className="hyto-crumb">
        <Link href="/eventos">{t("eventos.title")}</Link>
        <span aria-hidden="true">/</span>
        <span>{t("eventos.newEvent")}</span>
      </p>
      <header className="hyto-page-head">
        <div>
          <h1 className="hyto-title">{t("eventos.createTitle")}</h1>
        </div>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div>
          <section className="hyto-card hyto-seccion" aria-labelledby="detalles-titulo">
            <h2 id="detalles-titulo" className="hyto-seccion-titulo">
              {t("eventos.detailsTitle")}
            </h2>
            <label className="mt-4 block text-sm text-[var(--suave)]" htmlFor="nombre-proyecto">
              {t("eventos.name")}
            </label>
            <input
              id="nombre-proyecto"
              value={nombre}
              onChange={(evento) => setNombre(evento.target.value)}
              className="hyto-input mt-2"
            />

            <div className="mt-6">
              <ZonaPortada
                id="portada-proyecto"
                archivo={portada}
                nombreEvento={nombre}
                etiqueta={t("eventos.coverPhoto")}
                ayudaId="portada-ayuda"
                onArchivo={setPortada}
              />
              <p id="portada-ayuda" className="mt-2 text-xs text-[var(--suave)]">
                {t("eventos.coverHelp")}
              </p>
            </div>

            <label className="mt-6 block text-sm text-[var(--suave)]" htmlFor="descripcion-proyecto">
              {t("eventos.description")}
            </label>
            <AreaTexto id="descripcion-proyecto" valor={descripcion} max={1000} filas={5} ayudaId="descripcion-ayuda" onCambio={setDescripcion} />
            <p id="descripcion-ayuda" className="mt-2 text-xs text-[var(--suave)]">
              {t("eventos.descriptionHelp")}
            </p>
            <Contador largo={descripcion.length} max={1000} />
          </section>

          <section className="hyto-card hyto-seccion" aria-labelledby="mile-titulo">
            <h2 id="mile-titulo" className="hyto-seccion-titulo">
              <IconoCandado />
              {t("eventos.mileTitle")}
            </h2>
            <p className="hyto-seccion-nota">{t("eventos.mileLock")}</p>
            {contextoAbierto(contextoIa, contextoAbiertoPorUsuario) ? (
              <div className="mt-4">
                <label className="block text-sm text-[var(--suave)]" htmlFor="contexto-ia-proyecto">
                  {t("eventos.aiContext")}
                </label>
                <AreaTexto id="contexto-ia-proyecto" valor={contextoIa} max={2000} filas={6} ayudaId="contexto-ia-ayuda" onCambio={setContextoIa} />
                <p id="contexto-ia-ayuda" className="mt-2 text-xs text-[var(--suave)]">
                  {t("eventos.aiContextHelp")}
                </p>
                <Contador largo={contextoIa.length} max={2000} />
                {contextoIa.length === 0 ? (
                  <button type="button" onClick={() => setContextoAbiertoPorUsuario(false)} className="hyto-btn-line is-inline mt-3 px-4">
                    {t("eventos.mileHide")}
                  </button>
                ) : null}
              </div>
            ) : (
              <button type="button" onClick={() => setContextoAbiertoPorUsuario(true)} aria-expanded="false" className="hyto-btn-line is-inline mt-4 px-5">
                {t("eventos.mileAdd")}
              </button>
            )}
          </section>

          <div className="mt-8 space-y-4">
            {filas.map((fila, indice) => (
              <fieldset key={fila.clave} className="hyto-card p-5">
                <legend className="text-sm text-[var(--suave)]">{t("eventos.taskN", { n: indice + 1 })}</legend>
                <label className="mt-3 block text-sm text-[var(--suave)]" htmlFor={`titulo-${fila.clave}`}>
                  {t("eventos.titleLabel")}
                </label>
                <input
                  id={`titulo-${fila.clave}`}
                  value={fila.titulo}
                  onChange={(evento) => cambiar(fila.clave, { titulo: evento.target.value })}
                  className="hyto-input mt-2"
                />
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-[var(--suave)]">{t("eventos.type")}</p>
                    <div className="hyto-opciones mt-2" role="group" aria-label={t("eventos.type")}>
                      <button
                        type="button"
                        aria-pressed={fila.tipo === "trabajo"}
                        onClick={() => cambiar(fila.clave, { tipo: "trabajo" })}
                        className={`hyto-opcion ${fila.tipo === "trabajo" ? "bg-[var(--tinta)] text-[var(--fondo)]" : "border border-[var(--borde)] text-[var(--suave)]"}`}
                      >
                        {t("tipos.trabajo")}
                      </button>
                      <button
                        type="button"
                        aria-pressed={fila.tipo === "reembolso"}
                        onClick={() => cambiar(fila.clave, { tipo: "reembolso" })}
                        className={`hyto-opcion ${fila.tipo === "reembolso" ? "bg-[var(--tinta)] text-[var(--fondo)]" : "border border-[var(--borde)] text-[var(--suave)]"}`}
                      >
                        {t("tipos.reembolso")}
                      </button>
                    </div>
                    <label className="sr-only" htmlFor={`tipo-${fila.clave}`}>
                      {t("eventos.type")}
                    </label>
                    <select
                      id={`tipo-${fila.clave}`}
                      value={fila.tipo}
                      onChange={(evento) => cambiar(fila.clave, { tipo: evento.target.value as TipoTarea })}
                      className="sr-only"
                    >
                      <option value="trabajo">{t("tipos.trabajo")}</option>
                      <option value="reembolso">{t("tipos.reembolso")}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-[var(--suave)]" htmlFor={`monto-${fila.clave}`}>
                      {t("eventos.amount")}
                    </label>
                    <input
                      id={`monto-${fila.clave}`}
                      inputMode="decimal"
                      value={fila.monto}
                      aria-invalid={avisoMontoEntrada(fila.monto) ? true : undefined}
                      aria-describedby={avisoMontoEntrada(fila.monto) ? `monto-error-${fila.clave}` : undefined}
                      onChange={(evento) => cambiar(fila.clave, { monto: escribirMonto(evento.target.value) })}
                      className="hyto-input mt-2"
                    />
                    {avisoMontoEntrada(fila.monto) ? (
                      <p id={`monto-error-${fila.clave}`} role="alert" className="mt-2 text-sm text-[var(--peligro)]">
                        {avisoMontoEntrada(fila.monto)}
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="block text-sm text-[var(--suave)]" htmlFor={`prioridad-${fila.clave}`}>
                    {t("clasificacion.priority")}
                    <select
                      id={`prioridad-${fila.clave}`}
                      value={fila.prioridad}
                      onChange={(evento) => cambiar(fila.clave, { prioridad: evento.target.value as PrioridadTarea })}
                      className="hyto-input mt-2"
                    >
                      <option value="normal">{t("clasificacion.normal")}</option>
                      <option value="high">{t("clasificacion.high")}</option>
                    </select>
                  </label>
                  <label className="block text-sm text-[var(--suave)]" htmlFor={`dificultad-${fila.clave}`}>
                    {t("clasificacion.difficulty")}
                    <select
                      id={`dificultad-${fila.clave}`}
                      value={fila.dificultad}
                      onChange={(evento) => cambiar(fila.clave, { dificultad: evento.target.value as DificultadTarea | "" })}
                      className="hyto-input mt-2"
                    >
                      <option value="">{t("clasificacion.notSet")}</option>
                      <option value="easy">{t("clasificacion.easy")}</option>
                      <option value="medium">{t("clasificacion.medium")}</option>
                      <option value="hard">{t("clasificacion.hard")}</option>
                    </select>
                  </label>
                </div>
                <label className="mt-4 block text-sm text-[var(--suave)]" htmlFor={`condicion-${fila.clave}`}>
                  {t("eventos.photoMust")}
                </label>
                <input
                  id={`condicion-${fila.clave}`}
                  value={fila.condicion}
                  onChange={(evento) => cambiar(fila.clave, { condicion: evento.target.value })}
                  className="hyto-input mt-2"
                />
                <label className="mt-4 block text-sm text-[var(--suave)]" htmlFor={`asignado-${fila.clave}`}>
                  {t("eventos.assignee")}
                </label>
                <input
                  id={`asignado-${fila.clave}`}
                  type="email"
                  value={fila.asignado}
                  onChange={(evento) => cambiar(fila.clave, { asignado: evento.target.value })}
                  className="hyto-input mt-2"
                />
                {filas.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => setFilas((actuales) => actuales.filter((item) => item.clave !== fila.clave))}
                    className="hyto-btn-danger is-inline mt-4 px-5"
                  >
                    {t("eventos.remove", { name: fila.titulo.trim() || t("eventos.taskWord") })}
                  </button>
                ) : null}
              </fieldset>
            ))}
          </div>

          <button type="button" onClick={() => setFilas((actuales) => [...actuales, filaNueva()])} className="hyto-btn-line is-inline mt-4 px-5">
            {t("eventos.addTask")}
          </button>
        </div>

        <aside className="hyto-panel lg:sticky lg:top-6">
          <h2 className="text-base font-semibold">{t("eventos.budget")}</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-[var(--suave)]">{t("eventos.workTasks")}</dt>
              <dd className="hyto-amount">{formatearMonto((trabajo / 100).toString(), idioma)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[var(--suave)]">{t("eventos.reimbursements")}</dt>
              <dd className="hyto-amount">{formatearMonto((reembolso / 100).toString(), idioma)}</dd>
            </div>
            <div className="flex justify-between gap-3 border-t border-[var(--linea)] pt-3 text-base font-semibold">
              <dt>{t("eventos.total")}</dt>
              <dd className="hyto-amount">{formatearMonto(total, idioma)}</dd>
            </div>
          </dl>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <BotonPrincipal type="button" onClick={() => void fondear()} disabled={modoDemo || creadoId !== null}>
              {t("eventos.createEvent")}
            </BotonPrincipal>
            {creadoId ? (
              <Link href={`/eventos/${creadoId}`} className="hyto-btn-line is-inline px-5">
                {t("eventos.openEvent")}
              </Link>
            ) : null}
            {modoDemo || aviso ? (
              <p role="alert" className="text-sm leading-6 text-[var(--suave)]">
                {claro(modoDemo ? AVISO_PROYECTO_DEMO : (aviso ?? ""))}
              </p>
            ) : null}
          </div>
        </aside>
      </div>
    </main>
  );
}
