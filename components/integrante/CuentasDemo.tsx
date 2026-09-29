"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BotonPrincipal } from "@/components/integrante/BotonPrincipal";
import { crearAuth, fijarWallet, publicarSesion } from "@/lib/auth/cliente";
import { leerMemoria } from "@/lib/integrante/almacen";
import { acortarDireccion } from "@/lib/integrante/formato";
import { appIdPublico, IDENTIDADES } from "@/lib/integrante/identidades";
import { prepararIdentidad, type CuentaPreparada } from "@/lib/integrante/preparar";
import type { IdentidadDemo } from "@/lib/integrante/tipos";

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
  const preparandoRef = useRef(false);
  const authRef = useRef<Awaited<ReturnType<typeof crearAuth>>>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [pendiente, setPendiente] = useState<IdentidadDemo | null>(null);
  const [codigo, setCodigo] = useState("");
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

  function siguiente(): IdentidadDemo | null {
    return IDENTIDADES.find((identidad) => !cuentas.some((cuenta) => cuenta.id === identidad.id && cuenta.direccion)) ?? null;
  }

  async function preparar() {
    if (preparandoRef.current) return;
    if (!hayApp) {
      setAviso("Las cuentas esperan el identificador de Cavos.");
      return;
    }
    if (pendiente) {
      await confirmar();
      return;
    }
    const identidad = siguiente();
    if (!identidad) return;
    preparandoRef.current = true;
    setAviso(null);
    setPreparando(true);
    try {
      const auth = await crearAuth();
      if (!auth) {
        setAviso("Las cuentas esperan el identificador de Cavos.");
        return;
      }
      await auth.sendOtp(identidad.email);
      authRef.current = auth;
      setPendiente(identidad);
      setCodigo("");
    } catch (error) {
      setAviso(error instanceof Error ? error.message : "No se pudo preparar la cuenta.");
    } finally {
      preparandoRef.current = false;
      setPreparando(false);
    }
  }

  async function confirmar() {
    const identidad = pendiente;
    const auth = authRef.current;
    if (!identidad || !auth || preparandoRef.current) return;
    preparandoRef.current = true;
    setPreparando(true);
    setAviso(null);
    try {
      const identity = await auth.verifyOtp(identidad.email, codigo.trim());
      const sesion = await publicarSesion(identity.email ?? identidad.email, auth.getAuthToken?.() ?? null);
      if (!sesion.ok) {
        setAviso(sesion.aviso);
        return;
      }
      const cuenta = await prepararIdentidad(identidad, auth);
      let avisoWallet: string | null = null;
      if (cuenta.direccion) {
        const guardada = await fijarWallet(cuenta.direccion);
        if (!guardada.ok) avisoWallet = guardada.aviso;
      }
      setCuentas((actuales) => actuales.map((item) => (item.id === cuenta.id ? cuenta : item)));
      setPendiente(null);
      setCodigo("");
      if (avisoWallet) setAviso(avisoWallet);
      else if (cuenta.detalle) setAviso(cuenta.detalle);
    } catch (error) {
      setAviso(error instanceof Error ? error.message : "No se pudo preparar la cuenta.");
    } finally {
      preparandoRef.current = false;
      setPreparando(false);
    }
  }

  const falta = siguiente();
  const etiqueta = pendiente ? "Confirmar" : preparando ? "Preparando…" : falta ? "Preparar cuentas" : "Cuentas listas";

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
        {cuentas.map((cuenta) => {
          const identidad = IDENTIDADES.find((item) => item.id === cuenta.id);
          return (
            <article key={cuenta.id} className="rounded-3xl bg-[var(--papel)] p-6">
              <h2 className="text-lg font-semibold">{cuenta.nombre}</h2>
              <p className="mt-1 text-sm text-[var(--suave)]">{identidad?.email}</p>
              <p className="mt-3 font-mono text-sm">{cuenta.direccion ? acortarDireccion(cuenta.direccion) : "Sin dirección"}</p>
              <p className="mt-2 text-sm text-[var(--suave)]">{cuenta.usdcListo ? "USDC listo para cobrar" : "USDC pendiente"}</p>
              {cuenta.detalle ? <p className="mt-2 text-sm text-[var(--suave)]">{cuenta.detalle}</p> : null}
            </article>
          );
        })}
      </div>

      {pendiente ? (
        <label className="mt-6 block text-sm text-[var(--suave)]" htmlFor="codigo-cuenta">
          Código para {pendiente.nombre}
          <input
            id="codigo-cuenta"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={codigo}
            onChange={(evento) => setCodigo(evento.target.value)}
            className="mt-2 h-14 w-full rounded-2xl bg-[var(--papel)] px-4 text-base text-[var(--tinta)] outline-none"
          />
        </label>
      ) : null}

      <div className="mt-6">
        <BotonPrincipal type="button" disabled={preparando || (!pendiente && !falta)} onClick={() => void preparar()}>
          {etiqueta}
        </BotonPrincipal>
      </div>

      {aviso ? (
        <p role="alert" className="mt-4 text-sm leading-6 text-[var(--suave)]">
          {aviso}
        </p>
      ) : null}
    </main>
  );
}
