"use client";

import { useEffect, useRef, useState } from "react";
import { guardarDireccionAdmin, leerMemoriaAdmin } from "@/lib/admin/memoria";
import { crearAuth, entrarConCodigo, entrarConGoogle, redirectLimpio, urlGoogle } from "@/lib/auth/cliente";
import {
  AVISO_CONFIG,
  AVISO_CORREO,
  AVISO_DEMO,
  AVISO_GENERICO,
  AVISO_SPAM,
  ESPERA_TRAS_ENVIO,
  avisoDeIngreso,
  correoValido,
  esCorreoDemo,
  textoEspera,
} from "@/lib/auth/errores";
import { acortarDireccion } from "@/lib/integrante/formato";
import { appIdPublico } from "@/lib/integrante/identidades";

type Fase = "inicio" | "correo" | "codigo";
type Ocupado = "envio" | "google" | "codigo";

const googleEnCurso = new Map<string, Promise<{ aviso: string | null; direccion: string | null }>>();

export function Entrar() {
  const [direccion, setDireccion] = useState<string | null>(null);
  const [fase, setFase] = useState<Fase>("inicio");
  const [correo, setCorreo] = useState("");
  const [codigo, setCodigo] = useState("");
  const [ocupado, setOcupado] = useState<Ocupado | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [espera, setEspera] = useState(0);
  const [mostrarEspera, setMostrarEspera] = useState(false);
  const authRef = useRef<Awaited<ReturnType<typeof crearAuth>>>(null);
  const enCurso = useRef(false);
  const esperaRef = useRef(0);

  useEffect(() => {
    setDireccion(leerMemoriaAdmin().direccion);
  }, []);

  useEffect(() => {
    esperaRef.current = espera;
    if (espera <= 0) {
      setMostrarEspera(false);
      return;
    }
    const id = window.setTimeout(() => setEspera((actual) => Math.max(0, actual - 1)), 1000);
    return () => window.clearTimeout(id);
  }, [espera]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codigoGoogle = params.get("cavos_auth_code");
    if (!codigoGoogle) return;
    let vivo = true;
    const pendiente = googleEnCurso.get(codigoGoogle) ?? iniciarGoogle(codigoGoogle);
    googleEnCurso.set(codigoGoogle, pendiente);
    void pendiente.then((resultado) => {
      if (!vivo) return;
      if (resultado.direccion) {
        const guardado = guardarDireccionAdmin(resultado.direccion);
        if (!guardado.aviso) setDireccion(resultado.direccion);
        setAviso(guardado.aviso);
        setFase("inicio");
        return;
      }
      setAviso(resultado.aviso);
    });
    return () => {
      vivo = false;
    };
  }, []);

  function iniciarEspera(segundos: number, visible: boolean) {
    const n = Math.max(1, Math.ceil(segundos));
    esperaRef.current = n;
    setEspera(n);
    setMostrarEspera(visible);
  }

  function mostrarFallo(error: unknown) {
    console.error(error);
    const resultado = avisoDeIngreso(error);
    if (resultado.esperaSegundos) {
      iniciarEspera(resultado.esperaSegundos, true);
      setAviso(null);
      return;
    }
    setAviso(resultado.texto);
  }

  async function enviarCodigo() {
    if (enCurso.current) return;
    if (esperaRef.current > 0) {
      setMostrarEspera(true);
      return;
    }
    if (!appIdPublico()) {
      console.error("Falta NEXT_PUBLIC_CAVOS_APP_ID");
      setAviso(AVISO_CONFIG);
      return;
    }
    const email = correo.trim().toLowerCase();
    if (!correoValido(email)) {
      setAviso(AVISO_CORREO);
      return;
    }
    if (esCorreoDemo(email)) return;
    enCurso.current = true;
    setAviso(null);
    setOcupado("envio");
    try {
      const auth = await crearAuth();
      if (!auth) {
        console.error("Falta NEXT_PUBLIC_CAVOS_APP_ID");
        setAviso(AVISO_CONFIG);
        return;
      }
      await auth.sendOtp(email);
      authRef.current = auth;
      setCorreo(email);
      setFase("codigo");
      iniciarEspera(ESPERA_TRAS_ENVIO, false);
    } catch (error) {
      mostrarFallo(error);
    } finally {
      enCurso.current = false;
      setOcupado(null);
    }
  }

  async function confirmar() {
    if (enCurso.current) return;
    const auth = authRef.current;
    if (!auth) {
      setFase("correo");
      return;
    }
    enCurso.current = true;
    setAviso(null);
    setOcupado("codigo");
    try {
      const resultado = await entrarConCodigo(auth, correo, codigo.trim());
      if (!resultado.direccion) {
        setAviso(resultado.aviso ?? AVISO_GENERICO);
        return;
      }
      const guardado = guardarDireccionAdmin(resultado.direccion);
      if (guardado.aviso) {
        setAviso(guardado.aviso);
        return;
      }
      setDireccion(resultado.direccion);
      setFase("inicio");
    } catch (error) {
      mostrarFallo(error);
    } finally {
      enCurso.current = false;
      setOcupado(null);
    }
  }

  async function google() {
    if (enCurso.current) return;
    enCurso.current = true;
    setAviso(null);
    setOcupado("google");
    let salio = false;
    try {
      const auth = await crearAuth();
      if (!auth) {
        console.error("Falta NEXT_PUBLIC_CAVOS_APP_ID");
        setAviso(AVISO_CONFIG);
        return;
      }
      window.location.href = await urlGoogle(auth, redirectLimpio());
      salio = true;
    } catch (error) {
      mostrarFallo(error);
    } finally {
      if (!salio) {
        enCurso.current = false;
        setOcupado(null);
      }
    }
  }

  const demo = esCorreoDemo(correo);
  const mensaje = mostrarEspera && espera > 0 ? textoEspera(espera) : aviso;

  if (direccion) {
    return (
      <div className="flex flex-col items-end gap-2">
        <p className="font-mono text-sm text-[var(--suave)]">{acortarDireccion(direccion)}</p>
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-xs flex-col items-end gap-2">
      {fase === "inicio" ? (
        <button
          type="button"
          onClick={() => {
            setAviso(null);
            setFase("correo");
          }}
          className="flex h-11 items-center justify-center rounded-full bg-[var(--acento)] px-5 text-sm font-semibold text-[var(--sobre-acento)] transition hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--tinta)]"
        >
          Entrar
        </button>
      ) : null}
      {fase === "correo" ? (
        <>
          <label className="sr-only" htmlFor="correo-entrar">
            Correo
          </label>
          <input
            id="correo-entrar"
            type="email"
            autoComplete="email"
            value={correo}
            onChange={(evento) => {
              setCorreo(evento.target.value);
              setAviso(null);
            }}
            placeholder="Correo"
            disabled={ocupado !== null}
            className="h-11 w-full rounded-2xl bg-[var(--papel)] px-4 text-sm outline-none disabled:opacity-70"
          />
          {demo ? (
            <p className="max-w-xs text-right text-sm leading-6 text-[var(--suave)]">{AVISO_DEMO}</p>
          ) : (
            <p className="max-w-xs text-right text-sm leading-6 text-[var(--suave)]">{AVISO_SPAM}</p>
          )}
          <button
            type="button"
            onClick={() => void enviarCodigo()}
            disabled={ocupado !== null || espera > 0 || demo}
            className="flex h-11 items-center justify-center rounded-full bg-[var(--acento)] px-5 text-sm font-semibold text-[var(--sobre-acento)] transition hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--tinta)] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:brightness-100"
          >
            {ocupado === "envio" ? "Enviando…" : "Enviar código"}
          </button>
          <button
            type="button"
            onClick={() => void google()}
            disabled={ocupado !== null}
            className="text-sm text-[var(--suave)] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {ocupado === "google" ? "Abriendo Google…" : "Entrar con Google"}
          </button>
        </>
      ) : null}
      {fase === "codigo" ? (
        <>
          <p className="max-w-xs text-right text-sm leading-6 text-[var(--suave)]">{AVISO_SPAM}</p>
          <label className="sr-only" htmlFor="codigo-entrar">
            Código
          </label>
          <input
            id="codigo-entrar"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={codigo}
            onChange={(evento) => setCodigo(evento.target.value)}
            placeholder="Código"
            disabled={ocupado !== null}
            className="h-11 w-full rounded-2xl bg-[var(--papel)] px-4 text-sm outline-none disabled:opacity-70"
          />
          <button
            type="button"
            onClick={() => void confirmar()}
            disabled={ocupado !== null}
            className="flex h-11 items-center justify-center rounded-full bg-[var(--acento)] px-5 text-sm font-semibold text-[var(--sobre-acento)] transition hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--tinta)] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:brightness-100"
          >
            {ocupado === "codigo" ? "Entrando…" : "Confirmar"}
          </button>
        </>
      ) : null}
      {mensaje ? (
        <p role="status" className="max-w-xs text-right text-sm leading-6 text-[var(--suave)]">
          {mensaje}
        </p>
      ) : null}
    </div>
  );
}

function iniciarGoogle(codigo: string): Promise<{ aviso: string | null; direccion: string | null }> {
  return (async () => {
    const auth = await crearAuth();
    if (!auth) {
      console.error("Falta NEXT_PUBLIC_CAVOS_APP_ID");
      return { aviso: AVISO_CONFIG, direccion: null };
    }
    try {
      return await entrarConGoogle(auth, window.location.search, redirectLimpio());
    } catch (error) {
      console.error(error);
      return { aviso: avisoDeIngreso(error).texto, direccion: null };
    }
  })();
}
