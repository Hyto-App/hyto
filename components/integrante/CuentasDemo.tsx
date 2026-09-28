"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BotonPrincipal } from "@/components/integrante/BotonPrincipal";
import { leerMemoria } from "@/lib/integrante/almacen";
import { acortarDireccion } from "@/lib/integrante/formato";
import { appIdPublico, IDENTIDADES } from "@/lib/integrante/identidades";
import { prepararCuentasDemo, type CuentaPreparada } from "@/lib/integrante/preparar";

function filasIniciales(): CuentaPreparada[] {
  return IDENTIDADES.map((identidad) => ({
    id: identidad.id,
    nombre: identidad.nombre,
    direccion: null,
    usdcListo: false,
    detalle: null,
  }));
}

export function CuentasDemo() {
  const [cuentas, setCuentas] = useState<CuentaPreparada[]>(filasIniciales);
  const [preparando, setPreparando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const hayApp = appIdPublico() !== null;

  useEffect(() => {
    const memoria = leerMemoria();
    setCuentas((actuales) =>
      actuales.map((cuenta) => {
        const guardada = memoria.cuentas[cuenta.id];
        if (!guardada) return cuenta;
        return { ...cuenta, direccion: guardada.direccion, usdcListo: guardada.usdcListo };
      }),
    );
  }, []);

  async function preparar() {
    if (!hayApp) {
      setAviso("Las cuentas esperan el identificador de Cavos.");
      return;
    }
    setAviso(null);
    setPreparando(true);
    await prepararCuentasDemo((cuenta) => {
      setCuentas((actuales) => actuales.map((item) => (item.id === cuenta.id ? cuenta : item)));
    });
    setPreparando(false);
  }

  return (
    <main>
      <header className="mb-8">
        <Link href="/mis-tareas" className="text-sm text-[var(--suave)]">
          Mis tareas
        </Link>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">Cuentas del demo</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--suave)]">Organizador y tres voluntarios.</p>
      </header>

      <div className="space-y-3">
        {cuentas.map((cuenta) => (
          <article key={cuenta.id} className="rounded-3xl bg-[var(--papel)] p-6">
            <h2 className="text-lg font-semibold">{cuenta.nombre}</h2>
            <p className="mt-3 font-mono text-sm">{cuenta.direccion ? acortarDireccion(cuenta.direccion) : "Sin dirección"}</p>
            <p className="mt-2 text-sm text-[var(--suave)]">{cuenta.usdcListo ? "USDC listo para cobrar" : "USDC pendiente"}</p>
            {cuenta.detalle ? <p className="mt-2 text-sm text-[var(--suave)]">{cuenta.detalle}</p> : null}
          </article>
        ))}
      </div>

      <div className="mt-6">
        <BotonPrincipal type="button" disabled={preparando} onClick={() => void preparar()}>
          {preparando ? "Preparando…" : "Preparar cuentas"}
        </BotonPrincipal>
      </div>

      {aviso ? <p className="mt-4 text-sm leading-6 text-[var(--suave)]">{aviso}</p> : null}
    </main>
  );
}
