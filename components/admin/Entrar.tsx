"use client";

import { useEffect, useId, useRef, useState, type ClipboardEvent, type KeyboardEvent as TeclaReact } from "react";
import Link from "next/link";
import { guardarDireccionAdmin, leerMemoriaAdmin } from "@/lib/admin/memoria";
import { crearAuth, entrarConCodigo, entrarConGoogle, redirectLimpio, urlApple, urlGoogle, type IngresoCerrado } from "@/lib/auth/cliente";
import { leerPoliticaRecuperacion, POLITICA_INACTIVA, type PoliticaRecuperacion, type ProveedorRecuperacion } from "@/lib/auth/enclave";
import {
  guardarIntencion,
  guardarIntencionEnlace,
  intencionGuardada,
  olvidarIntencion,
  tomarIntencionEnlace,
  type IntencionIngreso,
} from "@/lib/auth/intencion";
import {
  destinoTrasIngreso,
  guardarRetorno,
  leerRetorno,
  olvidarRetorno,
  rutaRetornoSegura,
} from "@/lib/sesion/retorno";
import {
  AVISO_CODIGO_INVALIDO,
  AVISO_CODIGO_VENCIDO,
  AVISO_CONFIG,
  AVISO_CORREO,
  AVISO_DEMO,
  AVISO_GENERICO,
  AVISO_METODO_RECUPERACION,
  AVISO_SIN_CUENTA,
  AVISO_SPAM,
  AVISO_SPAM_ENLACE,
  ESPERA_TRAS_ENVIO,
  avisoDeIngreso,
  correoValido,
  esCorreoDemo,
  textoEspera,
} from "@/lib/auth/errores";
import { acortarDireccion } from "@/lib/integrante/formato";
import { mensajeClaro } from "@/lib/ui/claro";
import { SelectorIdiomaMenu, useClaro, useTexto } from "@/components/ui/Idioma";
import { appIdPublico } from "@/lib/integrante/identidades";
import { InsigniaDemo, useModoDemo, useRolDemo } from "@/components/sesion/InsigniaDemo";
import { MileAnimada } from "@/components/ui/MileAnimada";
import { Eslogan, Logo } from "@/components/ui/Marca";
import type { Clave } from "@/lib/ui/diccionario";
import type { EstadoAnimado } from "@/lib/ui/mile-animado";

/** `enlace`: Cavos enclave recovery is on with email, so a sign-in link replaces the code. */
type Fase = "inicio" | "correo" | "codigo" | "enlace" | "exito";
type Pose = "rest" | "dive" | "code" | "worry" | "win";
type Ocupado = "envio" | "google" | "apple" | "codigo" | "demo" | "salida";
type AuthMinimo = { sendOtp(email: string): Promise<void>; sendMagicLink?(email: string): Promise<void> };
type CargarPolitica = () => Promise<PoliticaRecuperacion>;
type ConfirmarCodigo = (auth: AuthMinimo, email: string, codigo: string, intencion: IntencionIngreso) => Promise<IngresoCerrado>;

function politicaDeCavos(): Promise<PoliticaRecuperacion> {
  return leerPoliticaRecuperacion(appIdPublico());
}

/** Where Get ready to be paid finishes a Sign up whose testnet setup did not. */
const DESTINO_ALTA_PENDIENTE = "/eventos";

/** `pendiente` is set when the person is signed in but Sign up testnet setup did not finish. */
type ResultadoIngreso = { aviso: string | null; direccion: string | null; guardada: boolean; pendiente: string | null };

const googleEnCurso = new Map<string, Promise<ResultadoIngreso>>();
/** Read once per one-time code: Strict Mode runs the return effect twice and the link intent is taken on read. */
const regresos = new Map<string, IntencionIngreso>();
/** Latest return effect per code. An older cleanup must not drop a result the current screen still owns. */
const duenosGoogle = new Map<string, number>();
const CLAVE_AVISO_REGRESO = "hyto-aviso-regreso";

/**
 * The return effect unmounted, and nothing newer is waiting on this code.
 * Navigate when the session is ready. Otherwise keep the notice and reopen sign-in,
 * so the person never lands back on a blank login.
 */
function finalizarSinPantalla(resultado: ResultadoIngreso) {
  if (resultado.guardada && resultado.direccion && !resultado.pendiente) {
    const destino = destinoTrasIngreso(leerRetorno(), "/");
    olvidarRetorno();
    window.location.assign(destino);
    return;
  }
  const textoAviso = resultado.aviso ?? resultado.pendiente;
  if (textoAviso) {
    try {
      window.sessionStorage.setItem(CLAVE_AVISO_REGRESO, textoAviso);
    } catch {
      // The reload still opens sign-in.
    }
  }
  const ruta = window.location.pathname || "/";
  window.location.replace(`${ruta}?signin=1`);
}

/**
 * Login asks for no role: an organizer is whoever creates an event. A new account therefore
 * opens Events, where Create event lives, instead of an empty task list.
 */
const DESTINO_ALTA = "/eventos";

const DIGITOS_CODIGO = 6;
const CODIGO_VACIO: string[] = Array.from({ length: DIGITOS_CODIGO }, () => "");
const ENVIO_MINIMO_MS = 600;
/** Success: cells turn lime, the bar fills, the screen fades. 1.72 s in total, under the 1.8 s cap. */
const CELDAS_OK_MS = 280;
const BARRA_MS = 1200;
const FUNDIDO_MS = 240;
const EXITO_REDUCIDO_MS = 800;
const TEMBLOR: Keyframe[] = [0, -8, 8, -6, 6, -3, 0].map((x) => ({ transform: `translateX(${x}px)` }));
const PULSO_CELDA: Keyframe[] = [{ transform: "scale(.96)" }, { transform: "scale(1)" }];
const PULSO_FILA: Keyframe[] = [{ transform: "scale(1)" }, { transform: "scale(1.02)" }, { transform: "scale(1)" }];
const VOZ_MILE: Record<"code" | "worry" | "win", Clave> = {
  code: "entrar.mile.code",
  worry: "entrar.mile.worry",
  win: "entrar.mile.win",
};

export function Entrar({
  demoHabilitado = false,
  crear = crearAuth as () => Promise<AuthMinimo | null>,
  confirmarCodigo = entrarConCodigo as unknown as ConfirmarCodigo,
  esperaMinima = ENVIO_MINIMO_MS,
  abrirLogin = false,
  atiendeUrl = true,
  politica: cargarPolitica = politicaDeCavos,
}: {
  demoHabilitado?: boolean;
  /** Start on the email step instead of the sign up / sign in cards. */
  abrirLogin?: boolean;
  crear?: () => Promise<AuthMinimo | null>;
  confirmarCodigo?: ConfirmarCodigo;
  /** Shortest time the sending state stays on screen, so it never flashes. */
  esperaMinima?: number;
  /**
   * Opens the sign-in screen from the URL (?signin=1 or a Google/Apple return).
   * The screen is a fixed full-page layer, so when a page renders more than one
   * Entrar only one of them may do this, or the later one covers the first.
   */
  atiendeUrl?: boolean;
  /**
   * Cavos enclave recovery policy. Active, it shows only the one sign-in method Cavos accepts for
   * recovery and email sends a link instead of a code. Inactive or unreachable: today's screen.
   */
  politica?: CargarPolitica;
}) {
  const modoDemo = useModoDemo();
  const rolActual = useRolDemo();
  const t = useTexto();
  const claro = useClaro();
  const [direccion, setDireccion] = useState<string | null>(null);
  const [pedirIngreso, setPedirIngreso] = useState(abrirLogin);
  const [retorno, setRetorno] = useState<string | null>(null);
  const [fase, setFase] = useState<Fase>(abrirLogin ? "correo" : "inicio");
  const [pestana, setPestana] = useState<IntencionIngreso>("signin");
  const [correo, setCorreo] = useState("");
  const [digitos, setDigitos] = useState<string[]>(CODIGO_VACIO);
  const [verDemo, setVerDemo] = useState(false);
  const [rolDemo, setRolDemo] = useState<"organizador" | "voluntario">("organizador");
  const [ocupado, setOcupado] = useState<Ocupado | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [alertaRegreso, setAlertaRegreso] = useState(false);
  const [canjeando, setCanjeando] = useState(false);
  const [altaPendiente, setAltaPendiente] = useState<string | null>(null);
  const [espera, setEspera] = useState(0);
  const [mostrarEspera, setMostrarEspera] = useState(false);
  const [verCheck, setVerCheck] = useState(false);
  const [saliendo, setSaliendo] = useState(false);
  const [recuperacion, setRecuperacion] = useState<PoliticaRecuperacion>(POLITICA_INACTIVA);
  const authRef = useRef<AuthMinimo | null>(null);
  const dialogoRef = useRef<HTMLDivElement>(null);
  const filaRef = useRef<HTMLDivElement>(null);
  const enCurso = useRef(false);
  const esperaRef = useRef(0);
  const ids = useId();
  const reducido = useMovimientoReducido();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ingreso = atiendeUrl && params.get("signin") === "1";
    const desdeUrl = rutaRetornoSegura(params.get("next"));
    if (desdeUrl) {
      setRetorno(desdeUrl);
      guardarRetorno(desdeUrl);
    } else if (atiendeUrl && params.get("cavos_auth_code")) {
      // Google/Apple return lands on / with no next query; recover it from sessionStorage.
      setRetorno(leerRetorno());
    }
    if (ingreso) {
      setPedirIngreso(true);
      setPestana("signin");
      setFase("correo");
    }
    if (atiendeUrl) {
      try {
        const guardado = window.sessionStorage.getItem(CLAVE_AVISO_REGRESO);
        if (guardado) {
          window.sessionStorage.removeItem(CLAVE_AVISO_REGRESO);
          setAviso(guardado);
          setAlertaRegreso(true);
          setPedirIngreso(true);
          setFase("correo");
        }
      } catch {
        // Leave the form as it is.
      }
    }
    setDireccion(leerMemoriaAdmin().direccion);
  }, []);

  useEffect(() => {
    let vivo = true;
    void politicaSegura(cargarPolitica).then((valor) => {
      if (vivo) setRecuperacion(valor);
    });
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    (nodo.querySelector<HTMLElement>("[data-foco]") ?? nodo.querySelector<HTMLElement>("input, button"))?.focus();
    function tecla(evento: KeyboardEvent) {
      if (evento.key === "Escape") {
        // On success the session is open and the hand-off to tasks is running.
        if (fase !== "exito") setFase("inicio");
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
  }, [fase, modoDemo, verCheck]);

  useEffect(() => {
    if (!atiendeUrl) return;
    const params = new URLSearchParams(window.location.search);
    const codigoGoogle = params.get("cavos_auth_code");
    if (!codigoGoogle) return;
    const intencion = regresos.get(codigoGoogle) ?? intencionDelRegreso();
    regresos.set(codigoGoogle, intencion);
    setPestana(intencion);
    setFase("correo");
    setAviso(null);
    setAlertaRegreso(false);
    setCanjeando(true);
    const ticket = (duenosGoogle.get(codigoGoogle) ?? 0) + 1;
    duenosGoogle.set(codigoGoogle, ticket);
    let vivo = true;
    const pendiente =
      googleEnCurso.get(codigoGoogle) ?? iniciarGoogle(window.location.search, redirectLimpio(), intencion);
    googleEnCurso.set(codigoGoogle, pendiente);
    void pendiente.then((resultado) => {
      const ultimo = duenosGoogle.get(codigoGoogle) === ticket;
      const sigueAqui = new URLSearchParams(window.location.search).get("cavos_auth_code") === codigoGoogle;
      if (!vivo) {
        if (ultimo && sigueAqui) finalizarSinPantalla(resultado);
        return;
      }
      setCanjeando(false);
      if (resultado.guardada && resultado.direccion) {
        setAlertaRegreso(false);
        entrarListo(resultado.direccion, resultado.pendiente, true, intencion);
        return;
      }
      setAlertaRegreso(Boolean(resultado.aviso));
      setAviso(resultado.aviso);
    });
    return () => {
      vivo = false;
    };
  }, []);

  /**
   * Google leaves a one-time code in the URL, so a clean finish reloads `/`
   * (the server sends a session to Events). Email code uses the same destination
   * (safe `next` / return path, else `/` → Events), matching Google. A pending
   * testnet setup never navigates, so the notice stays visible.
   */
  function entrarListo(direccionGuardada: string, pendiente: string | null, recargar: boolean, intencion: IntencionIngreso = pestana) {
    setDireccion(direccionGuardada);
    setPedirIngreso(false);
    setAviso(null);
    setFase("inicio");
    setAltaPendiente(pendiente);
    if (recargar && !pendiente) {
      const destino = destinoTrasIngreso(retorno ?? leerRetorno(), intencion === "signup" ? DESTINO_ALTA : "/");
      olvidarRetorno();
      window.location.assign(destino);
    }
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

  function abrir(intencion: IntencionIngreso) {
    setAviso(null);
    setPestana(intencion);
    setFase("correo");
  }

  function elegirPestana(intencion: IntencionIngreso) {
    if (ocupado !== null) return;
    setAviso(null);
    setAlertaRegreso(false);
    setPestana(intencion);
  }

  function irACrearCuenta() {
    volverAlCorreo();
    setPestana("signup");
  }

  function volverAlCorreo() {
    setAviso(null);
    setDigitos(CODIGO_VACIO);
    setFase("correo");
  }

  function irATareas() {
    const destino = destinoTrasIngreso(retorno ?? leerRetorno(), pestana === "signup" ? DESTINO_ALTA : undefined);
    olvidarRetorno();
    window.location.assign(destino);
  }

  function celda(indice: number): HTMLInputElement | null {
    return filaRef.current?.querySelectorAll<HTMLInputElement>("input")[indice] ?? null;
  }

  function animar(nodo: Element | null, cuadros: Keyframe[], opciones: KeyframeAnimationOptions) {
    if (reducido || !nodo || typeof nodo.animate !== "function") return;
    nodo.animate(cuadros, opciones);
  }

  /** Fills the cells from `desde`. Paste and one-time-code autofill land here too. */
  function escribirCodigo(desde: number, valor: string) {
    const nuevos = valor.replace(/\D/g, "");
    // After a wrong or expired code, the next keystroke starts over.
    const limpiar = fase === "codigo" && aviso !== null;
    const base = limpiar ? [...CODIGO_VACIO] : [...digitos];
    if (limpiar) setAviso(null);
    let inicio = limpiar ? 0 : desde;
    let cadena = nuevos;
    if (nuevos.length >= DIGITOS_CODIGO) {
      inicio = 0;
      cadena = nuevos.slice(0, DIGITOS_CODIGO);
    } else if (nuevos.length > 1 && !limpiar) {
      cadena = nuevos;
    } else {
      cadena = nuevos.slice(-1);
    }
    if (!cadena) {
      base[desde] = "";
      setDigitos(base);
      return;
    }
    for (let i = 0; i < cadena.length && inicio + i < DIGITOS_CODIGO; i += 1) {
      base[inicio + i] = cadena[i];
      animar(celda(inicio + i), PULSO_CELDA, { duration: 120, delay: cadena.length > 1 ? i * 30 : 0, easing: "ease-out" });
    }
    setDigitos(base);
    const vacia = base.findIndex((digito) => !digito);
    if (vacia === -1) {
      animar(filaRef.current, PULSO_FILA, { duration: 240, easing: "ease-out" });
      celda(DIGITOS_CODIGO - 1)?.blur();
      void confirmar(base.join(""));
      return;
    }
    celda(vacia)?.focus();
  }

  function pegarCodigo(indice: number, evento: ClipboardEvent<HTMLInputElement>) {
    evento.preventDefault();
    escribirCodigo(indice, evento.clipboardData.getData("text"));
  }

  function teclaCodigo(indice: number, evento: TeclaReact<HTMLInputElement>) {
    if (evento.key === "Backspace" && !digitos[indice] && indice > 0) {
      evento.preventDefault();
      const base = [...digitos];
      base[indice - 1] = "";
      setDigitos(base);
      celda(indice - 1)?.focus();
    } else if (evento.key === "ArrowLeft" && indice > 0) {
      evento.preventDefault();
      celda(indice - 1)?.focus();
    } else if (evento.key === "ArrowRight" && indice < DIGITOS_CODIGO - 1) {
      evento.preventDefault();
      celda(indice + 1)?.focus();
    }
  }

  function otraVez() {
    setAviso(null);
    setDigitos(CODIGO_VACIO);
    celda(0)?.focus();
  }

  function pedirOtroCodigo() {
    setDigitos(CODIGO_VACIO);
    void enviarCodigo();
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
      // A new email on Sign in fails here instead of after the code is sent. If the check cannot run, the old path still catches it.
      if (pestana === "signin" && (await cuentaNoExiste(email))) {
        setAlertaRegreso(true);
        setAviso(AVISO_SIN_CUENTA);
        return;
      }
      const politica = await politicaSegura(cargarPolitica);
      setRecuperacion(politica);
      if (politica.activa && politica.proveedor !== "email") {
        setAviso(AVISO_METODO_RECUPERACION);
        return;
      }
      const auth = await crear();
      if (!auth) {
        console.error("Falta NEXT_PUBLIC_CAVOS_APP_ID");
        setAviso(AVISO_CONFIG);
        return;
      }
      if (politica.activa) {
        await enviarEnlace(auth, email);
        return;
      }
      await Promise.all([auth.sendOtp(email), pausa(esperaMinima)]);
      authRef.current = auth;
      setCorreo(email);
      setDigitos(CODIGO_VACIO);
      setFase("codigo");
      iniciarEspera(ESPERA_TRAS_ENVIO, false);
    } catch (error) {
      mostrarFallo(error);
    } finally {
      enCurso.current = false;
      setOcupado(null);
    }
  }

  /**
   * Cavos enclave recovery never accepts an email code, only an email link. The link comes back to
   * this exact URL (it must be in the Cavos Callback URLs, like the Google return) with the same
   * `?cavos_auth_code=` as Google, usually in a new tab, so the intent rides in localStorage.
   */
  async function enviarEnlace(auth: AuthMinimo, email: string) {
    if (typeof auth.sendMagicLink !== "function") {
      setAviso(AVISO_CONFIG);
      return;
    }
    const nextUrl = rutaRetornoSegura(new URLSearchParams(window.location.search).get("next")) ?? retorno ?? leerRetorno();
    if (nextUrl) guardarRetorno(nextUrl);
    guardarIntencionEnlace({ intencion: pestana, retorno: nextUrl });
    // The exchange sends redirectLimpio() as the redirect URI, so the link must be asked from it.
    window.history.replaceState(window.history.state, "", redirectLimpio());
    await Promise.all([auth.sendMagicLink(email), pausa(esperaMinima)]);
    setCorreo(email);
    setFase("enlace");
    iniciarEspera(ESPERA_TRAS_ENVIO, false);
  }

  function pedirOtroEnlace() {
    void enviarCodigo();
  }

  async function confirmar(codigo = digitos.join("")) {
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
      const resultado = guardarEnNavegador(await confirmarCodigo(auth, correo, codigo.trim(), pestana));
      if (!resultado.guardada || !resultado.direccion) {
        setAviso(resultado.aviso ?? AVISO_GENERICO);
        return;
      }
      // A pending setup keeps today's notice and never navigates.
      if (resultado.pendiente) {
        entrarListo(resultado.direccion, resultado.pendiente, false);
        return;
      }
      setFase("exito");
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
      // Demo organizer opens Events. Demo volunteer opens their tasks. The shell nav is unchanged.
      window.location.assign(rol === "voluntario" ? "/mis-tareas" : "/eventos");
    } catch {
      setAviso("Could not sign in.");
    } finally {
      enCurso.current = false;
      setOcupado(null);
    }
  }

  async function google(intencion: IntencionIngreso, proveedor: "google" | "apple" = "google") {
    if (enCurso.current) return;
    enCurso.current = true;
    setAviso(null);
    setOcupado(proveedor);
    guardarIntencion(intencion);
    const nextUrl = rutaRetornoSegura(new URLSearchParams(window.location.search).get("next")) ?? retorno;
    if (nextUrl) guardarRetorno(nextUrl);
    let salio = false;
    try {
      const politica = await politicaSegura(cargarPolitica);
      setRecuperacion(politica);
      if (politica.activa && politica.proveedor !== proveedor) {
        setAviso(AVISO_METODO_RECUPERACION);
        return;
      }
      const auth = await crearAuth();
      if (!auth) {
        console.error("Falta NEXT_PUBLIC_CAVOS_APP_ID");
        setAviso(AVISO_CONFIG);
        return;
      }
      window.location.href = await (proveedor === "apple" ? urlApple : urlGoogle)(auth, redirectLimpio());
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

  const codigoMal = fase === "codigo" && aviso === AVISO_CODIGO_INVALIDO;
  const codigoVencido = fase === "codigo" && aviso === AVISO_CODIGO_VENCIDO;

  useEffect(() => {
    if (!codigoMal) return;
    animar(filaRef.current, TEMBLOR, { duration: 420, easing: "cubic-bezier(.36,.07,.19,.97)" });
    if (typeof navigator.vibrate === "function") navigator.vibrate(30);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codigoMal]);

  useEffect(() => {
    if (fase !== "exito") {
      setVerCheck(false);
      setSaliendo(false);
      return;
    }
    const check = reducido ? 0 : CELDAS_OK_MS;
    const salida = reducido ? EXITO_REDUCIDO_MS : CELDAS_OK_MS + BARRA_MS;
    const ir = reducido ? EXITO_REDUCIDO_MS : CELDAS_OK_MS + BARRA_MS + FUNDIDO_MS;
    const relojes = [
      window.setTimeout(() => setVerCheck(true), check),
      window.setTimeout(() => setSaliendo(true), salida),
      window.setTimeout(irATareas, ir),
    ];
    return () => relojes.forEach((id) => window.clearTimeout(id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fase]);

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
  const correoInvalido = aviso === AVISO_CORREO;
  const alertaFormulario = Boolean(mensaje) && (correoInvalido || alertaRegreso) && !(mostrarEspera && espera > 0);

  if (direccion && !pedirIngreso) {
    return (
      <div className="hyto-post-login">
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
        {altaPendiente ? (
          <div role="status" className="grid gap-2 text-sm leading-6 text-[var(--suave)]">
            <p>
              {claro(altaPendiente)} {t("entrar.altaPendiente")}
            </p>
            <a href={DESTINO_ALTA_PENDIENTE} className="hyto-btn-line is-inline px-5">
              {t("entrar.openEvents")}
            </a>
          </div>
        ) : null}
        <div className="hyto-welcome-step">
          <p className="hyto-welcome-step-title">{t("bienvenida.step")}</p>
          <Link href={destinoTrasIngreso(retorno)} className="hyto-btn hyto-post-login-cta">
            {t("pago.preparePayout")}
          </Link>
        </div>
      </div>
    );
  }

  if (fase === "inicio") {
    return (
      <div className="grid gap-3">
        <section className="hyto-entry hyto-entry-signup" aria-labelledby={`${ids}-signup`}>
          <p className="hyto-kicker">{t("entrar.newHere")}</p>
          <h2 id={`${ids}-signup`} className="text-lg font-semibold tracking-tight">
            {t("entrar.signUp")}
          </h2>
          <p className="text-sm leading-6 text-[var(--suave)]">{t("entrar.signUpBody")}</p>
          <button
            type="button"
            onClick={() => abrir("signup")}
            className="hyto-btn"
          >
            {t("entrar.signUp")}
          </button>
        </section>
        <section className="hyto-entry hyto-entry-signin" aria-labelledby={`${ids}-signin`}>
          <p className="hyto-kicker">{t("entrar.welcomeBack")}</p>
          <h2 id={`${ids}-signin`} className="text-lg font-semibold tracking-tight">
            {t("entrar.signIn")}
          </h2>
          <p className="text-sm leading-6 text-[var(--suave)]">{t("entrar.signInBody")}</p>
          <button
            type="button"
            onClick={() => abrir("signin")}
            className="hyto-btn-line"
          >
            {t("entrar.signIn")}
          </button>
        </section>
        {demoHabilitado ? <Demo rolDemo={rolDemo} setRolDemo={setRolDemo} ocupado={ocupado} entrarDemo={entrarDemo} /> : null}
        {mensaje ? (
          <p role="status" className="text-sm leading-6 text-[var(--suave)]">
            {claro(mensaje)}
          </p>
        ) : null}
      </div>
    );
  }

  const alta = pestana === "signup";
  const enviando = ocupado === "envio";
  const confirmando = ocupado === "codigo";
  const esperaVisible = mostrarEspera && espera > 0;
  const alertaCodigo = fase === "codigo" && aviso !== null && !esperaVisible;
  const celdasOk = fase === "exito" && !verCheck;
  const pose: Pose =
    fase === "exito" ? "win" : enviando || canjeando ? "dive" : alertaCodigo ? "worry" : fase === "codigo" ? "code" : "rest";
  const conEnlace = recuperacion.activa;
  const ofrece = (metodo: ProveedorRecuperacion) => !recuperacion.activa || recuperacion.proveedor === metodo;
  const conCorreo = ofrece("email");
  const conRedes = ofrece("google") || ofrece("apple");
  const chip =
    fase === "exito"
      ? t("entrar.chipExito")
      : enviando || canjeando
        ? t("entrar.chipEnviando")
        : alertaCodigo
          ? t("entrar.chipError")
          : fase === "codigo"
            ? t("entrar.chipCodigoLlego")
            : fase === "enlace"
              ? t("entrar.chipEnlace")
              : t(alta ? "entrar.newHere" : "entrar.welcomeBack");
  const paso = fase === "exito" ? 3 : fase === "codigo" || fase === "enlace" ? 2 : 1;
  const llenado: [number, number, number] =
    fase === "exito"
      ? [1, 1, verCheck ? 1 : 0]
      : fase === "codigo" || fase === "enlace"
        ? [1, 1, 0]
        : enviando
          ? [1, 0.45, 0]
          : [1, 0, 0];
  const vozMile = pose === "code" || pose === "worry" || pose === "win" ? t(VOZ_MILE[pose]) : "";
  const clases = [
    "hyto-login",
    alertaCodigo ? "is-error" : "",
    fase === "exito" ? "is-exito" : "",
    saliendo && !reducido ? "is-saliendo" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      ref={dialogoRef}
      className={clases}
      role="dialog"
      aria-modal="true"
      aria-label={t(alta ? "entrar.dialogSignUp" : "entrar.dialog")}
    >
      <Escena />
      <div className="hyto-login-marco">
        <header className="hyto-login-top">
          <button type="button" className="hyto-login-logo" onClick={() => fase !== "exito" && setFase("inicio")} aria-label={t("entrar.close")}>
            <Logo />
          </button>
          <SelectorIdiomaMenu className="hyto-login-idioma" />
        </header>
        <main className="hyto-login-grid">
          <div className="hyto-login-izq">
            <div className="hyto-login-hero">
              <p className="hyto-login-chip">
                <span aria-hidden="true" />
                {chip}
              </p>
              <Eslogan como="h1" className="hyto-login-titulo" />
              <p className="hyto-login-sub">{t("entrar.sub")}</p>
              <ol className="hyto-login-como" aria-label={t("landing.panel")}>
                {t("landing.panelQ")
                  .split(/(?<=\.)\s+/)
                  .filter(Boolean)
                  .map((linea) => (
                    <li key={linea}>{linea}</li>
                  ))}
              </ol>
            </div>
            <Mile pose={pose} />
          </div>
          <section className={`hyto-login-tarjeta${enviando ? " is-enviando" : ""}`} aria-label={t(alta ? "entrar.titleSignUp" : "entrar.title")}>
            <p className="sr-only" aria-live="polite">
              {vozMile}
            </p>
            {fase === "correo" ? (
              <div className="hyto-login-pestanas" role="tablist" aria-label={t("entrar.pestanas")}>
                <span className="hyto-login-indicador" aria-hidden="true" data-lado={alta ? "der" : "izq"} />
                {(["signin", "signup"] as const).map((valor) => (
                  <button
                    key={valor}
                    type="button"
                    role="tab"
                    aria-selected={pestana === valor}
                    tabIndex={pestana === valor ? 0 : -1}
                    disabled={ocupado !== null}
                    onClick={() => elegirPestana(valor)}
                    onKeyDown={(evento) => {
                      if (evento.key === "ArrowLeft" || evento.key === "ArrowRight") {
                        evento.preventDefault();
                        const otra = valor === "signin" ? "signup" : "signin";
                        elegirPestana(otra);
                        const hermano = evento.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
                        hermano?.[otra === "signin" ? 0 : 1]?.focus();
                      }
                    }}
                  >
                    {t(valor === "signin" ? "entrar.signIn" : "entrar.createAccount")}
                  </button>
                ))}
              </div>
            ) : fase === "codigo" || fase === "enlace" ? (
              <button type="button" className="hyto-login-volver" onClick={volverAlCorreo} disabled={ocupado !== null}>
                <Icono nombre="atras" />
                {t("entrar.cambiarCorreo")}
              </button>
            ) : null}
            <ol className="hyto-login-pasos" aria-label={t("entrar.paso", { n: paso })}>
              {(["entrar.pasoCorreo", conEnlace ? "entrar.pasoEnlace" : "entrar.pasoCodigo", "entrar.pasoListo"] as const).map((clave, indice) => (
                <li
                  key={clave}
                  className={[
                    llenado[indice] >= 1 ? "is-on" : "",
                    llenado[indice] > 0 && llenado[indice] < 1 ? "is-llenando" : "",
                    fase === "exito" && indice === 2 ? "is-final" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <i aria-hidden="true">
                    <b style={{ transform: `scaleX(${llenado[indice]})` }} />
                  </i>
                  <span>{t(clave)}</span>
                </li>
              ))}
            </ol>
            {canjeando ? (
              <div className="hyto-login-cambio hyto-login-canje" role="status" aria-live="polite" aria-busy="true">
                <h2>{t("entrar.signingIn")}</h2>
                <p className="hyto-login-lead">{t("entrar.chipEnviando")}</p>
                <div className="hyto-login-barra" aria-hidden="true">
                  <i className="is-indeterminada" />
                </div>
              </div>
            ) : fase === "correo" ? (
              <div key={pestana} className="hyto-login-cambio">
                <h2>{t(alta ? "entrar.titleSignUp" : "entrar.title")}</h2>
                <p className="hyto-login-lead">{t(alta ? "entrar.introSignUp" : "entrar.intro")}</p>
                {ofrece("google") ? (
                  <button
                    type="button"
                    onClick={() => void google(pestana)}
                    disabled={ocupado !== null}
                    className="hyto-login-btn is-fantasma hyto-login-google"
                  >
                    <IconoGoogle />
                    {ocupado === "google" ? t("entrar.openingGoogle") : t("entrar.googleContinuar")}
                  </button>
                ) : null}
                {ofrece("apple") ? (
                  <button
                    type="button"
                    onClick={() => void google(pestana, "apple")}
                    disabled={ocupado !== null}
                    className="hyto-login-btn is-fantasma hyto-login-apple"
                  >
                    <IconoApple />
                    {ocupado === "apple" ? t("entrar.openingApple") : t("entrar.appleContinuar")}
                  </button>
                ) : null}
                {!conCorreo && mensaje ? (
                  alertaFormulario ? (
                    <div className="hyto-login-alerta" role="alert">
                      <Icono nombre="alerta" />
                      <p>{claro(mensaje)}</p>
                    </div>
                  ) : (
                    <p role="status" className="hyto-login-aviso">
                      {claro(mensaje)}
                    </p>
                  )
                ) : null}
                {conCorreo && conRedes ? (
                  <p className="hyto-login-o">
                    <span>{t("entrar.oCorreo")}</span>
                  </p>
                ) : null}
                {conCorreo ? (
                  <form
                    noValidate
                    onSubmit={(evento) => {
                      evento.preventDefault();
                      void enviarCodigo();
                    }}
                  >
                    <label className="hyto-login-etiqueta" htmlFor={`${ids}-correo`}>
                      {t("entrar.email")}
                    </label>
                    <div className={`hyto-login-campo${enviando ? " is-bloqueado" : ""}`}>
                      <Icono nombre="correo" />
                      <input
                        id={`${ids}-correo`}
                        type="email"
                        autoComplete="email"
                        inputMode="email"
                        data-foco=""
                        value={correo}
                        onChange={(evento) => {
                          setCorreo(evento.target.value);
                          setAviso(null);
                          setAlertaRegreso(false);
                        }}
                        placeholder={t("entrar.correoEjemplo")}
                        disabled={ocupado !== null}
                        aria-invalid={correoInvalido || undefined}
                      />
                      {enviando ? (
                        <span className="hyto-login-candado" aria-hidden="true">
                          <Icono nombre="check" />
                        </span>
                      ) : null}
                    </div>
                    {enviando ? (
                      <p className="hyto-login-estado" aria-live="polite">
                        <img src="/login/mile-icon.svg" alt="" width={22} height={22} />
                        {t("entrar.mile.dive")}
                      </p>
                    ) : (
                      <p className="hyto-login-ayuda">
                        {demo ? claro(AVISO_DEMO) : t(conEnlace ? "entrar.ayudaEnlace" : "entrar.ayudaCorreo")}
                      </p>
                    )}
                    {mensaje ? (
                      alertaFormulario ? (
                        <div className="hyto-login-alerta" role="alert">
                          <Icono nombre="alerta" />
                          <p>{claro(mensaje)}</p>
                        </div>
                      ) : (
                        <p role="status" className="hyto-login-aviso">
                          {claro(mensaje)}
                        </p>
                      )
                    ) : null}
                    {aviso === AVISO_SIN_CUENTA ? (
                      <button type="button" className="hyto-login-btn is-enlace" onClick={() => elegirPestana("signup")} disabled={ocupado !== null}>
                        {t("entrar.irCrearCuenta")}
                      </button>
                    ) : null}
                    <button
                      type="submit"
                      disabled={ocupado !== null || espera > 0 || demo}
                      className={`hyto-login-btn is-primario${enviando ? " is-ocupado" : ""}`}
                    >
                      <span key={enviando ? "envio" : "listo"} className="hyto-login-etiqueta-btn">
                        {enviando ? (
                          <>
                            <span className="hyto-login-spinner" aria-hidden="true" />
                            {t(conEnlace ? "entrar.enviandoEnlace" : "entrar.enviandoCodigo")}
                          </>
                        ) : (
                          <>
                            {t("entrar.continuarCorreo")}
                            <Icono nombre="flecha" />
                          </>
                        )}
                      </span>
                    </button>
                  </form>
                ) : null}
                {demoHabilitado ? (
                  <div className="hyto-login-demo">
                    <p>{t("entrar.soloMirar")}</p>
                    <button
                      type="button"
                      className="hyto-login-btn is-fantasma"
                      onClick={() => setVerDemo((actual) => !actual)}
                      aria-expanded={verDemo}
                      disabled={ocupado !== null}
                    >
                      {t("entrar.probarDemo")}
                    </button>
                  </div>
                ) : null}
                {demoHabilitado && verDemo ? (
                  <Demo rolDemo={rolDemo} setRolDemo={setRolDemo} ocupado={ocupado} entrarDemo={entrarDemo} />
                ) : null}
                <p className="hyto-login-legal">
                  {t(alta ? "entrar.legalSignUp" : "entrar.legal")}{" "}
                  <Link href="/privacy">{t("nav.privacy")}</Link>
                </p>
              </div>
            ) : null}
            {fase === "enlace" ? (
              <div className="hyto-login-cambio">
                <h2>{t("entrar.revisaCorreo")}</h2>
                <p className="hyto-login-lead">
                  {t("entrar.enviamosEnlace")} <strong>{correo}</strong>.
                </p>
                <p className="hyto-login-ayuda">{t("entrar.abrirEnlace")}</p>
                {mensaje ? (
                  <p role="status" className="hyto-login-aviso">
                    {claro(mensaje)}
                  </p>
                ) : null}
                <button
                  type="button"
                  className="hyto-login-btn is-fantasma"
                  onClick={pedirOtroEnlace}
                  disabled={ocupado !== null || espera > 0}
                  data-foco=""
                >
                  <Icono nombre="otra" />
                  {enviando
                    ? t("entrar.enviandoEnlace")
                    : espera > 0
                      ? t("entrar.reenviarEnlaceEn", { t: reloj(espera) })
                      : t("entrar.reenviarEnlace")}
                </button>
                <button type="button" className="hyto-login-btn is-enlace" onClick={volverAlCorreo} disabled={ocupado !== null}>
                  {t("entrar.usarOtro")}
                </button>
                <p className="hyto-login-ayuda is-chica">{claro(AVISO_SPAM_ENLACE)}</p>
              </div>
            ) : null}
            {fase === "codigo" || celdasOk ? (
              <div className="hyto-login-cambio">
                <h2>{t("entrar.revisaCorreo")}</h2>
                <p className="hyto-login-lead">
                  {t("entrar.enviamosA")} <strong>{correo}</strong>.
                </p>
                <p className="hyto-login-etiqueta" id={`${ids}-codigo`}>
                  {t("entrar.code")}
                </p>
                <div
                  ref={filaRef}
                  className={`hyto-login-otp${codigoMal ? " is-mal" : ""}${codigoVencido ? " is-vencido" : ""}${celdasOk ? " is-ok" : ""}`}
                  role="group"
                  aria-labelledby={`${ids}-codigo`}
                >
                  {digitos.map((digito, indice) => (
                    <input
                      key={indice}
                      id={indice === 0 ? `${ids}-digito` : undefined}
                      data-foco={indice === 0 ? "" : undefined}
                      inputMode="numeric"
                      autoComplete={indice === 0 ? "one-time-code" : "off"}
                      pattern="[0-9]*"
                      aria-label={t("entrar.digito", { n: indice + 1 })}
                      aria-invalid={alertaCodigo || undefined}
                      value={digito}
                      disabled={confirmando || fase === "exito"}
                      onFocus={(evento) => evento.currentTarget.select()}
                      onChange={(evento) => escribirCodigo(indice, evento.target.value)}
                      onPaste={(evento) => pegarCodigo(indice, evento)}
                      onKeyDown={(evento) => teclaCodigo(indice, evento)}
                      style={{ animationDelay: `${indice * 40}ms`, transitionDelay: celdasOk ? `${indice * 40}ms` : undefined }}
                      className={digito ? "is-lleno" : ""}
                    />
                  ))}
                </div>
                {alertaCodigo ? (
                  <div className="hyto-login-alerta" role="alert">
                    <Icono nombre="alerta" />
                    <p>
                      {codigoMal ? (
                        <>
                          <strong>{t("entrar.codigoMalTitulo")}</strong> {t("entrar.codigoMalCuerpo")}
                        </>
                      ) : codigoVencido ? (
                        <>
                          <strong>{t("entrar.codigoVencidoTitulo")}</strong> {t("entrar.codigoVencidoCuerpo")}
                        </>
                      ) : (
                        claro(aviso ?? "")
                      )}
                    </p>
                  </div>
                ) : (
                  <p className="hyto-login-ayuda">{t("entrar.autoConfirma")}</p>
                )}
                {alertaCodigo && aviso === AVISO_SIN_CUENTA ? (
                  <button type="button" className="hyto-login-btn is-enlace" onClick={irACrearCuenta} disabled={ocupado !== null}>
                    {t("entrar.irCrearCuenta")}
                  </button>
                ) : null}
                {esperaVisible ? (
                  <p role="status" className="hyto-login-aviso">
                    {claro(textoEspera(espera))}
                  </p>
                ) : null}
                {codigoVencido ? (
                  <>
                    <button type="button" className="hyto-login-btn is-primario" onClick={pedirOtroCodigo} disabled={ocupado !== null}>
                      <span key="otro" className="hyto-login-etiqueta-btn">
                        <Icono nombre="otra" />
                        {enviando ? t("entrar.enviandoCodigo") : t("entrar.pedirOtro")}
                      </span>
                    </button>
                    <button type="button" className="hyto-login-btn is-enlace" onClick={volverAlCorreo} disabled={ocupado !== null}>
                      {t("entrar.usarOtro")}
                    </button>
                  </>
                ) : codigoMal ? (
                  <>
                    <button type="button" className="hyto-login-btn is-primario" onClick={otraVez} disabled={ocupado !== null}>
                      <span key="otra" className="hyto-login-etiqueta-btn">
                        {t("entrar.probarOtraVez")}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="hyto-login-btn is-fantasma"
                      onClick={pedirOtroCodigo}
                      disabled={ocupado !== null || espera > 0}
                    >
                      <Icono nombre="otra" />
                      {espera > 0 ? t("entrar.reenviarEn", { t: reloj(espera) }) : t("entrar.resend")}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="hyto-login-btn is-primario"
                      onClick={() => void confirmar()}
                      disabled={ocupado !== null || fase === "exito" || digitos.some((digito) => !digito)}
                    >
                      <span key={confirmando ? "entrando" : "entrar"} className="hyto-login-etiqueta-btn">
                        {confirmando || fase === "exito"
                          ? t("entrar.signingIn")
                          : t(alta ? "entrar.createAccount" : "entrar.signIn")}
                      </span>
                    </button>
                    {confirmando || fase === "exito" ? (
                      <div role="status" aria-live="polite" aria-busy="true">
                        <p className="hyto-login-ayuda">{t(alta ? "entrar.settingUp" : "entrar.signingIn")}</p>
                        <div className="hyto-login-barra" aria-hidden="true">
                          <i className="is-indeterminada" />
                        </div>
                      </div>
                    ) : null}
                    <p className="hyto-login-reenvio">
                      {t("entrar.noLlego")}{" "}
                      {espera > 0 ? (
                        <span className="hyto-login-tenue">
                          <Icono nombre="reloj" />
                          {t("entrar.reenviarEn", { t: reloj(espera) })}
                        </span>
                      ) : (
                        <button type="button" onClick={pedirOtroCodigo} disabled={ocupado !== null}>
                          {enviando ? t("entrar.enviandoCodigo") : t("entrar.resend")}
                        </button>
                      )}
                    </p>
                    <p className="hyto-login-ayuda is-chica">{claro(AVISO_SPAM)}</p>
                  </>
                )}
              </div>
            ) : null}
            {fase === "exito" && verCheck ? (
              <div className="hyto-login-cambio hyto-login-exito">
                <span className="hyto-login-check" aria-hidden="true">
                  <Icono nombre="check" />
                </span>
                <h2>{t("entrar.yaEntraste")}</h2>
                <p className="hyto-login-lead">{t("entrar.llevando")}</p>
                <div className="hyto-login-barra" aria-hidden="true">
                  <i />
                </div>
                <button type="button" className="hyto-login-btn is-fantasma" onClick={irATareas} data-foco="">
                  {t("entrar.irTareas")}
                  <Icono nombre="flecha" />
                </button>
              </div>
            ) : null}
          </section>
        </main>
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

/** The policy loader never throws: any failure keeps today's sign-in. */
async function politicaSegura(cargar: CargarPolitica): Promise<PoliticaRecuperacion> {
  try {
    return (await cargar()) ?? POLITICA_INACTIVA;
  } catch {
    return POLITICA_INACTIVA;
  }
}

/**
 * Google and Apple return to the tab that left, which kept its intent in sessionStorage. An email
 * link usually opens a new tab, so its intent and return path come from localStorage.
 */
/** True only when the server says there is no account. Any failure of the check answers false. */
async function cuentaNoExiste(email: string): Promise<boolean> {
  try {
    const respuesta = await fetch("/api/sesion/existe", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (!respuesta.ok) return false;
    const cuerpo = (await respuesta.json().catch(() => null)) as { existe?: unknown } | null;
    return cuerpo?.existe === false;
  } catch {
    return false;
  }
}

function intencionDelRegreso(): IntencionIngreso {
  const enlace = tomarIntencionEnlace();
  const propia = intencionGuardada();
  if (!propia && enlace?.retorno && !leerRetorno()) guardarRetorno(enlace.retorno);
  return propia ?? enlace?.intencion ?? "signin";
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
  rolDemo: "organizador" | "voluntario";
  setRolDemo: (rol: "organizador" | "voluntario") => void;
  ocupado: Ocupado | null;
  entrarDemo: (rolPedido?: "organizador" | "voluntario") => Promise<void>;
}) {
  const t = useTexto();
  const idRol = `${useId()}-rol-demo`;
  return (
    <div className="hyto-card grid gap-3 p-4">
      <p className="text-sm font-medium">{t("entrar.tryDemo")}</p>
      <p className="text-sm text-[var(--suave)]">{t("entrar.noAccount")}</p>
      <label className="sr-only" htmlFor={idRol}>
        {t("entrar.demoRole")}
      </label>
      <select
        id={idRol}
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
  );
}

function pausa(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

/** 20 → "0:20", the resend countdown. */
function reloj(segundos: number): string {
  const n = Math.max(0, Math.ceil(segundos));
  return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;
}

function useMovimientoReducido(): boolean {
  const [reducido, setReducido] = useState(false);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const consulta = window.matchMedia("(prefers-reduced-motion: reduce)");
    const cambiar = () => setReducido(consulta.matches);
    cambiar();
    consulta.addEventListener?.("change", cambiar);
    return () => consulta.removeEventListener?.("change", cambiar);
  }, []);
  return reducido;
}

const CLAVE_LINEAS = "hyto-login-lineas";

function lineasVistas(): boolean {
  try {
    return window.sessionStorage.getItem(CLAVE_LINEAS) === "1";
  } catch {
    return true;
  }
}

/**
 * Background: guide lines with dots and three pre-blurred bitmaps that only rotate.
 * The bitmaps mount after idle time, so the form paints first. Every loop pauses
 * while the tab is hidden.
 */
function Escena() {
  const raizRef = useRef<HTMLDivElement>(null);
  const [capas, setCapas] = useState<string[]>([]);
  const [dibujar] = useState(() => !lineasVistas());

  useEffect(() => {
    try {
      window.sessionStorage.setItem(CLAVE_LINEAS, "1");
    } catch {
      // The lines simply draw again next time.
    }
  }, []);

  useEffect(() => {
    const movil = typeof window.matchMedia === "function" && window.matchMedia("(max-width: 1023px)").matches;
    const lista = movil ? ["b", "a"] : ["c", "b", "a"];
    const montar = () => setCapas(lista);
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(montar, { timeout: 1500 });
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(montar, 200);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    const raiz = raizRef.current?.closest<HTMLElement>(".hyto-login");
    if (!raiz) return;
    const marcar = () => raiz.toggleAttribute("data-oculto", document.hidden);
    marcar();
    document.addEventListener("visibilitychange", marcar);
    return () => document.removeEventListener("visibilitychange", marcar);
  }, []);

  return (
    <div ref={raizRef} className="hyto-login-escena" aria-hidden="true">
      <div className="hyto-login-remolino">
        {capas.map((capa) => (
          <div key={capa} className={`hyto-login-capa is-${capa}`}>
            <img src={`/login/swirl-${capa}.webp`} alt="" decoding="async" />
          </div>
        ))}
      </div>
      <div className="hyto-login-vineta" />
      <div className={`hyto-login-lineas${dibujar ? " is-dibujo" : ""}`}>
        <i className="is-v is-l" />
        <i className="is-v is-r" />
        <i className="is-h is-t" />
        <i className="is-h is-b" />
        <b className="is-1" />
        <b className="is-2" />
        <b className="is-3" />
        <b className="is-4" />
      </div>
    </div>
  );
}

const ESTADO_MILE: Record<Pose, EstadoAnimado> = { rest: "reposo", dive: "buscando", code: "buscando", worry: "rechazado", win: "lo-tengo" };

/** Mile and the chest, animated by code. The status text stays in the aria-live region of the card. */
function Mile({ pose }: { pose: Pose }) {
  return (
    <div className={`hyto-login-mile is-${pose}`}>
      <MileAnimada estado={ESTADO_MILE[pose]} llena tocable />
    </div>
  );
}

const TRAZOS = {
  atras: <path d="M19 12H5M11 6l-6 6 6 6" />,
  flecha: <path d="M5 12h14M13 6l6 6-6 6" />,
  correo: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="m4 7 8 6 8-6" />
    </>
  ),
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  alerta: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5.5M12 16.5h.01" />
    </>
  ),
  otra: <path d="M20 11a8 8 0 0 0-14.6-4.5M4 4v4h4M4 13a8 8 0 0 0 14.6 4.5M20 20v-4h-4" />,
  reloj: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
};

function Icono({ nombre }: { nombre: keyof typeof TRAZOS }) {
  return (
    <svg
      className="hyto-login-icono"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {TRAZOS[nombre]}
    </svg>
  );
}

function IconoGoogle() {
  return (
    <svg className="hyto-login-g" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

function IconoApple() {
  return (
    <svg className="hyto-login-g" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.37 12.6c-.02-2.3 1.88-3.4 1.96-3.46-1.07-1.56-2.73-1.77-3.32-1.8-1.41-.14-2.76.83-3.47.83-.72 0-1.82-.81-3-.79-1.54.02-2.96.9-3.76 2.28-1.6 2.78-.41 6.9 1.15 9.16.76 1.1 1.67 2.34 2.86 2.3 1.15-.05 1.58-.74 2.97-.74 1.38 0 1.77.74 2.98.72 1.23-.02 2.01-1.12 2.77-2.23.87-1.28 1.23-2.52 1.25-2.58-.03-.01-2.4-.92-2.39-3.69zM14.1 5.84c.63-.77 1.06-1.83.94-2.89-.91.04-2.01.61-2.66 1.37-.58.67-1.1 1.76-.96 2.8 1.01.08 2.05-.52 2.68-1.28z" />
    </svg>
  );
}
