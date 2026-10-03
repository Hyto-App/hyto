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
import { appIdPublico } from "@/lib/integrante/identidades";
import { InsigniaDemo, useModoDemo, useRolDemo } from "@/components/sesion/InsigniaDemo";
import { AnilloHitos, Eslogan, Logo } from "@/components/ui/Marca";

type Fase = "inicio" | "correo" | "codigo";
type Ocupado = "envio" | "google" | "codigo" | "demo" | "salida";

type ResultadoGoogle = { aviso: string | null; direccion: string | null; guardada: boolean };

const googleEnCurso = new Map<string, Promise<ResultadoGoogle>>();

export function Entrar({ demoHabilitado = false }: { demoHabilitado?: boolean }) {
  const modoDemo = useModoDemo();
  const rolActual = useRolDemo();
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
    const pendiente = googleEnCurso.get(codigoGoogle) ?? iniciarGoogle(window.location.search, redirectLimpio());
    googleEnCurso.set(codigoGoogle, pendiente);
    void pendiente.then((resultado) => {
      if (!vivo) return;
      if (resultado.guardada && resultado.direccion) {
        setDireccion(resultado.direccion);
        setPedirIngreso(false);
      }
      setAviso(resultado.aviso);
      setFase(resultado.direccion ? "inicio" : "correo");
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
    const nombreRol = rolActual === "voluntario" ? "Volunteer demo account" : "Organizer demo account";
    const nombreOtro = otro === "voluntario" ? "volunteer" : "organizer";
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
          {ocupado === "demo" ? "Switching…" : `Switch to the ${nombreOtro} demo account`}
        </button>
        <button
          type="button"
          onClick={() => void salirDemo()}
          disabled={ocupado !== null}
          className="hyto-btn-danger"
        >
          {ocupado === "salida" ? "Leaving…" : "Leave demo"}
        </button>
        {aviso ? (
          <p role="status" className="text-sm leading-6 text-[var(--suave)]">
            {aviso}
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
          <p className="text-sm font-medium">Signed in</p>
          <details className="text-sm text-[var(--suave)]">
            <summary className="cursor-pointer">Account details</summary>
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
        Sign in
      </button>
    );
  }

  return (
    <div ref={dialogoRef} className="hyto-auth" role="dialog" aria-modal="true" aria-label="Sign in">
      <div className="hyto-auth-hero">
        <Logo className="hyto-auth-logo" />
        <AnilloHitos />
        <div className="hyto-auth-claim">
          <Eslogan />
          <p className="hyto-auth-claim-sub">Do tasks for real projects, send a photo, get paid in USDC.</p>
        </div>
        <ul className="hyto-roles">
          <li>Volunteers</li>
          <li>Organizers</li>
          <li>Paid via Stellar escrow</li>
        </ul>
      </div>
      <div className="hyto-auth-sheet">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-[20px] font-medium tracking-[-0.4px]">Sign in to Hyto</h2>
          <button type="button" className="hyto-cerrar" onClick={() => setFase("inicio")}>
            Close
          </button>
        </div>
        <p className="mt-2 text-sm leading-6 text-[var(--suave)]">For organizers and volunteers. We'll email you a 6-digit code.</p>
        <div className="hyto-steps mt-4" aria-hidden="true">
          <i className="is-on" />
          <i className={fase === "codigo" ? "is-on" : ""} />
        </div>
        <div className="mt-6 grid gap-3">
      {fase === "correo" ? (
        <>
          <p className="text-sm leading-6 text-[var(--suave)]">We'll email you a code. You don't need a separate app.</p>
          <label className="sr-only" htmlFor="correo-entrar">
            Email
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
            placeholder="Email"
            disabled={ocupado !== null}
            className="hyto-input"
          />
          {demo ? <p className="text-sm leading-6 text-[var(--suave)]">{AVISO_DEMO}</p> : <p className="text-sm leading-6 text-[var(--suave)]">{AVISO_SPAM}</p>}
          <button
            type="button"
            onClick={() => void enviarCodigo()}
            disabled={ocupado !== null || espera > 0 || demo}
            className="hyto-btn"
          >
            {ocupado === "envio" ? "Sending…" : "Send code"}
          </button>
          <p className="text-center text-xs uppercase tracking-wide text-[var(--suave)]">or</p>
          <button type="button" onClick={() => void google()} disabled={ocupado !== null} className="hyto-btn-line">
            {ocupado === "google" ? "Opening Google…" : "Sign in with Google"}
          </button>
        </>
      ) : null}
      {fase === "codigo" ? (
        <>
          <p className="text-sm leading-6 text-[var(--suave)]">{AVISO_SPAM}</p>
          <label className="sr-only" htmlFor="codigo-entrar">
            Code
          </label>
          <input
            id="codigo-entrar"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={codigo}
            onChange={(evento) => setCodigo(evento.target.value)}
            placeholder="Code"
            disabled={ocupado !== null}
            className="hyto-input"
          />
          <button type="button" onClick={() => void confirmar()} disabled={ocupado !== null} className="hyto-btn">
            {ocupado === "codigo" ? "Signing in…" : "Confirm"}
          </button>
          <button type="button" onClick={() => void enviarCodigo()} disabled={ocupado !== null || espera > 0} className="hyto-btn-line">
            Resend code
          </button>
        </>
      ) : null}
      {demoHabilitado ? (
        <div className="hyto-card mt-2 grid gap-3 p-4">
          <p className="text-sm font-medium">Try demo mode</p>
          <p className="text-sm text-[var(--suave)]">No account needed</p>
          <label className="sr-only" htmlFor="rol-demo">
            Demo session role
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
            <option value="organizador">Organizer demo account</option>
            <option value="voluntario">Volunteer demo account</option>
          </select>
          <button type="button" onClick={() => void entrarDemo()} disabled={ocupado !== null} className="hyto-btn-line">
            {ocupado === "demo" ? "Signing in…" : "Enter as demo"}
          </button>
        </div>
      ) : null}
      {mensaje ? (
        <p role="status" className="text-sm leading-6 text-[var(--suave)]">
          {mensaje}
        </p>
      ) : null}
          <p className="text-xs leading-5 text-[var(--suave)]">Sign-in by Cavos. Your Stellar wallet is created for you.</p>
        </div>
      </div>
    </div>
  );
}

// The search and redirect are read before any await: the person can navigate
// while Cavos loads, and the one-time code would be gone from the live URL.
// The address is saved here, not in the effect, so an unmount cannot drop it.
function iniciarGoogle(busqueda: string, redirect: string): Promise<ResultadoGoogle> {
  return (async () => {
    try {
      const auth = await crearAuth();
      if (!auth) {
        console.error("Falta NEXT_PUBLIC_CAVOS_APP_ID");
        return { aviso: AVISO_CONFIG, direccion: null, guardada: false };
      }
      const resultado = await entrarConGoogle(auth, busqueda, redirect);
      if (!resultado.direccion) return { ...resultado, guardada: false };
      const guardado = guardarDireccionAdmin(resultado.direccion);
      return { aviso: guardado.aviso ?? resultado.aviso, direccion: resultado.direccion, guardada: !guardado.aviso };
    } catch (error) {
      console.error(error);
      return { aviso: avisoDeIngreso(error).texto, direccion: null, guardada: false };
    }
  })();
}
