"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BotonPrincipal } from "@/components/integrante/BotonPrincipal";
import { InsigniaDemo } from "@/components/sesion/InsigniaDemo";
import { crearAuth, publicarSesion } from "@/lib/auth/cliente";
import { leerMemoria } from "@/lib/integrante/almacen";
import { acortarDireccion } from "@/lib/integrante/formato";
import { useClaro, useIdioma, useTexto } from "@/components/ui/Idioma";
import { textoVisible } from "@/lib/ui/etiquetas";
import { iniciales } from "@/components/ui/Marca";
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
  const t = useTexto();
  const claro = useClaro();
  const idioma = useIdioma();
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
      setAviso("Account setup isn't available yet.");
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
        setAviso("Account setup isn't available yet.");
        return;
      }
      await auth.sendOtp(identidad.email);
      authRef.current = auth;
      setPendiente(identidad);
      setCodigo("");
    } catch (error) {
      setAviso(error instanceof Error ? error.message : "Could not prepare the account.");
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
      setCuentas((actuales) => actuales.map((item) => (item.id === cuenta.id ? cuenta : item)));
      setPendiente(null);
      setCodigo("");
      if (cuenta.detalle) setAviso(cuenta.detalle);
    } catch (error) {
      setAviso(error instanceof Error ? error.message : "Could not prepare the account.");
    } finally {
      preparandoRef.current = false;
      setPreparando(false);
    }
  }

  const falta = siguiente();
  const etiqueta = pendiente ? t("eventos.confirm") : preparando ? t("eventos.preparing") : falta ? t("eventos.prepareAccounts") : t("eventos.accountsReady");

  return (
    <main className="hyto-page">
      <header className="hyto-page-head">
        <div>
          <p className="hyto-crumb">
            <Link href="/configuracion">{t("nav.settings")}</Link>
            <InsigniaDemo />
          </p>
          <h1 className="hyto-title mt-3">{t("eventos.accountsTitle")}</h1>
          <p className="hyto-sub">{t("eventos.accountsLead")}</p>
        </div>
      </header>

      <div className="grid gap-3">
        {cuentas.map((cuenta) => {
          const identidad = IDENTIDADES.find((item) => item.id === cuenta.id);
          return (
            <article key={cuenta.id} className="hyto-card flex flex-wrap items-center gap-4 p-5">
              <span className="hyto-avatar">{iniciales(textoVisible(cuenta.nombre, idioma))}</span>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold">{textoVisible(cuenta.nombre, idioma)}</h2>
                <p className="mt-1 text-sm text-[var(--suave)]">{identidad?.email}</p>
                {cuenta.direccion ? (
                  <details className="mt-2 text-sm">
                    <summary className="cursor-pointer text-[var(--suave)]">{t("eventos.accountDetails")}</summary>
                    <p className="mt-1 font-mono">{acortarDireccion(cuenta.direccion)}</p>
                  </details>
                ) : (
                  <p className="mt-2 text-sm text-[var(--suave)]">{t("eventos.notSetUp")}</p>
                )}
              </div>
              <p className={`hyto-pill ${cuenta.usdcListo ? "hyto-pill-ok" : "hyto-pill-muted"}`}>
                <i className="hyto-dot" aria-hidden="true" />
                {cuenta.usdcListo ? t("eventos.readyReceive") : t("eventos.notReadyReceive")}
              </p>
              {cuenta.detalle ? <p className="w-full text-sm text-[var(--suave)]">{claro(cuenta.detalle)}</p> : null}
            </article>
          );
        })}
      </div>

      {pendiente ? (
        <label className="mt-6 block text-sm text-[var(--suave)]" htmlFor="codigo-cuenta">
          {t("eventos.codeFor", { name: textoVisible(pendiente.nombre, idioma) })}
          <input
            id="codigo-cuenta"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={codigo}
            onChange={(evento) => setCodigo(evento.target.value)}
            className="hyto-input mt-2"
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
          {claro(aviso)}
        </p>
      ) : null}
    </main>
  );
}
