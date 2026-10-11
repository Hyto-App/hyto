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
  puedeCrear,
  revisarTareas,
  type FilaCrear,
  type Presupuesto,
} from "@/lib/admin/crear-flujo";
import { formatearMonto } from "@/lib/integrante/formato";
import type { Sugerido } from "@/lib/perfil/sugeridos";
import { avisoMontoEntrada, escribirMonto } from "@/lib/tareas/monto-entrada";
import { contextoAbierto, errorPortada } from "@/lib/ui/campos-evento";
import type { Clave } from "@/lib/ui/diccionario";

type Paso = 1 | 2 | 3;

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

function Icono({ nombre }: { nombre: "trabajo" | "reembolso" | "mas" | "flecha" | "atras" | "candado" | "foto" | "pdf" | "lista" | "chispa" | "arriba" }) {
  const comun = { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
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
    case "foto":
      return (
        <svg {...comun} width={12} height={12}>
          <rect x="3" y="6" width="18" height="14" rx="3" />
          <circle cx="12" cy="13" r="3.5" />
          <path d="M9 6l1.5-2h3L15 6" />
        </svg>
      );
    case "pdf":
      return (
        <svg {...comun} width={12} height={12}>
          <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
          <path d="M14 3v6h6" />
        </svg>
      );
    case "lista":
      return (
        <svg {...comun} width={12} height={12}>
          <path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" />
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
            <b className="cp-naranja">{t("crear.leFaltan", { monto: formatearMonto(p.falta.falta, idioma) })}</b>
          ) : (
            <b className="cp-lima">{t("crear.leQuedan", { monto: formatearMonto(textoMonto(Math.max(0, p.quedan ?? 0)), idioma) })}</b>
          )}
        </p>
      ) : null}
      {p.falta ? (
        <>
          <p id="aviso-saldo-crear" className={abierto ? "cp-falta" : "sr-only"} role="status">
            {t("crear.noAlcanza")} {t("crear.reserva", { monto: formatearMonto(p.falta.reserva, idioma) })}
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

function Campo({ etiqueta, htmlFor, children, ayuda }: { etiqueta: string; htmlFor?: string; children: ReactNode; ayuda?: ReactNode }) {
  return (
    <div className="cp-campo-grupo">
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
  onCambio,
  onQuitar,
}: {
  fila: FilaCrear;
  numero: number;
  quitable: boolean;
  sugeridos: Sugerido[];
  error: string | null;
  onCambio: (cambio: Partial<FilaCrear>) => void;
  onQuitar: () => void;
}) {
  const t = useTexto();
  const claro = useClaro();
  const reembolso = fila.tipo === "reembolso";
  const avisoMonto = avisoMontoEntrada(fila.monto);
  const idTitulo = `cp-tarea-${fila.clave}`;
  return (
    <section className="cp-tarjeta" id={`tarea-${fila.clave}`} aria-labelledby={idTitulo} data-tarea={numero}>
      <p className="cp-insignia">
        <span id={idTitulo}>{t("crear.tareaN", { n: numero })}</span>
      </p>
      <Campo etiqueta={t("crear.queHacer")} htmlFor={`titulo-${fila.clave}`}>
        <input
          id={`titulo-${fila.clave}`}
          className="cp-campo cp-input"
          value={fila.titulo}
          maxLength={200}
          placeholder={t("crear.queHacerPh")}
          onChange={(evento) => onCambio({ titulo: evento.target.value })}
        />
      </Campo>
      <Campo etiqueta={t("crear.tipo")}>
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
      <Campo etiqueta={`${t(reembolso ? "crear.montoReembolso" : "crear.montoTrabajo")} (US$)`} htmlFor={`monto-${fila.clave}`}>
        <div className={`cp-monto${avisoMonto ? " is-error" : ""}`}>
          <span className="cp-moneda" aria-hidden="true">
            US$
          </span>
          <input
            id={`monto-${fila.clave}`}
            inputMode="decimal"
            autoComplete="off"
            placeholder="0.00"
            value={fila.monto}
            aria-invalid={avisoMonto ? true : undefined}
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
        ayuda={
          <>
            <p className="cp-ayuda">
              <Icono nombre="chispa" />
              {t("crear.evidenciaAyuda")}
            </p>
            <ul className="cp-chips" aria-label={t("crear.formatos")}>
              <li>
                <Icono nombre="foto" />
                {t("crear.formatoFoto")}
              </li>
              <li>
                <Icono nombre="pdf" />
                {t("crear.formatoPdf")}
              </li>
              <li>
                <Icono nombre="lista" />
                {t("crear.formatoLista")}
              </li>
            </ul>
          </>
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
      <Campo etiqueta={t("crear.quien")} htmlFor={`asignado-${fila.clave}`}>
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
  const [paso, setPaso] = useState<Paso>(1);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [fecha, setFecha] = useState("");
  const [contextoIa, setContextoIa] = useState("");
  const [contextoPorUsuario, setContextoPorUsuario] = useState(false);
  const [portada, setPortada] = useState<File | null>(null);
  const [vistaPortada, setVistaPortada] = useState<string | null>(null);
  const [errorNombre, setErrorNombre] = useState(false);
  const [errorPortadaTexto, setErrorPortadaTexto] = useState<string | null>(null);
  const [filas, setFilas] = useState<FilaCrear[]>(() => [filaVacia("1")]);
  const [errorTarea, setErrorTarea] = useState<{ clave: string | null; texto: string } | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [creadoId, setCreadoId] = useState<string | null>(null);
  const [nuevaClave, setNuevaClave] = useState<string | null>(null);

  const p = calcularPresupuesto(filas, saldo);
  const habilitado = puedeCrear(p, { demo: modoDemo, enviando, creado: creadoId !== null });
  const nombres: Record<Paso, Clave> = { 1: "crear.paso1", 2: "crear.paso2", 3: "crear.paso3" };

  useEffect(() => {
    if (!portada) {
      setVistaPortada(null);
      return;
    }
    const url = URL.createObjectURL(portada);
    setVistaPortada(url);
    return () => URL.revokeObjectURL(url);
  }, [portada]);

  // New card: bring it into view and put the cursor in its first field.
  useEffect(() => {
    if (!nuevaClave) return;
    const campo = document.getElementById(`titulo-${nuevaClave}`);
    campo?.scrollIntoView({ block: "center", behavior: "smooth" });
    campo?.focus({ preventScroll: true });
    setNuevaClave(null);
  }, [nuevaClave]);

  function irA(siguiente: Paso) {
    setPaso(siguiente);
    setAviso(null);
    requestAnimationFrame(() => {
      escena.current?.scrollTo({ top: 0 });
      titulo.current?.focus({ preventScroll: true });
    });
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

  function siguienteDesde1() {
    if (!nombre.trim()) {
      setErrorNombre(true);
      document.getElementById("nombre-proyecto")?.focus();
      return;
    }
    irA(2);
  }

  function siguienteDesde2(): boolean {
    const problema = revisarTareas(filas);
    if (problema) {
      setErrorTarea({ clave: problema.clave, texto: t(`crear.${problema.error}` as Clave) });
      if (problema.clave) document.getElementById(`titulo-${problema.clave}`)?.scrollIntoView({ block: "center" });
      return false;
    }
    setErrorTarea(null);
    irA(3);
    return true;
  }

  async function crear() {
    if (!habilitado) return;
    if (!nombre.trim()) {
      irA(1);
      setErrorNombre(true);
      return;
    }
    const problema = revisarTareas(filas);
    if (problema) {
      irA(2);
      setErrorTarea({ clave: problema.clave, texto: t(`crear.${problema.error}` as Clave) });
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
      const cuerpo = (await respuesta.json().catch(() => null)) as { aviso?: string; proyecto?: { id?: string } } | null;
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
          const motivo = subida ? ((await subida.json().catch(() => null)) as { aviso?: string } | null)?.aviso : null;
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
  const fechaVisible =
    conFecha && fecha
      ? new Intl.DateTimeFormat(idioma === "es" ? "es-CR" : "en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${fecha}T00:00:00Z`))
      : null;
  const fechaCorta =
    conFecha && fecha ? new Intl.DateTimeFormat(idioma === "es" ? "es-CR" : "en-US", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${fecha}T00:00:00Z`)) : null;

  const notaDemo = modoDemo ? (
    <p className="cp-nota-demo" role="note">
      {t("crear.demo")}
    </p>
  ) : null;

  return (
    <div className={`cp${paso === 1 ? " is-portada" : ""}`} ref={escena} data-paso={paso}>
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
                <img src={vistaPortada} alt={t("eventos.coverPreviewAlt", { name: nombreVisible })} />
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
            <div className="cp-col">
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

              <button type="button" className="cp-ejemplo" onClick={usarEjemplo}>
                <Icono nombre="chispa" />
                {t("crear.ejemplo")}
              </button>
              <p className="cp-ayuda">{t("crear.ejemploAyuda")}</p>

              <div className="cp-seccion">
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
                <div className="cp-seccion">
                  <label className="cp-seccion-titulo" htmlFor="fecha-proyecto">
                    {t("crear.paraCuando")}
                  </label>
                  <p className="cp-ayuda">{t("crear.paraCuandoAyuda")}</p>
                  <input id="fecha-proyecto" type="date" className="cp-campo cp-fecha" value={fecha} onChange={(evento) => setFecha(evento.target.value)} />
                </div>
              ) : null}

              <div className="cp-seccion">
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
          <div className="cp-col">
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
          <div className="cp-col">
            <p className="cp-sub">{t("crear.reviseAntes")}</p>
            <article className="cp-vista">
              <div className="cp-vista-portada">
                {vistaPortada ? (
                  // eslint-disable-next-line @next/next/no-img-element -- local object URL
                  <img src={vistaPortada} alt={t("eventos.coverPreviewAlt", { name: nombreVisible })} />
                ) : (
                  <ArtePortada />
                )}
              </div>
              <div className="cp-vista-cuerpo">
                <h2 className="cp-vista-titulo">{nombreVisible}</h2>
                {descripcion.trim() ? <p className="cp-vista-desc">{descripcion.trim()}</p> : null}
                {fechaVisible ? <p className="cp-vista-desc">{fechaVisible}</p> : null}
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
                        <span className={`cp-pill${fila.tipo === "reembolso" ? " is-reembolso" : ""}`}>{t(fila.tipo === "reembolso" ? "crear.reembolso" : "crear.trabajo")}</span>
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
            <section className="cp-desglose-tarjeta" aria-label={t("crear.desglose")}>
              <p className="cp-desglose-titulo">{t("crear.desglose")}</p>
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
            </section>
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

      <footer className="cp-dock">
        <div className="cp-dock-col">
          {paso > 1 ? <BarraPresupuesto p={p} /> : null}
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
          {notaDemo}
        </div>
      </footer>
    </div>
  );
}
