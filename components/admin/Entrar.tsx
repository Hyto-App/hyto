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
import { mensajeClaro } from "@/lib/ui/claro";
import { SelectorIdioma, useClaro, useTexto } from "@/components/ui/Idioma";
import { appIdPublico } from "@/lib/integrante/identidades";
import { InsigniaDemo, useModoDemo, useRolDemo } from "@/components/sesion/InsigniaDemo";
import { AnilloHitos, Eslogan, Logo } from "@/components/ui/Marca";

type Fase = "inicio" | "correo" | "codigo";
type Ocupado = "envio" | "google" | "codigo" | "demo" | "salida";

const googleEnCurso = new Map<string, Promise<{ aviso: string | null; direccion: string | null }>>();

export function Entrar({ demoHabilitado = false }: { demoHabilitado?: boolean }) {
  const modoDemo = useModoDemo();
  const rolActual = useRolDemo();
  const t = useTexto();
  const claro = useClaro();
  const [direccion, setDireccion] = useState<string | null>(null);
  const [pedirIngreso, setPedirIngreso] = useState(false);
  const [fase, setFase] = useState<Fase>("inicio");
  const [correo, setCorreo] = useState("");
  const [codigo, setCodigo] = useState("");
  const [rolDemo, setRolDemo] = useState<"organizador" | "voluntario">("organizador");
  const [ocupado, setOcupado] = useState<Ocupado | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [espera, setEspera] = useState(0);
  const [mostrarEspera, setMostrarEspera] = useState(false);
  const authRef = useRef<Awaited<ReturnType<typeof crearAuth>>>(null);
  const dialogoRef = useRef<HTMLDivElement>(null);
  const enCurso = useRef(false);
  const esperaRef = useRef(0);

  useEffect(() => {
    const ingreso = new URLSearchParams(window.location.search).get("signin") === "1";
    if (ingreso) {
      setPedirIngreso(true);
      setFase("correo");
    }
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
    if (fase === "inicio" || modoDemo) return;
    const nodo = dialogoRef.current;
    if (!nodo) return;
    nodo.querySelector<HTMLElement>("input, button")?.focus();
    function tecla(evento: KeyboardEvent) {
      if (evento.key === "Escape") {
        setFase("inicio");
        return;
      }
      if (evento.key !== "Tab" || !nodo) return;
      const focos = [...nodo.querySelectorAll<HTMLElement>("input, button, select, textarea, a[href]")].filter(
        (elemento) => !elemento.hasAttribute("disabled"),
      );
      if (focos.length === 0) return;
      const primero = focos[0];
      const ultimo = focos[focos.length - 1];
      if (evento.shiftKey && document.activeElement === primero) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault();
        primero.focus();
      }
    }
    document.addEventListener("keydown", tecla);
    return () => document.removeEventListener("keydown", tecla);
  }, [fase, modoDemo]);

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
        if (!guardado.aviso) {
          setDireccion(resultado.direccion);
          setPedirIngreso(false);
        }
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
      setPedirIngreso(false);
      setFase("inicio");
      if (resultado.aviso) setAviso(resultado.aviso);
    } catch (error) {
      mostrarFallo(error);
    } finally {
      enCurso.current = false;
      setOcupado(null);
    }
  }

  async function salirDemo() {
    if (enCurso.current) return;
    enCurso.current = true;
    setAviso(null);
    setOcupado("salida");
    try {
      const respuesta = await fetch("/api/sesion", { method: "DELETE" });
      if (!respuesta.ok) {
        setAviso("Could not leave demo mode.");
        return;
      }
      window.location.reload();
    } catch {
      setAviso("Could not leave demo mode.");
    } finally {
      enCurso.current = false;
      setOcupado(null);
    }
  }

  async function entrarDemo(rolPedido = rolDemo) {
    if (enCurso.current) return;
    enCurso.current = true;
    setAviso(null);
    setOcupado("demo");
    try {
      const respuesta = await fetch("/api/sesion/demo", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rol: rolPedido }),
      });
      const cuerpo = (await respuesta.json().catch(() => null)) as { aviso?: unknown; rol?: unknown } | null;
      if (!respuesta.ok) {
        setAviso(mensajeClaro(cuerpo && typeof cuerpo.aviso === "string" ? cuerpo.aviso : "Could not sign in."));
        return;
      }
      const rol = cuerpo && typeof cuerpo.rol === "string" ? cuerpo.rol : rolPedido;
      window.location.assign(rol === "voluntario" ? "/mis-tareas" : "/");
    } catch {
      setAviso("Could not sign in.");
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

  if (modoDemo) {
    const otro = rolActual === "voluntario" ? "organizador" : "voluntario";
    const nombreRol = rolActual === "voluntario" ? t("entrar.volunteerDemo") : t("entrar.organizerDemo");
    return (
      <div className="flex w-full flex-col items-stretch gap-3">
        <p className="text-sm text-[var(--suave)]">
          <InsigniaDemo />
          <span className="ml-2 align-middle">{nombreRol} · Cavos</span>
        </p>
        <button
          type="button"
          onClick={() => void entrarDemo(otro)}
          disabled={ocupado !== null}
          className="hyto-btn-line"
        >
          {ocupado === "demo" ? t("entrar.switching") : t(otro === "voluntario" ? "entrar.switchVolunteer" : "entrar.switchOrganizer")}
        </button>
        <button
          type="button"
          onClick={() => void salirDemo()}
          disabled={ocupado !== null}
          className="hyto-btn-danger"
        >
          {ocupado === "salida" ? t("entrar.leaving") : t("entrar.leaveDemo")}
        </button>
        {aviso ? (
          <p role="status" className="text-sm leading-6 text-[var(--suave)]">
            {claro(aviso)}
          </p>
        ) : null}
      </div>
    );
  }

  const demo = esCorreoDemo(correo);
  const mensaje = mostrarEspera && espera > 0 ? textoEspera(espera) : aviso;

  if (direccion && !pedirIngreso) {
    return (
      <div className="flex items-center gap-3">
        <span className="hyto-avatar">{direccion.slice(0, 2)}</span>
        <div>
          <p className="text-sm font-medium">{t("entrar.signedIn")}</p>
          <details className="text-sm text-[var(--suave)]">
            <summary className="cursor-pointer">{t("entrar.accountDetails")}</summary>
            <p className="mt-1 font-mono">{acortarDireccion(direccion)}</p>
          </details>
        </div>
      </div>
    );
  }

  if (fase === "inicio") {
    return (
      <button
        type="button"
        onClick={() => {
          setAviso(null);
          setFase("correo");
        }}
        className="hyto-btn"
      >
        {t("entrar.signIn")}
      </button>
    );
  }

  return (
    <div ref={dialogoRef} className="hyto-auth" role="dialog" aria-modal="true" aria-label={t("entrar.dialog")}>
      <div className="hyto-auth-hero">
        <Logo className="hyto-auth-logo" />
        <AnilloHitos />
        <div className="hyto-auth-claim">
          <Eslogan />
          <p className="hyto-auth-claim-sub">{t("landing.sub")}</p>
        </div>
        <ul className="hyto-roles">
          <li>{t("landing.voluntarios")}</li>
          <li>{t("landing.organizadores")}</li>
          <li>{t("landing.escrow")}</li>
        </ul>
      </div>
      <div className="hyto-auth-sheet">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[20px] font-medium tracking-[-0.4px]">{t("entrar.title")}</h2>
          <div className="flex flex-wrap items-center gap-2">
            <SelectorIdioma />
            <button type="button" className="hyto-cerrar" onClick={() => setFase("inicio")}>
              {t("entrar.close")}
            </button>
          </div>
        </div>
        <p className="mt-2 text-sm leading-6 text-[var(--suave)]">{t("entrar.intro")}</p>
        <div className="hyto-steps mt-4" aria-hidden="true">
          <i className="is-on" />
          <i className={fase === "codigo" ? "is-on" : ""} />
        </div>
        <div className="mt-6 grid gap-3">
      {fase === "correo" ? (
        <>
          <p className="text-sm leading-6 text-[var(--suave)]">{t("entrar.emailCode")}</p>
          <label className="sr-only" htmlFor="correo-entrar">
            {t("entrar.email")}
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
            placeholder={t("entrar.email")}
            disabled={ocupado !== null}
            className="hyto-input"
          />
          {demo ? <p className="text-sm leading-6 text-[var(--suave)]">{claro(AVISO_DEMO)}</p> : <p className="text-sm leading-6 text-[var(--suave)]">{claro(AVISO_SPAM)}</p>}
          <button
            type="button"
            onClick={() => void enviarCodigo()}
            disabled={ocupado !== null || espera > 0 || demo}
            className="hyto-btn"
          >
            {ocupado === "envio" ? t("entrar.sending") : t("entrar.sendCode")}
          </button>
          <p className="text-center text-xs uppercase tracking-wide text-[var(--suave)]">{t("entrar.or")}</p>
          <button type="button" onClick={() => void google()} disabled={ocupado !== null} className="hyto-btn-line">
            {ocupado === "google" ? t("entrar.openingGoogle") : t("entrar.google")}
          </button>
        </>
      ) : null}
      {fase === "codigo" ? (
        <>
          <p className="text-sm leading-6 text-[var(--suave)]">{claro(AVISO_SPAM)}</p>
          <label className="sr-only" htmlFor="codigo-entrar">
            {t("entrar.code")}
          </label>
          <input
            id="codigo-entrar"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={codigo}
            onChange={(evento) => setCodigo(evento.target.value)}
            placeholder={t("entrar.code")}
            disabled={ocupado !== null}
            className="hyto-input"
          />
          <button type="button" onClick={() => void confirmar()} disabled={ocupado !== null} className="hyto-btn">
            {ocupado === "codigo" ? t("entrar.signingIn") : t("entrar.confirm")}
          </button>
          <button type="button" onClick={() => void enviarCodigo()} disabled={ocupado !== null || espera > 0} className="hyto-btn-line">
            {t("entrar.resend")}
          </button>
        </>
      ) : null}
      {demoHabilitado ? (
        <div className="hyto-card mt-2 grid gap-3 p-4">
          <p className="text-sm font-medium">{t("entrar.tryDemo")}</p>
          <p className="text-sm text-[var(--suave)]">{t("entrar.noAccount")}</p>
          <label className="sr-only" htmlFor="rol-demo">
            {t("entrar.demoRole")}
          </label>
          <select
            id="rol-demo"
            value={rolDemo}
            onChange={(evento) => {
              const valor = evento.target.value;
              if (valor === "organizador" || valor === "voluntario") setRolDemo(valor);
            }}
            disabled={ocupado !== null}
            className="hyto-input"
          >
            <option value="organizador">{t("entrar.organizerDemo")}</option>
            <option value="voluntario">{t("entrar.volunteerDemo")}</option>
          </select>
          <button type="button" onClick={() => void entrarDemo()} disabled={ocupado !== null} className="hyto-btn-line">
            {ocupado === "demo" ? t("entrar.signingIn") : t("entrar.enterDemo")}
          </button>
        </div>
      ) : null}
      {mensaje ? (
        <p role="status" className="text-sm leading-6 text-[var(--suave)]">
          {claro(mensaje)}
        </p>
      ) : null}
          <p className="text-xs leading-5 text-[var(--suave)]">{t("entrar.legal")}</p>
        </div>
      </div>
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
