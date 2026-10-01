"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BotonPrincipal } from "@/components/integrante/BotonPrincipal";
import { useModoDemo } from "@/components/sesion/InsigniaDemo";
import { guardarProyecto } from "@/lib/admin/memoria";
import { normalizarMonto } from "@/lib/admin/vista";
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

  return (
    <main className="max-w-xl">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Create project</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--suave)]">
          Name each task and its amount in US dollars. Work is a fixed amount. A reimbursement is a cap. Saving does not move money. You lock each budget from the task review.
        </p>
      </header>

      <label className="block text-sm text-[var(--suave)]" htmlFor="nombre-proyecto">
        Name
      </label>
      <input
        id="nombre-proyecto"
        value={nombre}
        onChange={(evento) => setNombre(evento.target.value)}
        className="mt-2 h-14 w-full rounded-2xl bg-[var(--papel)] px-4 text-base outline-none"
      />

      <div className="mt-8 space-y-4">
        {filas.map((fila, indice) => (
          <fieldset key={fila.clave} className="rounded-3xl bg-[var(--papel)] p-6">
            <legend className="text-sm text-[var(--suave)]">Task {indice + 1}</legend>
            <label className="mt-3 block text-sm text-[var(--suave)]" htmlFor={`titulo-${fila.clave}`}>
              Title
            </label>
            <input
              id={`titulo-${fila.clave}`}
              value={fila.titulo}
              onChange={(evento) => cambiar(fila.clave, { titulo: evento.target.value })}
              className="mt-2 h-12 w-full rounded-2xl bg-[var(--fondo)] px-4 outline-none"
            />
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm text-[var(--suave)]" htmlFor={`tipo-${fila.clave}`}>
                  Type
                </label>
                <select
                  id={`tipo-${fila.clave}`}
                  value={fila.tipo}
                  onChange={(evento) => cambiar(fila.clave, { tipo: evento.target.value as TipoTarea })}
                  className="mt-2 h-12 w-full rounded-2xl bg-[var(--fondo)] px-4 outline-none"
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
                  className="mt-2 h-12 w-full rounded-2xl bg-[var(--fondo)] px-4 outline-none"
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

      <div className="mt-8">
        <BotonPrincipal type="button" onClick={fondear} disabled={modoDemo}>
          Save project
        </BotonPrincipal>
      </div>
      {modoDemo || aviso ? (
        <p className="mt-4 text-sm leading-6 text-[var(--suave)]">{modoDemo ? AVISO_PROYECTO_DEMO : aviso}</p>
      ) : null}
      <p className="mt-6 text-sm leading-6 text-[var(--suave)]">This draft stays on this device until the project is connected.</p>
    </main>
  );
}
