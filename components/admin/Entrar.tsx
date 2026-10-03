"use client";

import { useEffect, useRef, useState } from "react";
import { guardarDireccionAdmin, leerMemoriaAdmin } from "@/lib/admin/memoria";
import { crearAuth, entrarConCodigo, entrarConGoogle, redirectLimpio, urlGoogle, type IngresoCerrado } from "@/lib/auth/cliente";
import { guardarIntencion, leerIntencion, olvidarIntencion, type IntencionIngreso } from "@/lib/auth/intencion";
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

type Fase = "inicio" | "signup" | "signin" | "correo" | "codigo";
type Ocupado = "envio" | "google" | "codigo" | "demo" | "salida";

/** `pendiente` is set when the person is signed in but Sign up testnet setup did not finish. */
type ResultadoIngreso = { aviso: string | null; direccion: string | null; guardada: boolean; pendiente: string | null };

const googleEnCurso = new Map<string, Promise<ResultadoIngreso>>();

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
  const [altaPendiente, setAltaPendiente] = useState<string | null>(null);
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
      setFase("signin");
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
    const intencion = leerIntencion();
    setFase(intencion === "signup" ? "signup" : "signin");
    setAviso(intencion === "signup" ? "Setting up your Stellar testnet wallet…" : "Signing you in…");
    let vivo = true;
    const pendiente =
      googleEnCurso.get(codigoGoogle) ?? iniciarGoogle(window.location.search, redirectLimpio(), intencion);
    googleEnCurso.set(codigoGoogle, pendiente);
    void pendiente.then((resultado) => {
      if (!vivo) return;
      if (resultado.guardada && resultado.direccion) {
        entrarListo(resultado.direccion, resultado.pendiente);
        return;
      }
      setAviso(resultado.aviso);
    });
    return () => {
      vivo = false;
    };
  }, []);

  function entrarListo(direccionGuardada: string, pendiente: string | null) {
    setDireccion(direccionGuardada);
    setPedirIngreso(false);
    setAviso(null);
    setFase("inicio");
    setAltaPendiente(pendiente);
    if (!pendiente) window.location.assign("/");
  }

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
      const resultado = guardarEnNavegador(await entrarConCodigo(auth, correo, codigo.trim(), "signup"));
      if (!resultado.guardada || !resultado.direccion) {
        setAviso(resultado.aviso ?? AVISO_GENERICO);
        return;
      }
      entrarListo(resultado.direccion, resultado.pendiente);
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

  async function google(intencion: IntencionIngreso) {
    if (enCurso.current) return;
    enCurso.current = true;
    setAviso(null);
    setOcupado("google");
    guardarIntencion(intencion);
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
          {altaPendiente ? (
            <div role="status" className="mt-2 grid gap-2 text-sm leading-6 text-[var(--suave)]">
              <p>
                {altaPendiente} Open Account and tap Get ready to be paid to finish setup on Stellar testnet.
              </p>
              <a href="/cuentas" className="hyto-btn-line is-inline px-5">
                Open Account
              </a>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  if (fase === "inicio") {
    return (
      <div className="grid gap-3">
        <section className="hyto-entry hyto-entry-signup" aria-labelledby="entrar-signup">
          <p className="hyto-kicker">New to Hyto</p>
          <h2 id="entrar-signup" className="text-lg font-semibold tracking-tight">
            Sign up
          </h2>
          <p className="text-sm leading-6 text-[var(--suave)]">
            First time here. We'll create your Hyto account and a Stellar testnet wallet, fund it with Friendbot if the account is missing, and add the USDC trustline.
          </p>
          <button
            type="button"
            onClick={() => {
              setAviso(null);
              setFase("signup");
            }}
            className="hyto-btn"
          >
            Sign up
          </button>
        </section>
        <section className="hyto-entry hyto-entry-signin" aria-labelledby="entrar-signin">
          <p className="hyto-kicker">Welcome back</p>
          <h2 id="entrar-signin" className="text-lg font-semibold tracking-tight">
            Sign in
          </h2>
          <p className="text-sm leading-6 text-[var(--suave)]">
            You already have an account and a wallet. Google opens that session. We won't create a new account or set up Stellar again.
          </p>
          <button
            type="button"
            onClick={() => {
              setAviso(null);
              setFase("signin");
            }}
            className="hyto-btn-line"
          >
            Sign in
          </button>
        </section>
        {demoHabilitado ? <Demo demoHabilitado rolDemo={rolDemo} setRolDemo={setRolDemo} ocupado={ocupado} entrarDemo={entrarDemo} /> : null}
        {mensaje ? (
          <p role="status" className="text-sm leading-6 text-[var(--suave)]">
            {mensaje}
          </p>
        ) : null}
      </div>
    );
  }

  const alta = fase !== "signin";
  const titulo = alta ? "Sign up" : "Sign in";

  return (
    <div ref={dialogoRef} className={`hyto-auth ${alta ? "is-signup" : "is-signin"}`} role="dialog" aria-modal="true" aria-label={titulo}>
      <div className="hyto-auth-hero">
        <Logo className="hyto-auth-logo" />
        <AnilloHitos />
        <div className="hyto-auth-claim">
          <Eslogan />
          <p className="hyto-auth-claim-sub">
            {alta
              ? "Create your account and a Stellar testnet wallet. Friendbot funds it if it's new, then we add the USDC trustline."
              : "Google only. We restore your existing profile and wallet. Nothing new is created on Stellar."}
          </p>
        </div>
        <ul className="hyto-roles">
          <li>Volunteers</li>
          <li>Organizers</li>
          <li>Paid via Stellar escrow</li>
        </ul>
      </div>
      <div className="hyto-auth-sheet">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-[20px] font-medium tracking-[-0.4px]">{alta ? "Sign up for Hyto" : "Sign in to Hyto"}</h2>
          <button type="button" className="hyto-cerrar" onClick={() => setFase("inicio")}>
            Close
          </button>
        </div>
        <p className="mt-2 text-sm leading-6 text-[var(--suave)]">
          {alta
            ? "Google creates your account and sets up Stellar testnet. Email works too."
            : "Google only. We won't fund Friendbot, add a trustline, or create another wallet."}
        </p>
        {fase === "correo" || fase === "codigo" ? (
          <div className="hyto-steps mt-4" aria-hidden="true">
            <i className="is-on" />
            <i className={fase === "codigo" ? "is-on" : ""} />
          </div>
        ) : null}
        <div className="mt-6 grid gap-3">
      {fase === "signup" ? (
        <>
          <button type="button" onClick={() => void google("signup")} disabled={ocupado !== null} className="hyto-btn">
            {ocupado === "google" ? "Opening Google…" : "Sign up with Google"}
          </button>
          <p className="text-center text-xs uppercase tracking-wide text-[var(--suave)]">or</p>
          <button
            type="button"
            onClick={() => {
              setAviso(null);
              setFase("correo");
            }}
            disabled={ocupado !== null}
            className="hyto-btn-line"
          >
            Sign up with email
          </button>
        </>
      ) : null}
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
          <button
            type="button"
            onClick={() => {
              setAviso(null);
              setFase("signup");
            }}
            disabled={ocupado !== null}
            className="hyto-btn-line"
          >
            Back
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
            {ocupado === "codigo" ? "Creating account…" : "Create account"}
          </button>
          <button type="button" onClick={() => void enviarCodigo()} disabled={ocupado !== null || espera > 0} className="hyto-btn-line">
            Resend code
          </button>
        </>
      ) : null}
      {fase === "signin" ? (
        <button type="button" onClick={() => void google("signin")} disabled={ocupado !== null} className="hyto-btn">
          {ocupado === "google" ? "Opening Google…" : "Sign in with Google"}
        </button>
      ) : null}
      {!alta && demoHabilitado ? (
        <Demo demoHabilitado rolDemo={rolDemo} setRolDemo={setRolDemo} ocupado={ocupado} entrarDemo={entrarDemo} />
      ) : null}
      {mensaje ? (
        <p role="status" className="text-sm leading-6 text-[var(--suave)]">
          {mensaje}
        </p>
      ) : null}
          <p className="text-xs leading-5 text-[var(--suave)]">
            {alta
              ? "Cavos on Stellar testnet. Sign up creates the wallet, uses Friendbot if the account is missing, and adds the USDC trustline."
              : "Cavos on Stellar testnet. Sign in opens the wallet you already have."}
          </p>
        </div>
      </div>
    </div>
  );
}

// The search, redirect, and intent are read before any await: the person can
// navigate while Cavos loads, and the one-time code would be gone from the live
// URL. The address is saved here, not in the effect, so an unmount cannot drop it.
// Once the server session holds the wallet, this browser stores it too. A
// testnet setup failure after that point is a notice, not a failed sign-in.
function guardarEnNavegador(cerrado: IngresoCerrado): ResultadoIngreso {
  if (!cerrado.guardada || !cerrado.direccion) {
    return { aviso: cerrado.aviso ?? AVISO_GENERICO, direccion: cerrado.direccion, guardada: false, pendiente: null };
  }
  const local = guardarDireccionAdmin(cerrado.direccion);
  if (local.aviso) return { aviso: local.aviso, direccion: cerrado.direccion, guardada: false, pendiente: null };
  return { aviso: null, direccion: cerrado.direccion, guardada: true, pendiente: cerrado.aviso };
}

function iniciarGoogle(busqueda: string, redirect: string, intencion: IntencionIngreso): Promise<ResultadoIngreso> {
  return (async () => {
    try {
      const auth = await crearAuth();
      if (!auth) {
        console.error("Falta NEXT_PUBLIC_CAVOS_APP_ID");
        return { aviso: AVISO_CONFIG, direccion: null, guardada: false, pendiente: null };
      }
      return guardarEnNavegador(await entrarConGoogle(auth, busqueda, redirect, intencion));
    } catch (error) {
      console.error(error);
      return { aviso: avisoDeIngreso(error).texto, direccion: null, guardada: false, pendiente: null };
    }
  })().finally(() => olvidarIntencion());
}

function Demo({
  rolDemo,
  setRolDemo,
  ocupado,
  entrarDemo,
}: {
  demoHabilitado: boolean;
  rolDemo: "organizador" | "voluntario";
  setRolDemo: (rol: "organizador" | "voluntario") => void;
  ocupado: Ocupado | null;
  entrarDemo: (rolPedido?: "organizador" | "voluntario") => Promise<void>;
}) {
  return (
    <div className="hyto-card grid gap-3 p-4">
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
  );
}
