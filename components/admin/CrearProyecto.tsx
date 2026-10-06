"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BotonPrincipal } from "@/components/integrante/BotonPrincipal";
import { useClaro, useTexto } from "@/components/ui/Idioma";
import { useModoDemo } from "@/components/sesion/InsigniaDemo";
import { normalizarMonto } from "@/lib/admin/vista";
import { AVISO_MONTO_INVALIDO } from "@/lib/escrow/monto";
import { formatearMonto } from "@/lib/integrante/formato";
import type { DificultadTarea, PrioridadTarea, TipoTarea } from "@/lib/integrante/tipos";
import { AVISO_PROYECTO_DEMO } from "@/lib/sesion/demo";

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
  const [nombre, setNombre] = useState("");
  const [filas, setFilas] = useState<Fila[]>([FILA_INICIAL]);
  const [aviso, setAviso] = useState<string | null>(null);

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
        body: JSON.stringify({ nombre: nombreLimpio, tareas: payload }),
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
    router.push(`/eventos/${cuerpo.proyecto.id}`);
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
          <label className="block text-sm text-[var(--suave)]" htmlFor="nombre-proyecto">
            {t("eventos.name")}
          </label>
          <input
            id="nombre-proyecto"
            value={nombre}
            onChange={(evento) => setNombre(evento.target.value)}
            className="hyto-input mt-2"
          />

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
                      onChange={(evento) => cambiar(fila.clave, { monto: evento.target.value })}
                      className="hyto-input mt-2"
                    />
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="block text-sm text-[var(--suave)]" htmlFor={`prioridad-${fila.clave}`}>
                    Priority
                    <select
                      id={`prioridad-${fila.clave}`}
                      value={fila.prioridad}
                      onChange={(evento) => cambiar(fila.clave, { prioridad: evento.target.value as PrioridadTarea })}
                      className="hyto-input mt-2"
                    >
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                    </select>
                  </label>
                  <label className="block text-sm text-[var(--suave)]" htmlFor={`dificultad-${fila.clave}`}>
                    Difficulty
                    <select
                      id={`dificultad-${fila.clave}`}
                      value={fila.dificultad}
                      onChange={(evento) => cambiar(fila.clave, { dificultad: evento.target.value as DificultadTarea | "" })}
                      className="hyto-input mt-2"
                    >
                      <option value="">Not set</option>
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
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
              <dd className="hyto-amount">{formatearMonto((trabajo / 100).toString())}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[var(--suave)]">{t("eventos.reimbursements")}</dt>
              <dd className="hyto-amount">{formatearMonto((reembolso / 100).toString())}</dd>
            </div>
            <div className="flex justify-between gap-3 border-t border-[var(--linea)] pt-3 text-base font-semibold">
              <dt>{t("eventos.total")}</dt>
              <dd className="hyto-amount">{formatearMonto(total)}</dd>
            </div>
          </dl>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <BotonPrincipal type="button" onClick={() => void fondear()} disabled={modoDemo}>
              {t("eventos.createEvent")}
            </BotonPrincipal>
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
