"use client";

import { useEffect, useRef, useState } from "react";
import { Entrar } from "@/components/admin/Entrar";
import { AnilloHitos, Logo, Tema } from "@/components/ui/Marca";
import { mensajeClaro } from "@/lib/ui/claro";
import { discurso } from "@/lib/ui/discurso";

export function Hero({ demoHabilitado }: { demoHabilitado: boolean }) {
  return (
    <section className="hyto-landing-hero">
      <header className="hyto-landing-head">
        <Logo className="hyto-landing-logo" />
        <Tema />
      </header>
      <div className="hyto-landing-copy">
        <h1 className="hyto-eslogan">
          {discurso.sloganLead} <em>{discurso.sloganPay}</em>
        </h1>
        <p className="hyto-landing-pitch">{discurso.subheadline}</p>
        <p className="hyto-landing-note">
          <strong>{discurso.networkLead} </strong>
          {discurso.networkBody}
        </p>
        <div className={demoHabilitado ? "hyto-landing-cta hyto-landing-actions" : "hyto-landing-cta"}>
          <Entrar demoHabilitado={demoHabilitado} />
          {demoHabilitado ? <ProbarDemo /> : null}
        </div>
      </div>
      <AnilloHitos />
      <p className="hyto-landing-legal">{discurso.legal}</p>
    </section>
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
    <div className="hyto-landing-demo">
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
        <div id="opciones-demo" className="hyto-landing-demo-panel">
          <p>{discurso.ctaDemoHelp}</p>
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
            <p role="alert">{aviso}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
