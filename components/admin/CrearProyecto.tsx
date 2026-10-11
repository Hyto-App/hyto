"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { SugeridosElegir } from "@/components/perfil/Sugeridos";
import { useClaro, useIdioma, useTexto } from "@/components/ui/Idioma";
import { useModoDemo } from "@/components/sesion/InsigniaDemo";
import { textoMonto } from "@/lib/admin/vista";
import {
  calcularPresupuesto,
  cuentaFila,
  cuerpoCrear,
  ejemploCasaAlquiler,
  filaVacia,
  montoEnCampo,
  puedeCrear,
  revisarTareas,
  type FilaCrear,
  type Presupuesto,
} from "@/lib/admin/crear-flujo";
import { formatearMonto } from "@/lib/integrante/formato";
import type { Sugerido } from "@/lib/perfil/sugeridos";
import { avisoMontoEntrada, escribirMonto } from "@/lib/tareas/monto-entrada";
import { fechaGuardadaVisible, problemaFechaLocal, rangoFecha, type ProblemaFecha } from "@/lib/tareas/fecha-limite";
import { contextoAbierto, errorPortada } from "@/lib/ui/campos-evento";
import type { Clave } from "@/lib/ui/diccionario";

type Paso = 1 | 2 | 3;

type CampoTarea = "titulo" | "monto" | "quien";

/** Which field of the card a task error points at. */
function campoDeError(error: string): CampoTarea {
  if (error === "montoInvalido" || error === "faltaMonto") return "monto";
  if (error === "correoInvalido") return "quien";
  return "titulo";
}

/** Scrolls a field to the middle of the screen (clear of the top bar and the fixed bottom bar) and focuses it. */
function irAlCampo(id: string) {
  const campo = document.getElementById(id);
  if (!campo) return;
  const suave = typeof window.matchMedia === "function" && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  campo.scrollIntoView({
    block: "center",
    behavior: suave ? "smooth" : "auto",
  });
  campo.focus({ preventScroll: true });
}

const MAX_DESCRIPCION = 1000;
const MAX_CONTEXTO = 2000;
const MAX_NOMBRE = 120;

/** Grows a textarea with its text. */
function useAutoAltura(valor: string) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const area = ref.current;
    if (!area) return;
    area.style.height = "auto";
    area.style.height = `${area.scrollHeight}px`;
  }, [valor]);
  return ref;
}

function Area({
  id,
  valor,
  max,
  placeholder,
  className = "",
  describedBy,
  onCambio,
  unaLinea = false,
}: {
  id: string;
  valor: string;
  max: number;
  placeholder?: string;
  className?: string;
  describedBy?: string;
  onCambio: (valor: string) => void;
  unaLinea?: boolean;
}) {
  const ref = useAutoAltura(valor);
  return (
    <textarea
      ref={ref}
      id={id}
      value={valor}
      rows={1}
      maxLength={max}
      placeholder={placeholder}
      aria-describedby={describedBy}
      className={className}
      onKeyDown={unaLinea ? (evento) => evento.key === "Enter" && evento.preventDefault() : undefined}
      onChange={(evento) => onCambio(unaLinea ? evento.target.value.replace(/[\r\n]+/g, " ") : evento.target.value)}
    />
  );
}

/** Art used until the organizer picks a cover: a dusk sky, no photo needed. */
function ArtePortada() {
  return (
    <div className="cp-arte" aria-hidden="true">
      <span className="cp-arte-sol" />
      <span className="cp-arte-horizonte" />
    </div>
  );
}

function Icono({ nombre }: { nombre: "trabajo" | "reembolso" | "mas" | "flecha" | "atras" | "candado" | "chispa" | "arriba" }) {
  const comun = {
    width: 16,
    height: 16,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (nombre) {
    case "trabajo":
      return (
        <svg {...comun}>
          <rect x="3" y="7" width="18" height="13" rx="2" />
          <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 12h18" />
        </svg>
      );
    case "reembolso":
      return (
        <svg {...comun}>
          <path d="M3 12a9 9 0 1 0 3-6.7" />
          <path d="M3 4v5h5" />
        </svg>
      );
    case "mas":
      return (
        <svg {...comun}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
    case "flecha":
      return (
        <svg {...comun}>
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      );
    case "atras":
      return (
        <svg {...comun}>
          <path d="M15 6l-6 6 6 6" />
        </svg>
      );
    case "arriba":
      return (
        <svg {...comun} width={12} height={12}>
          <path d="M6 15l6-6 6 6" />
        </svg>
      );
    case "candado":
      return (
        <svg {...comun}>
          <rect x="5" y="11" width="14" height="9" rx="2" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </svg>
      );
    case "chispa":
      return (
        <svg {...comun} width={12} height={12}>
          <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />
        </svg>
      );
  }
}

function Puntos({ paso }: { paso: Paso }) {
  return (
    <span className="cp-puntos" aria-hidden="true">
      {[1, 2, 3].map((n) => (
        <span key={n} className={`cp-punto${n === paso ? " is-on" : n < paso ? " is-hecho" : ""}`} />
      ))}
    </span>
  );
}

function Monto({ centavos }: { centavos: number }) {
  const idioma = useIdioma();
  return <>{formatearMonto(textoMonto(centavos), idioma)}</>;
}

/** Centered sticky bar: total and task count; tap to see the breakdown; balance and what is left or missing. */
function BarraPresupuesto({ p }: { p: Presupuesto }) {
  const t = useTexto();
  const idioma = useIdioma();
  const [abierto, setAbierto] = useState(false);
  const tareas = p.tareas === 1 ? t("crear.unaTarea") : t("crear.nTareas", { n: p.tareas });
  return (
    <div className={`cp-presupuesto${p.falta ? " is-falta" : ""}`} data-presupuesto={p.falta ? "falta" : "ok"}>
      <button type="button" className="cp-presupuesto-boton" aria-expanded={abierto} aria-controls="cp-desglose" onClick={() => setAbierto((valor) => !valor)}>
        <span className={`cp-pista${abierto ? " is-abierto" : ""}`}>
          <Icono nombre="arriba" />
          {abierto ? t("crear.ocultarDesglose") : t("crear.verDesglose")}
        </span>
        <span className="cp-suma">
          {t("crear.total")}{" "}
          <b className="cp-lima">
            <Monto centavos={p.total} />
          </b>{" "}
          · <b>{tareas}</b>
        </span>
      </button>
      {abierto ? (
        <dl id="cp-desglose" className="cp-filas">
          <div>
            <dt>{t("crear.tareasTrabajo")}</dt>
            <dd>
              <Monto centavos={p.trabajo} />
            </dd>
          </div>
          <div>
            <dt>{t("crear.reembolsos")}</dt>
            <dd>
              <small>{t("crear.hasta")}</small> <Monto centavos={p.reembolso} />
            </dd>
          </div>
          <div className="is-total">
            <dt>{t("crear.total")}</dt>
            <dd>
              <Monto centavos={p.total} />
            </dd>
          </div>
        </dl>
      ) : null}
      {p.saldo !== null ? (
        <p className="cp-saldo" data-saldo>
          {t("crear.suSaldo", { monto: formatearMonto(p.saldo, idioma) })} ·{" "}
          {p.falta ? (
            <b className="cp-naranja">
              {t("crear.leFaltan", {
                monto: formatearMonto(p.falta.falta, idioma),
              })}
            </b>
          ) : (
            <b className="cp-lima">
              {t("crear.leQuedan", {
                monto: formatearMonto(textoMonto(Math.max(0, p.quedan ?? 0)), idioma),
              })}
            </b>
          )}
        </p>
      ) : null}
      {p.falta ? (
        <>
          <p id="aviso-saldo-crear" className={abierto ? "cp-falta" : "sr-only"} role="status">
            {t("crear.noAlcanza")}{" "}
            {t("crear.reserva", {
              monto: formatearMonto(p.falta.reserva, idioma),
            })}
          </p>
          <Link href="/configuracion#saldo" className="cp-agregar-saldo">
            <Icono nombre="mas" />
            {t("crear.agregarSaldo")}
          </Link>
        </>
      ) : null}
    </div>
  );
}

/** Mobile step 3: one compact line, total and task count; the breakdown lives in the step's summary. */
function BarraCompacta({ p }: { p: Presupuesto }) {
  const t = useTexto();
  const idioma = useIdioma();
  const tareas = p.tareas === 1 ? t("crear.unaTarea") : t("crear.nTareas", { n: p.tareas });
  return (
    <div className={`cp-presupuesto is-compacta${p.falta ? " is-falta" : ""}`} data-presupuesto={p.falta ? "falta" : "ok"}>
      <p className="cp-suma">
        {t("crear.total")}{" "}
        <b className={p.falta ? "cp-naranja" : "cp-lima"}>
          <Monto centavos={p.total} />
        </b>{" "}
        · <b>{tareas}</b>
      </p>
      {p.falta ? (
        <>
          <p id="aviso-saldo-crear" className="sr-only" role="status">
            {t("crear.noAlcanza")}{" "}
            {t("crear.reserva", {
              monto: formatearMonto(p.falta.reserva, idioma),
            })}
          </p>
          <Link href="/configuracion#saldo" className="cp-agregar-saldo">
            <Icono nombre="mas" />
            {t("crear.agregarSaldo")}
          </Link>
        </>
      ) : null}
    </div>
  );
}

/** Breakdown, balance and what is left or missing. Step 3's summary, and the right column on desktop. */
function Resumen({ p, clase = "" }: { p: Presupuesto; clase?: string }) {
  const t = useTexto();
  const idioma = useIdioma();
  const tareas = p.tareas === 1 ? t("crear.unaTarea") : t("crear.nTareas", { n: p.tareas });
  return (
    <section className={`cp-resumen${p.falta ? " is-falta" : ""}${clase ? ` ${clase}` : ""}`} aria-label={t("crear.desglose")}>
      <p className="cp-desglose-titulo">{t("crear.desglose")}</p>
      <p className="cp-resumen-total">
        <b className={p.falta ? "cp-naranja" : "cp-lima"}>
          <Monto centavos={p.total} />
        </b>
        <span>{tareas}</span>
      </p>
      <dl className="cp-filas">
        <div>
          <dt>{t("crear.tareasTrabajo")}</dt>
          <dd>
            <Monto centavos={p.trabajo} />
          </dd>
        </div>
        <div>
          <dt>{t("crear.reembolsos")}</dt>
          <dd>
            <small>{t("crear.hasta")}</small> <Monto centavos={p.reembolso} />
          </dd>
        </div>
        <div className="is-total">
          <dt>{t("crear.total")}</dt>
          <dd>
            <Monto centavos={p.total} />
          </dd>
        </div>
      </dl>
      {p.saldo !== null ? (
        <p className="cp-saldo" data-saldo>
          {t("crear.suSaldo", { monto: formatearMonto(p.saldo, idioma) })} ·{" "}
          {p.falta ? (
            <b className="cp-naranja">
              {t("crear.leFaltan", {
                monto: formatearMonto(p.falta.falta, idioma),
              })}
            </b>
          ) : (
            <b className="cp-lima">
              {t("crear.leQuedan", {
                monto: formatearMonto(textoMonto(Math.max(0, p.quedan ?? 0)), idioma),
              })}
            </b>
          )}
        </p>
      ) : null}
      {p.falta ? (
        <>
          <p className="cp-falta">
            {t("crear.noAlcanza")}{" "}
            {t("crear.reserva", {
              monto: formatearMonto(p.falta.reserva, idioma),
            })}
          </p>
          <Link href="/configuracion#saldo" className="cp-agregar-saldo">
            <Icono nombre="mas" />
            {t("crear.agregarSaldo")}
          </Link>
        </>
      ) : null}
    </section>
  );
}

/** Desktop right column: the project card as it fills in, live. */
function VistaViva({
  nombre,
  descripcion,
  portada,
  fecha,
  conTareas,
  p,
}: {
  nombre: string;
  descripcion: string;
  portada: string | null;
  fecha: string | null;
  conTareas: boolean;
  p: Presupuesto;
}) {
  const t = useTexto();
  const tareas = p.tareas === 1 ? t("crear.unaTarea") : t("crear.nTareas", { n: p.tareas });
  return (
    <section className="cp-viva" aria-label={t("crear.vistaPrevia")}>
      <p className="cp-desglose-titulo">{t("crear.vistaPrevia")}</p>
      <div className="cp-viva-tarjeta">
        <div className="cp-viva-portada">
          {portada ? (
            // eslint-disable-next-line @next/next/no-img-element -- local object URL; the form above already names it
            <img src={portada} alt="" />
          ) : (
            <ArtePortada />
          )}
        </div>
        <div className="cp-viva-cuerpo">
          <p className={`cp-viva-titulo${nombre.trim() ? "" : " is-vacio"}`}>{nombre.trim() || t("crear.sinNombre")}</p>
          {descripcion.trim() ? <p className="cp-viva-desc">{descripcion.trim()}</p> : null}
          {fecha || conTareas ? (
            <p className="cp-viva-meta">
              {fecha ? <span>{t("crear.paraElDia", { fecha })}</span> : null}
              {conTareas ? (
                <span>
                  {tareas} · <Monto centavos={p.total} />
                </span>
              ) : null}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function Campo({
  etiqueta,
  htmlFor,
  children,
  ayuda,
  zona,
  invalido = false,
}: {
  etiqueta: string;
  htmlFor?: string;
  children: ReactNode;
  ayuda?: ReactNode;
  invalido?: boolean;
  /** Grid area on desktop (crear.css): type and amount sit side by side. */
  zona?: "titulo" | "tipo" | "monto" | "evidencia" | "quien";
}) {
  return (
    <div className={`cp-campo-grupo${zona ? ` is-${zona}` : ""}${invalido ? " is-invalido" : ""}`}>
      {htmlFor ? (
        <label className="cp-etiqueta" htmlFor={htmlFor}>
          {etiqueta}
        </label>
      ) : (
        <p className="cp-etiqueta">{etiqueta}</p>
      )}
      {children}
      {ayuda}
    </div>
  );
}

function TarjetaTarea({
  fila,
  numero,
  quitable,
  sugeridos,
  error,
  campoError = null,
  onCambio,
  onQuitar,
}: {
  fila: FilaCrear;
  numero: number;
  quitable: boolean;
  sugeridos: Sugerido[];
  error: string | null;
  /** The field the error is about, marked orange. */
  campoError?: CampoTarea | null;
  onCambio: (cambio: Partial<FilaCrear>) => void;
  onQuitar: () => void;
}) {
  const t = useTexto();
  const claro = useClaro();
  const reembolso = fila.tipo === "reembolso";
  const idioma = useIdioma();
  const [editandoMonto, setEditandoMonto] = useState(false);
  const avisoMonto = avisoMontoEntrada(fila.monto);
  const idTitulo = `cp-tarea-${fila.clave}`;
  return (
    <section className={`cp-tarjeta${error ? " is-error" : ""}`} id={`tarea-${fila.clave}`} aria-labelledby={idTitulo} data-tarea={numero}>
      <p className="cp-insignia">
        <span id={idTitulo}>{t("crear.tareaN", { n: numero })}</span>
      </p>
      <Campo etiqueta={t("crear.queHacer")} htmlFor={`titulo-${fila.clave}`} zona="titulo" invalido={campoError === "titulo"}>
        <input
          id={`titulo-${fila.clave}`}
          className="cp-campo cp-input"
          value={fila.titulo}
          maxLength={200}
          placeholder={t("crear.queHacerPh")}
          aria-invalid={campoError === "titulo" ? true : undefined}
          onChange={(evento) => onCambio({ titulo: evento.target.value })}
        />
      </Campo>
      <Campo etiqueta={t("crear.tipo")} zona="tipo">
        <div className="cp-tipos" role="group" aria-label={t("crear.tipo")}>
          {(["trabajo", "reembolso"] as const).map((tipo) => {
            const on = fila.tipo === tipo;
            return (
              <button key={tipo} type="button" className={`cp-tipo${on ? " is-on" : ""}`} aria-pressed={on} onClick={() => onCambio({ tipo })}>
                <span className="cp-tipo-icono">
                  <Icono nombre={tipo} />
                </span>
                <span className="cp-tipo-nombre">{t(tipo === "trabajo" ? "crear.trabajo" : "crear.reembolso")}</span>
                <span className="cp-tipo-detalle">{t(tipo === "trabajo" ? "crear.trabajoDetalle" : "crear.reembolsoDetalle")}</span>
              </button>
            );
          })}
        </div>
      </Campo>
      <Campo
        etiqueta={`${t(reembolso ? "crear.montoReembolso" : "crear.montoTrabajo")} (US$)`}
        htmlFor={`monto-${fila.clave}`}
        zona="monto"
        invalido={campoError === "monto"}
      >
        <div className={`cp-monto${avisoMonto || campoError === "monto" ? " is-error" : ""}`}>
          <span className="cp-moneda" aria-hidden="true">
            US$
          </span>
          <input
            id={`monto-${fila.clave}`}
            inputMode="decimal"
            autoComplete="off"
            placeholder="0.00"
            // While typing, the raw value; otherwise two decimals like the rest of the screen (25 → 25,00).
            value={editandoMonto ? fila.monto : montoEnCampo(fila.monto, idioma)}
            onFocus={() => setEditandoMonto(true)}
            onBlur={() => setEditandoMonto(false)}
            aria-invalid={avisoMonto || campoError === "monto" ? true : undefined}
            aria-describedby={avisoMonto ? `monto-error-${fila.clave}` : undefined}
            onChange={(evento) => onCambio({ monto: escribirMonto(evento.target.value) })}
          />
        </div>
        {avisoMonto ? (
          <p id={`monto-error-${fila.clave}`} role="alert" className="cp-error">
            {t("crear.montoInvalido")}
          </p>
        ) : null}
      </Campo>
      <Campo
        etiqueta={t("crear.evidencia")}
        htmlFor={`condicion-${fila.clave}`}
        zona="evidencia"
        ayuda={
          <p className="cp-ayuda">
            <Icono nombre="chispa" />
            {t("crear.evidenciaAyuda")}
          </p>
        }
      >
        <Area
          id={`condicion-${fila.clave}`}
          valor={fila.condicion}
          max={500}
          className="cp-campo cp-area"
          placeholder={t(reembolso ? "crear.evidenciaReembolsoPh" : "crear.evidenciaTrabajoPh")}
          onCambio={(valor) => onCambio({ condicion: valor })}
        />
      </Campo>
      <Campo etiqueta={t("crear.quien")} htmlFor={`asignado-${fila.clave}`} zona="quien" invalido={campoError === "quien"}>
        <SugeridosElegir id={`asignado-${fila.clave}`} sugeridos={sugeridos} valor={fila.asignado} onCambio={(correo) => onCambio({ asignado: correo })} />
      </Campo>
      {error ? (
        <p role="alert" className="cp-error">
          {claro(error)}
        </p>
      ) : null}
      {quitable ? (
        <button type="button" className="cp-quitar" onClick={onQuitar}>
          {t("crear.quitarTarea")}
        </button>
      ) : null}
    </section>
  );
}

export function CrearProyecto({
  saldo = null,
  sugeridos = [],
  conFecha = false,
}: {
  saldo?: string | null;
  sugeridos?: Sugerido[];
  /** «¿Para cuándo?» Only on when the database has the date column. */
  conFecha?: boolean;
}) {
  const router = useRouter();
  const modoDemo = useModoDemo();
  const t = useTexto();
  const claro = useClaro();
  const idioma = useIdioma();
  const escena = useRef<HTMLDivElement>(null);
  const titulo = useRef<HTMLHeadingElement>(null);
  const archivoRef = useRef<HTMLInputElement>(null);
  const dock = useRef<HTMLElement>(null);
  const [paso, setPaso] = useState<Paso>(1);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [fecha, setFecha] = useState("");
  const [errorFecha, setErrorFecha] = useState<ProblemaFecha | null>(null);
  // Today in the person's own time zone. Read after mount so the server render and the browser agree.
  const [rango, setRango] = useState<{ min: string; max: string } | null>(null);
  useEffect(() => setRango(rangoFecha()), []);
  const [contextoIa, setContextoIa] = useState("");
  const [contextoPorUsuario, setContextoPorUsuario] = useState(false);
  const [portada, setPortada] = useState<File | null>(null);
  const [vistaPortada, setVistaPortada] = useState<string | null>(null);
  const [errorNombre, setErrorNombre] = useState(false);
  const [errorPortadaTexto, setErrorPortadaTexto] = useState<string | null>(null);
  const [filas, setFilas] = useState<FilaCrear[]>(() => [filaVacia("1")]);
  const [errorTarea, setErrorTarea] = useState<{
    clave: string | null;
    texto: string;
    campo: CampoTarea;
  } | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [creadoId, setCreadoId] = useState<string | null>(null);
  const [nuevaClave, setNuevaClave] = useState<string | null>(null);

  const p = calcularPresupuesto(filas, saldo);
  const habilitado = puedeCrear(p, {
    demo: modoDemo,
    enviando,
    creado: creadoId !== null,
  });
  const nombres: Record<Paso, Clave> = {
    1: "crear.paso1",
    2: "crear.paso2",
    3: "crear.paso3",
  };

  useEffect(() => {
    if (!portada) {
      setVistaPortada(null);
      return;
    }
    const url = URL.createObjectURL(portada);
    setVistaPortada(url);
    return () => URL.revokeObjectURL(url);
  }, [portada]);

  // The dock floats over the steps. Its live height pads the scene so the last field scrolls fully above it.
  useLayoutEffect(() => {
    const pie = dock.current;
    const raiz = escena.current;
    if (!pie || !raiz) return;
    const medir = () => raiz.style.setProperty("--cp-dock", `${Math.ceil(pie.getBoundingClientRect().height)}px`);
    medir();
    if (typeof ResizeObserver === "undefined") return;
    const observador = new ResizeObserver(medir);
    observador.observe(pie);
    return () => observador.disconnect();
  }, []);

  // New card: bring it into view and put the cursor in its first field.
  useEffect(() => {
    if (!nuevaClave) return;
    const campo = document.getElementById(`titulo-${nuevaClave}`);
    campo?.scrollIntoView({ block: "center", behavior: "smooth" });
    campo?.focus({ preventScroll: true });
    setNuevaClave(null);
  }, [nuevaClave]);

  /** Changes step. With a field id, lands on that field (an error sent the person back); otherwise at the top. */
  function irA(siguiente: Paso, campo?: string) {
    setPaso(siguiente);
    setAviso(null);
    requestAnimationFrame(() => {
      if (campo) {
        irAlCampo(campo);
        return;
      }
      // Phones scroll inside the stage; desktop scrolls the page inside the app shell.
      escena.current?.scrollTo?.({ top: 0 });
      if (typeof window.scrollTo === "function") window.scrollTo({ top: 0 });
      titulo.current?.focus({ preventScroll: true });
    });
  }

  /** The first task problem, marked on its field. */
  function errorDeTareas(): {
    clave: string | null;
    texto: string;
    campo: CampoTarea;
    id: string | null;
  } | null {
    const problema = revisarTareas(filas);
    if (!problema) return null;
    const campo = campoDeError(problema.error);
    const id = problema.clave ? `${campo === "quien" ? "asignado" : campo}-${problema.clave}` : null;
    return {
      clave: problema.clave,
      texto: t(`crear.${problema.error}` as Clave),
      campo,
      id,
    };
  }

  function cambiarFila(clave: string, cambio: Partial<FilaCrear>) {
    setFilas((actuales) => actuales.map((fila) => (fila.clave === clave ? { ...fila, ...cambio } : fila)));
    if (errorTarea?.clave === clave) setErrorTarea(null);
  }

  function agregarTarea() {
    const nueva = filaVacia();
    setFilas((actuales) => [...actuales, nueva]);
    setNuevaClave(nueva.clave);
  }

  function elegirPortada(lista: FileList | null) {
    const elegido = lista?.[0] ?? null;
    if (!elegido) return;
    const falla = errorPortada(elegido);
    if (falla) {
      if (archivoRef.current) archivoRef.current.value = "";
      setErrorPortadaTexto(t(falla === "type" ? "eventos.coverType" : "eventos.coverSize"));
      return;
    }
    setErrorPortadaTexto(null);
    setPortada(elegido);
  }

  function quitarPortada() {
    if (archivoRef.current) archivoRef.current.value = "";
    setPortada(null);
    setErrorPortadaTexto(null);
  }

  function usarEjemplo() {
    const ejemplo = ejemploCasaAlquiler(idioma);
    if (!nombre.trim()) setNombre(ejemplo.nombre);
    if (!descripcion.trim()) setDescripcion(ejemplo.descripcion);
    setFilas(ejemplo.filas);
    setErrorNombre(false);
    setErrorTarea(null);
    irA(2);
  }

  /** «¿Para cuándo?» from today onward. Returns false and shows the message when the date can't be used. */
  function revisarFecha(): boolean {
    if (!conFecha) return true;
    const problema = problemaFechaLocal(fecha);
    setErrorFecha(problema);
    return problema === null;
  }

  /** Step 1: every problem is marked at once; the screen goes to the first one so the fixed bar never hides it. */
  function siguienteDesde1() {
    const sinNombre = !nombre.trim();
    if (sinNombre) setErrorNombre(true);
    const fechaBien = revisarFecha();
    if (sinNombre) {
      irAlCampo("nombre-proyecto");
      return;
    }
    if (!fechaBien) {
      irAlCampo("fecha-proyecto");
      return;
    }
    irA(2);
  }

  function siguienteDesde2(): boolean {
    const problema = errorDeTareas();
    if (problema) {
      setErrorTarea(problema);
      if (problema.id) {
        const id = problema.id;
        // After React paints the orange field.
        requestAnimationFrame(() => irAlCampo(id));
      }
      return false;
    }
    setErrorTarea(null);
    irA(3);
    return true;
  }

  async function crear() {
    if (!habilitado) return;
    if (!nombre.trim()) {
      irA(1, "nombre-proyecto");
      setErrorNombre(true);
      return;
    }
    if (!revisarFecha()) {
      irA(1, "fecha-proyecto");
      return;
    }
    const problema = errorDeTareas();
    if (problema) {
      irA(2, problema.id ?? undefined);
      setErrorTarea(problema);
      return;
    }
    setEnviando(true);
    setAviso(null);
    try {
      let respuesta: Response;
      try {
        const cuerpo = cuerpoCrear({ nombre, descripcion, contextoIa, filas });
        respuesta = await fetch("/api/proyectos", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(conFecha && fecha ? { ...cuerpo, fecha } : cuerpo),
        });
      } catch {
        setAviso(t("crear.sinConexion"));
        return;
      }
      const cuerpo = (await respuesta.json().catch(() => null)) as {
        aviso?: string;
        proyecto?: { id?: string };
      } | null;
      if (!respuesta.ok || !cuerpo?.proyecto?.id) {
        setAviso(cuerpo?.aviso ? claro(cuerpo.aviso) : t("crear.noSeCreo"));
        return;
      }
      const id = cuerpo.proyecto.id;
      if (portada) {
        const datos = new FormData();
        datos.set("portada", portada);
        const subida = await fetch(`/api/eventos/${encodeURIComponent(id)}/portada`, { method: "POST", body: datos }).catch(() => null);
        if (!subida?.ok) {
          const motivo = subida
            ? (
                (await subida.json().catch(() => null)) as {
                  aviso?: string;
                } | null
              )?.aviso
            : null;
          setCreadoId(id);
          setAviso(motivo ? `${t("eventos.coverNotSaved")} ${claro(motivo)}` : t("eventos.coverNotSaved"));
          return;
        }
      }
      router.push(`/eventos/${id}`);
    } finally {
      setEnviando(false);
    }
  }

  const nombreVisible = nombre.trim() || t("crear.sinNombre");
  const contadas = filas.filter(cuentaFila);
  const personas = new Set(contadas.map((fila) => fila.asignado.trim().toLowerCase()).filter(Boolean)).size;
  const fechaCorta = conFecha && fecha ? fechaGuardadaVisible(fecha, idioma, { day: "numeric", month: "short" }) : null;

  const notaDemo = modoDemo ? (
    <p className="cp-nota-demo" role="note">
      {t("crear.demo")}
    </p>
  ) : null;

  return (
    <div className={`cp is-paso${paso}`} ref={escena} data-paso={paso}>
      <header className="cp-top">
        <span className="cp-top-lado">
          <button
            type="button"
            className="cp-atras"
            aria-label={t("crear.atras")}
            onClick={() => paso > 1 && irA((paso - 1) as Paso)}
            style={paso === 1 ? { visibility: "hidden" } : undefined}
            tabIndex={paso === 1 ? -1 : undefined}
          >
            <Icono nombre="atras" />
          </button>
        </span>
        <Puntos paso={paso} />
        <span className="cp-top-lado is-fin">
          <Link href="/eventos" className="cp-cancelar">
            {t("crear.cancelar")}
          </Link>
        </span>
      </header>

      {/* Desktop: the form on the left, the live preview or summary on the right (sticky). Phones: one column. */}
      <div className="cp-cuerpo">
        <div className="cp-principal">
          <div className="cp-escena" key={paso}>
            <h1 ref={titulo} tabIndex={-1} className={paso === 1 ? "sr-only" : "cp-h"}>
              {paso === 1 ? t("crear.titulo") : paso === 2 ? t("crear.tareas") : t("crear.asiLoVera")}
            </h1>
            <p className="sr-only" aria-live="polite">
              {t("crear.pasos", { n: paso, nombre: t(nombres[paso]) })}
            </p>

            {paso === 1 ? (
              <>
                <section className="cp-portada">
                  {vistaPortada ? (
                    // eslint-disable-next-line @next/next/no-img-element -- local object URL
                    <img
                      src={vistaPortada}
                      alt={t("eventos.coverPreviewAlt", {
                        name: nombreVisible,
                      })}
                    />
                  ) : (
                    <ArtePortada />
                  )}
                  <div className="cp-portada-acciones">
                    <button type="button" className="cp-portada-boton" onClick={() => archivoRef.current?.click()} aria-describedby="portada-ayuda">
                      <span className="cp-portada-mas">
                        <Icono nombre="mas" />
                      </span>
                      {portada ? t("crear.cambiarPortada") : t("crear.agregarPortada")}
                    </button>
                    {portada ? (
                      <button type="button" className="cp-portada-quitar" onClick={quitarPortada}>
                        {t("crear.quitarPortada")}
                      </button>
                    ) : (
                      <span id="portada-ayuda" className="cp-portada-ayuda">
                        {t("crear.portadaAyuda")}
                      </span>
                    )}
                  </div>
                  <input
                    ref={archivoRef}
                    id="portada-proyecto"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    tabIndex={-1}
                    aria-label={t("crear.agregarPortada")}
                    onChange={(evento) => elegirPortada(evento.target.files)}
                  />
                </section>
                <div className="cp-col is-paso1">
                  <div className={`cp-nombre${errorNombre ? " is-error" : ""}`}>
                    <label htmlFor="nombre-proyecto" className="cp-nombre-etiqueta">
                      {t("crear.nombre")}
                    </label>
                    <Area
                      id="nombre-proyecto"
                      valor={nombre}
                      max={MAX_NOMBRE}
                      unaLinea
                      className="cp-nombre-campo"
                      describedBy={errorNombre ? "nombre-error" : undefined}
                      onCambio={(valor) => {
                        setNombre(valor);
                        if (valor.trim()) setErrorNombre(false);
                      }}
                    />
                    <span className="cp-subrayado" aria-hidden="true" />
                  </div>
                  {errorNombre ? (
                    <p id="nombre-error" role="alert" className="cp-error">
                      {t("crear.nombreFalta")}
                    </p>
                  ) : null}
                  {errorPortadaTexto ? (
                    <p role="alert" className="cp-error">
                      {errorPortadaTexto}
                    </p>
                  ) : null}

                  {/* The sample project is for the demo tour only; a real organizer starts from a blank project. */}
                  {modoDemo ? (
                    <>
                      <button type="button" className="cp-ejemplo" onClick={usarEjemplo}>
                        <Icono nombre="chispa" />
                        {t("crear.ejemplo")}
                      </button>
                      <p className="cp-ayuda">{t("crear.ejemploAyuda")}</p>
                    </>
                  ) : null}

                  <div className="cp-seccion is-descripcion">
                    <label className="cp-seccion-titulo" htmlFor="descripcion-proyecto">
                      {t("crear.queSeTrata")}
                    </label>
                    <p id="descripcion-ayuda" className="cp-ayuda">
                      {t("crear.queSeTrataAyuda")}
                    </p>
                    <Area
                      id="descripcion-proyecto"
                      valor={descripcion}
                      max={MAX_DESCRIPCION}
                      className="cp-campo cp-area cp-area-grande"
                      placeholder={t("crear.queSeTrataPh")}
                      describedBy="descripcion-ayuda"
                      onCambio={setDescripcion}
                    />
                    <p className="cp-contador">
                      {descripcion.length}/{MAX_DESCRIPCION}
                    </p>
                  </div>

                  {conFecha ? (
                    <div className="cp-seccion is-fecha">
                      <label className="cp-seccion-titulo" htmlFor="fecha-proyecto">
                        {t("crear.paraCuando")}
                      </label>
                      <p className="cp-ayuda">{t("crear.paraCuandoAyuda")}</p>
                      <input
                        id="fecha-proyecto"
                        type="date"
                        className="cp-campo cp-fecha"
                        value={fecha}
                        min={rango?.min}
                        max={rango?.max}
                        aria-invalid={errorFecha ? true : undefined}
                        aria-describedby={errorFecha ? "fecha-error" : undefined}
                        onChange={(evento) => {
                          const valor = evento.target.value;
                          setFecha(valor);
                          // Clear as soon as the day works; a new error waits for blur so typing a year does not flash it.
                          if (errorFecha && problemaFechaLocal(valor) === null) setErrorFecha(null);
                        }}
                        onBlur={(evento) => setErrorFecha(problemaFechaLocal(evento.target.value))}
                      />
                      {errorFecha ? (
                        <p id="fecha-error" role="alert" className="cp-error">
                          {t(errorFecha === "lejana" ? "crear.fechaLejana" : "crear.fechaPasada")}
                        </p>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="cp-seccion is-contexto">
                    {contextoAbierto(contextoIa, contextoPorUsuario) ? (
                      <>
                        <label className="cp-seccion-titulo" htmlFor="contexto-ia-proyecto">
                          {t("eventos.mileTitle")}
                        </label>
                        <p id="contexto-ia-ayuda" className="cp-ayuda">
                          {t("eventos.aiContextHelp")}
                        </p>
                        <Area
                          id="contexto-ia-proyecto"
                          valor={contextoIa}
                          max={MAX_CONTEXTO}
                          className="cp-campo cp-area"
                          describedBy="contexto-ia-ayuda"
                          onCambio={setContextoIa}
                        />
                        <p className="cp-contador">
                          {contextoIa.length}/{MAX_CONTEXTO}
                        </p>
                      </>
                    ) : (
                      <button type="button" className="cp-enlace" aria-expanded="false" onClick={() => setContextoPorUsuario(true)}>
                        <Icono nombre="candado" />
                        {t("eventos.mileAdd")}
                      </button>
                    )}
                  </div>
                </div>
              </>
            ) : null}

            {paso === 2 ? (
              <div className="cp-col is-paso2">
                <p className="cp-mile">
                  <span className="cp-mile-sello" aria-hidden="true">
                    M
                  </span>
                  {t("crear.mileRevisa")}
                </p>
                <div className="cp-tarjetas">
                  {filas.map((fila, indice) => (
                    <TarjetaTarea
                      key={fila.clave}
                      fila={fila}
                      numero={indice + 1}
                      quitable={filas.length > 1}
                      sugeridos={sugeridos}
                      error={errorTarea && (errorTarea.clave === fila.clave || (errorTarea.clave === null && indice === 0)) ? errorTarea.texto : null}
                      campoError={errorTarea && errorTarea.clave === fila.clave ? errorTarea.campo : null}
                      onCambio={(cambio) => cambiarFila(fila.clave, cambio)}
                      onQuitar={() => setFilas((actuales) => actuales.filter((item) => item.clave !== fila.clave))}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  className="cp-agregar"
                  data-agregar-tarea
                  // Keep the focused field: on phones a blur closes the keyboard and moves the button away from the finger.
                  onPointerDown={(evento) => {
                    if (evento.pointerType !== "mouse" || evento.button === 0) evento.preventDefault();
                  }}
                  onClick={agregarTarea}
                >
                  <Icono nombre="mas" />
                  {t("crear.agregarOtra")}
                </button>
              </div>
            ) : null}

            {paso === 3 ? (
              <div className="cp-col is-paso3">
                <p className="cp-sub">{t("crear.reviseAntes")}</p>
                <article className="cp-vista">
                  <div className="cp-vista-portada">
                    {vistaPortada ? (
                      // eslint-disable-next-line @next/next/no-img-element -- local object URL
                      <img
                        src={vistaPortada}
                        alt={t("eventos.coverPreviewAlt", {
                          name: nombreVisible,
                        })}
                      />
                    ) : (
                      <ArtePortada />
                    )}
                  </div>
                  <div className="cp-vista-cuerpo">
                    <h2 className="cp-vista-titulo">{nombreVisible}</h2>
                    {descripcion.trim() ? <p className="cp-vista-desc">{descripcion.trim()}</p> : null}
                    <ul className={`cp-cifras${fechaCorta ? " is-cuatro" : ""}`}>
                      <li>
                        <b>{contadas.length}</b>
                        <span>{t("crear.cifraTareas")}</span>
                      </li>
                      <li>
                        <b>
                          <Monto centavos={p.total} />
                        </b>
                        <span>{t("crear.total")}</span>
                      </li>
                      {fechaCorta ? (
                        <li>
                          <b>{fechaCorta}</b>
                          <span>{t("crear.paraCuandoCorto")}</span>
                        </li>
                      ) : null}
                      <li>
                        <b>{personas}</b>
                        <span>{t("crear.cifraPersonas")}</span>
                      </li>
                    </ul>
                    <ul className="cp-vista-tareas">
                      {contadas.map((fila) => (
                        <li key={fila.clave}>
                          <span className="cp-vista-tarea-titulo">{fila.titulo.trim() || "—"}</span>
                          <span className="cp-vista-tarea-meta">
                            <span className={`cp-pill${fila.tipo === "reembolso" ? " is-reembolso" : ""}`}>
                              {t(fila.tipo === "reembolso" ? "crear.reembolso" : "crear.trabajo")}
                            </span>
                            <span className="cp-sep" aria-hidden="true" />
                            <span className="cp-vista-monto">
                              {fila.tipo === "reembolso" ? <small>{t("crear.hasta")} </small> : null}
                              {formatearMonto(fila.monto && Number(fila.monto) > 0 ? fila.monto : "0", idioma)}
                            </span>
                          </span>
                        </li>
                      ))}
                    </ul>
                    <div className="cp-candado">
                      <span className="cp-candado-icono">
                        <Icono nombre="candado" />
                      </span>
                      <p>{t("crear.candado")}</p>
                    </div>
                  </div>
                </article>
                <Resumen p={p} clase="is-columna" />
                {notaDemo}
                {aviso ? (
                  <p role="alert" className="cp-error">
                    {aviso}
                  </p>
                ) : null}
                {creadoId ? (
                  <Link href={`/eventos/${creadoId}`} className="cp-enlace">
                    {t("crear.abrir")}
                  </Link>
                ) : null}
              </div>
            ) : null}
          </div>

          {/* Phones: fixed at the bottom. Desktop: the end of the form. */}
          <footer className="cp-dock" ref={dock}>
            <div className={`cp-dock-col${paso === 3 ? ` is-compacta${p.falta ? " is-falta" : ""}` : ""}`}>
              {paso === 2 ? <BarraPresupuesto p={p} /> : null}
              {paso === 3 ? <BarraCompacta p={p} /> : null}
              {paso === 1 ? (
                <button type="button" className="cp-boton" onClick={siguienteDesde1}>
                  {t("crear.siguiente")}
                  <Icono nombre="flecha" />
                </button>
              ) : null}
              {paso === 2 ? (
                <button type="button" className="cp-boton" onClick={() => void siguienteDesde2()}>
                  {t("crear.verComoQueda")}
                  <Icono nombre="flecha" />
                </button>
              ) : null}
              {paso === 3 ? (
                <button
                  type="button"
                  className="cp-boton"
                  disabled={!habilitado}
                  aria-describedby={p.falta ? "aviso-saldo-crear" : undefined}
                  onClick={() => void crear()}
                >
                  {enviando ? t("crear.creando") : t("crear.crear")}
                </button>
              ) : null}
              {paso < 3 ? notaDemo : null}
            </div>
          </footer>
        </div>
        <aside className="cp-lado">
          <div className="cp-lado-pegado">
            {paso < 3 ? <VistaViva nombre={nombre} descripcion={descripcion} portada={vistaPortada} fecha={fechaCorta && !errorFecha && problemaFechaLocal(fecha) === null ? fechaCorta : null} conTareas={paso > 1} p={p} /> : null}
            {paso > 1 ? <Resumen p={p} clase="is-lado" /> : null}
          </div>
        </aside>
      </div>
    </div>
  );
}
