"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BotonPrincipal } from "@/components/integrante/BotonPrincipal";
import { useModoDemo } from "@/components/sesion/InsigniaDemo";
import { guardarProyecto } from "@/lib/admin/memoria";
import { normalizarMonto } from "@/lib/admin/vista";
import { formatearMonto } from "@/lib/integrante/formato";
import type { TipoTarea } from "@/lib/integrante/tipos";
import { AVISO_PROYECTO_DEMO } from "@/lib/sesion/demo";

type Fila = {
  clave: string;
  titulo: string;
  tipo: TipoTarea;
  monto: string;
};

const FILA_INICIAL: Fila = { clave: "1", titulo: "", tipo: "trabajo", monto: "" };

function filaNueva(): Fila {
  return { clave: `${Date.now()}-${Math.random().toString(16).slice(2)}`, titulo: "", tipo: "trabajo", monto: "" };
}

export function CrearProyecto() {
  const router = useRouter();
  const modoDemo = useModoDemo();
  const [nombre, setNombre] = useState("");
  const [filas, setFilas] = useState<Fila[]>([FILA_INICIAL]);
  const [aviso, setAviso] = useState<string | null>(null);

  function cambiar(clave: string, cambio: Partial<Fila>) {
    setFilas((actuales) => actuales.map((fila) => (fila.clave === clave ? { ...fila, ...cambio } : fila)));
  }

  function fondear() {
    if (modoDemo) {
      setAviso(AVISO_PROYECTO_DEMO);
      return;
    }
    const tareas = filas
      .map((fila) => ({
        titulo: fila.titulo.trim(),
        tipo: fila.tipo,
        monto: normalizarMonto(fila.monto),
      }))
      .filter((fila) => fila.titulo || fila.monto);

    const nombreLimpio = nombre.trim();
    const montosValidos = tareas.every((fila) => fila.titulo && fila.monto);
    if (!nombreLimpio || tareas.length === 0 || !montosValidos) {
      setAviso("Enter a name and at least one task with an amount.");
      return;
    }

    const guardado = guardarProyecto({
      nombre: nombreLimpio,
      tareas: tareas.map((fila, indice) => ({
        id: `nueva-${indice + 1}`,
        titulo: fila.titulo,
        tipo: fila.tipo,
        monto: fila.monto!,
      })),
    });
    if (guardado.aviso) {
      setAviso(guardado.aviso);
      return;
    }
    router.push("/");
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
        <span>Projects</span>
        <span aria-hidden="true">/</span>
        <span>New project</span>
      </p>
      <header className="hyto-page-head">
        <div>
          <h1 className="hyto-title">Create project</h1>
          <p className="hyto-sub">
            Name each task and its amount in US dollars. Work is a fixed amount. A reimbursement is a cap. Saving does not move money. You lock each budget from the task review.
          </p>
        </div>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div>
          <label className="block text-sm text-[var(--suave)]" htmlFor="nombre-proyecto">
            Name
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
                <legend className="text-sm text-[var(--suave)]">Task {indice + 1}</legend>
                <label className="mt-3 block text-sm text-[var(--suave)]" htmlFor={`titulo-${fila.clave}`}>
                  Title
                </label>
                <input
                  id={`titulo-${fila.clave}`}
                  value={fila.titulo}
                  onChange={(evento) => cambiar(fila.clave, { titulo: evento.target.value })}
                  className="hyto-input mt-2"
                />
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-[var(--suave)]">Type</p>
                    <div className="mt-2 grid grid-cols-2 gap-2" role="group" aria-label="Type">
                      <button
                        type="button"
                        aria-pressed={fila.tipo === "trabajo"}
                        onClick={() => cambiar(fila.clave, { tipo: "trabajo" })}
                        className={`h-12 rounded-xl text-sm font-medium ${fila.tipo === "trabajo" ? "bg-[var(--tinta)] text-[var(--fondo)]" : "border border-[var(--borde)] text-[var(--suave)]"}`}
                      >
                        Work
                      </button>
                      <button
                        type="button"
                        aria-pressed={fila.tipo === "reembolso"}
                        onClick={() => cambiar(fila.clave, { tipo: "reembolso" })}
                        className={`h-12 rounded-xl text-sm font-medium ${fila.tipo === "reembolso" ? "bg-[var(--tinta)] text-[var(--fondo)]" : "border border-[var(--borde)] text-[var(--suave)]"}`}
                      >
                        Reimb.
                      </button>
                    </div>
                    <label className="sr-only" htmlFor={`tipo-${fila.clave}`}>
                      Type
                    </label>
                    <select
                      id={`tipo-${fila.clave}`}
                      value={fila.tipo}
                      onChange={(evento) => cambiar(fila.clave, { tipo: evento.target.value as TipoTarea })}
                      className="sr-only"
                    >
                      <option value="trabajo">Work</option>
                      <option value="reembolso">Reimbursement</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-[var(--suave)]" htmlFor={`monto-${fila.clave}`}>
                      Amount
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
                {filas.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => setFilas((actuales) => actuales.filter((item) => item.clave !== fila.clave))}
                    className="mt-4 text-sm text-[var(--suave)]"
                  >
                    Remove
                  </button>
                ) : null}
              </fieldset>
            ))}
          </div>

          <button type="button" onClick={() => setFilas((actuales) => [...actuales, filaNueva()])} className="mt-4 text-sm font-medium">
            Add task
          </button>
        </div>

        <aside className="hyto-panel lg:sticky lg:top-6">
          <h2 className="text-base font-semibold">Budget</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-[var(--suave)]">Work tasks</dt>
              <dd className="hyto-amount">{formatearMonto((trabajo / 100).toString())}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[var(--suave)]">Reimbursements</dt>
              <dd className="hyto-amount">{formatearMonto((reembolso / 100).toString())}</dd>
            </div>
            <div className="flex justify-between gap-3 border-t border-[var(--linea)] pt-3 text-base font-semibold">
              <dt>Total</dt>
              <dd className="hyto-amount">{formatearMonto(total)}</dd>
            </div>
          </dl>
          <p className="mt-4 text-sm leading-6 text-[var(--suave)]">Nothing is paid when you save. You approve every payment from the review.</p>
          <div className="mt-5">
            <BotonPrincipal type="button" onClick={fondear} disabled={modoDemo}>
              Save project
            </BotonPrincipal>
          </div>
        </aside>
      </div>

      {modoDemo || aviso ? (
        <p className="mt-4 text-sm leading-6 text-[var(--suave)]">{modoDemo ? AVISO_PROYECTO_DEMO : aviso}</p>
      ) : null}
      <p className="mt-6 text-sm leading-6 text-[var(--suave)]">This draft stays on this device until the project is connected.</p>
    </main>
  );
}
