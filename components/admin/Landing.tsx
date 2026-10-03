"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Entrar } from "@/components/admin/Entrar";
import { AnilloHitos, Logo, Tema } from "@/components/ui/Marca";
import { mensajeClaro } from "@/lib/ui/claro";
import {
  audienciasDiscurso,
  confianzaDiscurso,
  discurso,
  pasosDiscurso,
  type BloqueDiscurso,
} from "@/lib/ui/discurso";

export function Landing({ demoHabilitado = false }: { demoHabilitado?: boolean }) {
  const pasos = pasosDiscurso();
  const audiencias = audienciasDiscurso();
  const confianza = confianzaDiscurso();

  return (
    <main className="min-h-dvh bg-[var(--fondo)] text-[var(--tinta)]">
      <div className="mx-auto flex w-full max-w-[var(--ancho-max)] flex-col gap-14 px-[var(--margen-lateral)] py-6 pb-16 sm:gap-16 sm:py-8">
        <header className="flex items-center justify-between gap-4">
          <Logo className="hyto-landing-logo" />
          <Tema />
        </header>

        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(240px,0.8fr)]">
          <section aria-labelledby="discurso-titulo" className="grid max-w-[40rem] gap-5">
            <h1 id="discurso-titulo" className="hyto-eslogan !text-[clamp(32px,6vw,44px)] !leading-[1.12]">
              {discurso.sloganLead} <em>{discurso.sloganPay}</em>
            </h1>
            <p className="text-[18px] leading-7">{discurso.subheadline}</p>
            <p className="rounded-2xl border border-[var(--borde)] bg-[var(--papel)] p-4 text-[15px] leading-6 text-[var(--tinta)]">
              <strong className="font-semibold">{discurso.networkLead} </strong>
              {discurso.networkBody}
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <div className="min-w-[12rem] flex-1">
                <Entrar demoHabilitado={demoHabilitado} />
              </div>
              {demoHabilitado ? <ProbarDemo /> : null}
            </div>
          </section>
          <div className="pointer-events-none relative hidden min-h-[280px] lg:block" aria-hidden="true">
            <AnilloHitos className="!static mx-auto !h-auto !w-[min(100%,420px)] !opacity-100" />
          </div>
        </div>

        <Seccion id="discurso-pasos" titulo={discurso.stepsTitle}>
          <ol className="grid list-none gap-3 p-0 lg:grid-cols-3">
            {pasos.map((paso, indice) => (
              <li key={paso.titulo} className="rounded-[20px] border border-[var(--borde)] bg-[var(--papel)] p-5">
                <Tarjeta indice={indice + 1} bloque={paso} />
              </li>
            ))}
          </ol>
        </Seccion>

        <Seccion id="discurso-audiencia" titulo={discurso.audienceTitle}>
          <ul className="grid list-none gap-3 p-0 md:grid-cols-2">
            {audiencias.map((bloque) => (
              <li key={bloque.titulo} className="rounded-[20px] border border-[var(--borde)] bg-[var(--papel)] p-5">
                <Tarjeta bloque={bloque} />
              </li>
            ))}
          </ul>
        </Seccion>

        <Seccion id="discurso-confianza" titulo={discurso.trustTitle}>
          <ul className="grid list-none gap-3 p-0 lg:grid-cols-3">
            {confianza.map((bloque) => (
              <li key={bloque.titulo} className="rounded-[20px] border border-[var(--borde)] bg-[var(--papel)] p-5">
                <Tarjeta bloque={bloque} />
              </li>
            ))}
          </ul>
        </Seccion>

        <footer>
          <p className="max-w-[40rem] text-[15px] leading-6 text-[var(--suave)]">{discurso.legal}</p>
        </footer>
      </div>
    </main>
  );
}

function Seccion({ id, titulo, children }: { id: string; titulo: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="grid gap-4">
      <h2 id={id} className="text-[20px] font-medium tracking-[-0.4px]">
        {titulo}
      </h2>
      {children}
    </section>
  );
}

function Tarjeta({ bloque, indice }: { bloque: BloqueDiscurso; indice?: number }) {
  return (
    <div className="flex items-start gap-3">
      {indice !== undefined ? (
        <span
          aria-hidden="true"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-current text-[15px] font-semibold"
        >
          {indice}
        </span>
      ) : null}
      <div className="min-w-0">
        <h3 className="text-[16px] font-semibold leading-6">{bloque.titulo}</h3>
        <p className="mt-2 text-[15px] leading-6">{bloque.cuerpo}</p>
      </div>
    </div>
  );
}

function ProbarDemo() {
  const [abierto, setAbierto] = useState(false);
  const [ocupado, setOcupado] = useState<"organizador" | "voluntario" | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const abrirRef = useRef<HTMLButtonElement>(null);
  const voluntarioRef = useRef<HTMLButtonElement>(null);
  const enCurso = useRef(false);

  useEffect(() => {
    if (abierto) voluntarioRef.current?.focus();
  }, [abierto]);

  function alternar() {
    setAviso(null);
    setAbierto((actual) => {
      if (actual) abrirRef.current?.focus();
      return !actual;
    });
  }

  async function entrar(rol: "organizador" | "voluntario") {
    if (enCurso.current) return;
    enCurso.current = true;
    setAviso(null);
    setOcupado(rol);
    try {
      const respuesta = await fetch("/api/sesion/demo", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rol }),
      });
      const cuerpo = (await respuesta.json().catch(() => null)) as { aviso?: unknown; rol?: unknown } | null;
      if (!respuesta.ok) {
        const texto = cuerpo && typeof cuerpo.aviso === "string" ? cuerpo.aviso : discurso.ctaDemoError;
        setAviso(mensajeClaro(texto) || discurso.ctaDemoError);
        return;
      }
      const elegido = cuerpo && typeof cuerpo.rol === "string" ? cuerpo.rol : rol;
      window.location.assign(elegido === "voluntario" ? "/mis-tareas" : "/");
    } catch {
      setAviso(discurso.ctaDemoError);
    } finally {
      enCurso.current = false;
      setOcupado(null);
    }
  }

  return (
    <div className="flex min-w-[12rem] flex-1 flex-col gap-3">
      <button
        ref={abrirRef}
        type="button"
        className="hyto-btn-line"
        aria-expanded={abierto}
        aria-controls="opciones-demo"
        onClick={alternar}
      >
        {discurso.ctaDemo}
      </button>
      {abierto ? (
        <div id="opciones-demo" className="grid gap-3 rounded-[20px] border border-[var(--borde)] bg-[var(--papel)] p-4">
          <p className="text-[15px] leading-6">{discurso.ctaDemoHelp}</p>
          <button
            ref={voluntarioRef}
            type="button"
            className="hyto-btn-line"
            disabled={ocupado !== null}
            aria-busy={ocupado === "voluntario"}
            onClick={() => void entrar("voluntario")}
          >
            {ocupado === "voluntario" ? discurso.ctaDemoBusy : discurso.ctaDemoVolunteer}
          </button>
          <button
            type="button"
            className="hyto-btn-line"
            disabled={ocupado !== null}
            aria-busy={ocupado === "organizador"}
            onClick={() => void entrar("organizador")}
          >
            {ocupado === "organizador" ? discurso.ctaDemoBusy : discurso.ctaDemoOrganizer}
          </button>
          {aviso ? (
            <p role="alert" className="text-[15px] leading-6 text-[var(--peligro)]">
              {aviso}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
