"use client";

import { useEffect, useRef, useState } from "react";
import { guardarDireccionAdmin, leerMemoriaAdmin } from "@/lib/admin/memoria";
import { crearAuth, entrarConCodigo, entrarConGoogle, redirectLimpio, urlGoogle } from "@/lib/auth/cliente";
import { acortarDireccion } from "@/lib/integrante/formato";
import { appIdPublico } from "@/lib/integrante/identidades";

type Fase = "inicio" | "correo" | "codigo";

const googleEnCurso = new Map<string, Promise<{ aviso: string | null; direccion: string | null }>>();

export function Entrar() {
  const [direccion, setDireccion] = useState<string | null>(null);
  const [fase, setFase] = useState<Fase>("inicio");
  const [correo, setCorreo] = useState("");
  const [codigo, setCodigo] = useState("");
  const [entrando, setEntrando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const authRef = useRef<Awaited<ReturnType<typeof crearAuth>>>(null);

  useEffect(() => {
    setDireccion(leerMemoriaAdmin().direccion);
  }, []);

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
        setAviso(guardado.aviso ?? resultado.aviso);
        setFase("inicio");
        return;
      }
      setAviso(resultado.aviso);
    });
    return () => {
      vivo = false;
    };
  }, []);

  async function enviarCodigo() {
    const appId = appIdPublico();
    if (!appId) {
      setAviso("El ingreso espera el identificador de Cavos.");
      return;
    }
    const email = correo.trim().toLowerCase();
    if (!email.includes("@")) {
      setAviso("Escribe el correo del equipo.");
      return;
    }
    setAviso(null);
    setEntrando(true);
    try {
      const auth = await crearAuth();
      if (!auth) {
        setAviso("El ingreso espera el identificador de Cavos.");
        return;
      }
      await auth.sendOtp(email);
      authRef.current = auth;
      setCorreo(email);
      setFase("codigo");
    } catch (error) {
      setAviso(error instanceof Error ? error.message : "No se pudo entrar.");
    } finally {
      setEntrando(false);
    }
  }

  async function confirmar() {
    const auth = authRef.current;
    if (!auth) {
      setFase("correo");
      return;
    }
    setAviso(null);
    setEntrando(true);
    try {
      const resultado = await entrarConCodigo(auth, correo, codigo.trim());
      if (!resultado.direccion) {
        setAviso(resultado.aviso ?? "No se pudo entrar.");
        return;
      }
      const guardado = guardarDireccionAdmin(resultado.direccion);
      if (guardado.aviso) {
        setAviso(guardado.aviso);
        return;
      }
      setDireccion(resultado.direccion);
      setFase("inicio");
      if (resultado.aviso) setAviso(resultado.aviso);
    } catch (error) {
      setAviso(error instanceof Error ? error.message : "No se pudo entrar.");
    } finally {
      setEntrando(false);
    }
  }

  async function google() {
    const auth = await crearAuth();
    if (!auth) {
      setAviso("El ingreso espera el identificador de Cavos.");
      return;
    }
    setEntrando(true);
    try {
      window.location.href = await urlGoogle(auth, redirectLimpio());
    } catch (error) {
      setAviso(error instanceof Error ? error.message : "No se pudo entrar.");
      setEntrando(false);
    }
  }

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
            onChange={(evento) => setCorreo(evento.target.value)}
            placeholder="Correo"
            className="h-11 w-full rounded-2xl bg-[var(--papel)] px-4 text-sm outline-none"
          />
          <button
            type="button"
            onClick={() => void enviarCodigo()}
            disabled={entrando}
            className="flex h-11 items-center justify-center rounded-full bg-[var(--acento)] px-5 text-sm font-semibold text-[var(--sobre-acento)] transition hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--tinta)] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:brightness-100"
          >
            {entrando ? "Enviando…" : "Enviar código"}
          </button>
          <button type="button" onClick={() => void google()} className="text-sm text-[var(--suave)]">
            Entrar con Google
          </button>
        </>
      ) : null}
      {fase === "codigo" ? (
        <>
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
            className="h-11 w-full rounded-2xl bg-[var(--papel)] px-4 text-sm outline-none"
          />
          <button
            type="button"
            onClick={() => void confirmar()}
            disabled={entrando}
            className="flex h-11 items-center justify-center rounded-full bg-[var(--acento)] px-5 text-sm font-semibold text-[var(--sobre-acento)] transition hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--tinta)] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:brightness-100"
          >
            {entrando ? "Entrando…" : "Confirmar"}
          </button>
        </>
      ) : null}
      {aviso ? <p className="max-w-xs text-right text-sm leading-6 text-[var(--suave)]">{aviso}</p> : null}
    </div>
  );
}

function iniciarGoogle(codigo: string): Promise<{ aviso: string | null; direccion: string | null }> {
  return (async () => {
    const auth = await crearAuth();
    if (!auth) return { aviso: "El ingreso espera el identificador de Cavos.", direccion: null };
    try {
      return await entrarConGoogle(auth, window.location.search, redirectLimpio());
    } catch (error) {
      return { aviso: error instanceof Error ? error.message : "No se pudo entrar.", direccion: null };
    }
  })();
}
