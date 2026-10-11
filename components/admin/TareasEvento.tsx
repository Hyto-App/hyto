"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { FichaVoluntario } from "@/components/perfil/Ficha";
import { SugeridosAsignar } from "@/components/perfil/Sugeridos";
import { Icono } from "@/components/admin/IconosProyecto";
import { campoDeError, TarjetaTarea, type CampoTarea } from "@/components/admin/CrearProyecto";
import { PersonaProyecto, useNombrePersona } from "@/components/admin/PersonaProyecto";
import { esAvisoDispositivo } from "@/components/sesion/AvisoFirma";
import { ClaveNavegador, sinClave, useFirmaNavegador, type RevisarFirma } from "@/components/sesion/ClaveNavegador";
import { useModoDemo } from "@/components/sesion/InsigniaDemo";
import type { Sugerido } from "@/lib/perfil/sugeridos";
import { useClaro, useIdioma, useTexto } from "@/components/ui/Idioma";
import type { FichaVoluntario as Ficha } from "@/lib/perfil/reglas";
import {
  empezarFirma,
  estaBloqueada,
  iniciarLote,
  loteTerminado,
  progresoLote,
  reintentarTarea,
  resumenLote,
  siguientePaso,
  sinBloquear,
  terminarPaso,
  type EstadoLote,
  type FilaLote,
} from "@/lib/admin/bloqueo-lote";
import { accionDemo, leerFondeo } from "@/lib/admin/remoto";
import { detalleMontoTarea, formatearMonto, textosSaldo } from "@/lib/integrante/formato";
import { montoBloqueable } from "@/lib/tareas/monto-bloqueable";
import { faltaParaBloquear } from "@/lib/escrow/saldo";
import { AVISO_FIRMA, AVISO_PASSKEY, AVISO_SIN_CUENTA_FIRMA, ErrorFirmaCliente, firmarPasos, mensajeFirmaVisible } from "@/lib/escrow/firmarCliente";
import { avisoMontoEntrada, escribirMonto } from "@/lib/tareas/monto-entrada";
import { mensajeClaro } from "@/lib/ui/claro";
import { esContratoDemo } from "@/lib/sesion/demo";
import { estadoConFoto, etiquetaEstado, etiquetaTipo, textoVisible } from "@/lib/ui/etiquetas";
import type { DificultadTarea, PrioridadTarea, TipoTarea } from "@/lib/integrante/tipos";
import { cuerpoCrear, filaVacia, revisarTareas, type FilaCrear } from "@/lib/admin/crear-flujo";
import { normalizarMonto } from "@/lib/admin/vista";
import type { Clave } from "@/lib/ui/diccionario";

export type FilaTareaEvento = {
  id: string;
  titulo: string;
  tipo: TipoTarea;
  monto: string;
  tope: string | null;
  condicion: string;
  estado: string;
  miembroId: string;
  prioridad: PrioridadTarea;
  dificultad: DificultadTarea | null;
  bloqueo: string | null;
  tieneFoto: boolean;
  montoConfirmado?: string | null;
  montoRevisado?: string | null;
  /** The assigned person can be paid (a payout account on the task or on their own sign-in). */
  cuentaCobro?: boolean;
  /** Trustless Work contract already on the task. */
  contrato?: string | null;
  /** What a lock would set aside right now; null for a reimbursement with no confirmed amount. */
  montoLote?: string | null;
  /** The cap «Presupuesto sin bloquear» counts while the amount is unknown. */
  topeLote?: string | null;
};

type Persona = { usuarioId: string; email: string; nombre?: string; ficha?: Ficha; cuentaCobro?: boolean };

type Borrador = {
  titulo: string;
  condicion: string;
  monto: string;
  tope: string;
  miembroId: string;
};

function pausaDemo(): number {
  return typeof process !== "undefined" && process.env.NODE_TEST_CONTEXT ? 0 : 700;
}

function faltaDeBorrador(tarea: FilaTareaEvento, borrador: Borrador, saldo: string | null) {
  const subida = montoBloqueable(tarea, {
    monto: borrador.monto,
    tope: tarea.tipo === "reembolso" ? borrador.tope : undefined,
  });
  if (!subida) return null;
  return faltaParaBloquear(saldo, subida);
}

function FichaAsignada({ miembros, miembroId }: { miembros: Persona[]; miembroId: string }) {
  const ficha = miembros.find((persona) => persona.usuarioId === miembroId)?.ficha;
  if (!ficha) return null;
  return <FichaVoluntario ficha={ficha} />;
}

export function TareasEvento({
  tareas,
  miembros,
  saldo = null,
  wallet = null,
  proyectoId,
  eventoId,
  sugeridos,
  firmar,
  revisarFirma,
}: {
  tareas: FilaTareaEvento[];
  miembros: Persona[];
  saldo?: string | null;
  /** The organizer's session account, which signs each lock. */
  wallet?: string | null;
  /** With HYTO_PERFIL_PUBLICO on: the suggested-people picker replaces the plain list. */
  proyectoId?: string;
  sugeridos?: Sugerido[];
  /** The event the list belongs to. With it, «+ Add task» closes the list. */
  eventoId?: string;
  /** Tests sign without Cavos. */
  firmar?: (unsignedXdr: string) => Promise<string>;
  revisarFirma?: RevisarFirma;
}) {
  const t = useTexto();
  const claro = useClaro();
  const idioma = useIdioma();
  const demo = useModoDemo();
  const nombreDe = useNombrePersona();
  const [filas, setFilas] = useState(tareas);
  const [aviso, setAviso] = useState<string | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [borrador, setBorrador] = useState<Borrador | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [eligiendoId, setEligiendoId] = useState<string | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [fondeos, setFondeos] = useState<Record<string, boolean | null>>({});
  const [lote, setLote] = useState<EstadoLote | null>(null);
  const [avisosFila, setAvisosFila] = useState<Record<string, string>>({});
  const [nueva, setNueva] = useState<FilaCrear | null>(null);
  const [errorNueva, setErrorNueva] = useState<{ texto: string; campo: CampoTarea | null } | null>(null);
  const [agregando, setAgregando] = useState(false);
  const loteRef = useRef(lote);
  loteRef.current = lote;
  const montoServidor = useRef(new Map<string, number>());
  const conSugeridos = Boolean(sugeridos && proyectoId);
  const firmaNavegador = useFirmaNavegador(!demo && Boolean(wallet) && !firmar, revisarFirma);
  const faltaClave = sinClave(firmaNavegador);

  // A contract with no known balance: read it once, so a deployed-but-unfunded task offers only the fund signature.
  useEffect(() => {
    let viva = true;
    for (const fila of tareas) {
      const contrato = fila.contrato ?? null;
      if (!contrato || fila.estado === "pagado" || esContratoDemo(contrato)) continue;
      void leerFondeo(contrato).then((valor) => {
        if (viva) setFondeos((actual) => (fila.id in actual ? actual : { ...actual, [fila.id]: valor }));
      });
    }
    return () => {
      viva = false;
    };
  }, [tareas]);

  // A new card: put the cursor in its first field, as in the wizard.
  const claveNueva = nueva?.clave ?? null;
  useEffect(() => {
    if (!claveNueva) return;
    const campo = document.getElementById(`titulo-${claveNueva}`);
    campo?.scrollIntoView?.({ block: "center" });
    campo?.focus({ preventScroll: true });
  }, [claveNueva]);

  // Close the ⋯ menu on Escape or a click outside it.
  useEffect(() => {
    if (!menuId) return;
    function cerrar(evento: Event) {
      if (evento instanceof KeyboardEvent && evento.key !== "Escape") return;
      if (evento.type === "pointerdown" && evento.target instanceof Element && evento.target.closest(`[data-menu="${menuId}"]`)) return;
      setMenuId(null);
    }
    document.addEventListener("keydown", cerrar);
    document.addEventListener("pointerdown", cerrar);
    return () => {
      document.removeEventListener("keydown", cerrar);
      document.removeEventListener("pointerdown", cerrar);
    };
  }, [menuId]);

  const filasLote: FilaLote[] = filas.map((fila) => {
    const contrato = fila.contrato ?? null;
    return {
      id: fila.id,
      estado: fila.estado,
      miembroId: fila.miembroId,
      cuentaCobro: Boolean(fila.cuentaCobro),
      contrato,
      fondeado: contrato ? (esContratoDemo(contrato) ? true : (fondeos[fila.id] ?? null)) : null,
      montoLote: fila.montoLote === undefined ? fila.monto : fila.montoLote,
      topeLote: fila.topeLote ?? null,
    };
  });
  const resumen = resumenLote(filasLote, demo);
  const enCurso = lote !== null && !loteTerminado(lote);
  const firmando = Boolean(lote?.firmando);
  const progreso = progresoLote(lote);
  const actualId = enCurso && lote ? lote.cola[lote.indice]?.id : null;
  const montoListas = resumen.listas
    .map((id) => filasLote.find((fila) => fila.id === id)?.montoLote)
    .reduce((total, monto) => total + (Number(monto) || 0), 0);
  const faltaSaldo = !demo && resumen.k > 0 ? faltaParaBloquear(saldo, montoListas.toFixed(2)) : null;

  async function asignar(tareaId: string, usuarioId: string) {
    setAviso(null);
    const respuesta = await fetch(`/api/tareas/${encodeURIComponent(tareaId)}/asignar`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ usuarioId }),
    });
    if (!respuesta.ok) {
      const cuerpo = (await respuesta.json().catch(() => null)) as { aviso?: string } | null;
      setAviso(cuerpo?.aviso ?? "Could not assign that task.");
      return false;
    }
    const persona = miembros.find((item) => item.usuarioId === usuarioId);
    setFilas((actuales) =>
      actuales.map((fila) =>
        fila.id === tareaId
          ? // A new person brings their own payout account; the lock reads it again from the server.
            { ...fila, miembroId: usuarioId, cuentaCobro: usuarioId ? (fila.miembroId === usuarioId ? fila.cuentaCobro : Boolean(persona?.cuentaCobro)) : false }
          : fila,
      ),
    );
    return true;
  }

  function abrir(tarea: FilaTareaEvento) {
    setAviso(null);
    setMenuId(null);
    setEligiendoId(null);
    setEditandoId(tarea.id);
    setBorrador({
      titulo: tarea.titulo,
      condicion: tarea.condicion,
      monto: tarea.monto,
      tope: tarea.tope ?? tarea.monto,
      miembroId: tarea.miembroId,
    });
  }

  async function guardar(tarea: FilaTareaEvento) {
    if (!borrador || guardando) return;
    const montoMal = avisoMontoEntrada(borrador.monto) ?? (tarea.tipo === "reembolso" ? avisoMontoEntrada(borrador.tope) : null);
    if (montoMal) {
      setAviso(montoMal);
      return;
    }
    const falta = faltaDeBorrador(tarea, borrador, saldo);
    if (falta) {
      setAviso(t("errores.saldoNoCubre", textosSaldo(falta, idioma)));
      return;
    }
    setAviso(null);
    setGuardando(true);
    const cuerpo: Record<string, string> = {
      titulo: borrador.titulo,
      condicion: borrador.condicion,
      monto: borrador.monto,
      miembroId: borrador.miembroId,
    };
    if (tarea.tipo === "reembolso") cuerpo.tope = borrador.tope;
    const respuesta = await fetch(`/api/tareas/${encodeURIComponent(tarea.id)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(cuerpo),
    });
    const json = (await respuesta.json().catch(() => null)) as {
      aviso?: string;
      tarea?: { titulo: string; condicion: string; monto: string; tope: string | null; miembroId: string };
    } | null;
    setGuardando(false);
    if (!respuesta.ok || !json?.tarea) {
      setAviso(json?.aviso ?? "Could not save that task.");
      if (respuesta.status === 409 && json?.aviso) {
        setFilas((actuales) => actuales.map((fila) => (fila.id === tarea.id ? { ...fila, bloqueo: json.aviso ?? fila.bloqueo } : fila)));
        setEditandoId(null);
        setBorrador(null);
      }
      return;
    }
    setFilas((actuales) =>
      actuales.map((fila) =>
        fila.id === tarea.id
          ? {
              ...fila,
              titulo: json.tarea!.titulo,
              condicion: json.tarea!.condicion,
              monto: json.tarea!.monto,
              tope: json.tarea!.tope,
              miembroId: json.tarea!.miembroId,
              cuentaCobro:
                json.tarea!.miembroId === fila.miembroId
                  ? fila.cuentaCobro
                  : Boolean(miembros.find((item) => item.usuarioId === json.tarea!.miembroId)?.cuentaCobro),
              ...(fila.tipo === "reembolso" ? { topeLote: json.tarea!.tope ?? json.tarea!.monto } : { montoLote: json.tarea!.monto }),
            }
          : fila,
      ),
    );
    setEditandoId(null);
    setBorrador(null);
  }

  function abrirNueva() {
    setAviso(null);
    setMenuId(null);
    setEligiendoId(null);
    setEditandoId(null);
    setBorrador(null);
    setErrorNueva(null);
    setNueva(filaVacia());
  }

  /** Same checks as the wizard's step 2, then one task on this event. The list and its total take the new row. */
  async function agregarNueva() {
    if (!nueva || !eventoId || agregando) return;
    const problema = revisarTareas([nueva]);
    if (problema) {
      setErrorNueva({ texto: t(`crear.${problema.error}` as Clave), campo: campoDeError(problema.error) });
      return;
    }
    const falta = demo ? null : faltaParaBloquear(saldo, normalizarMonto(nueva.monto)!);
    if (falta) {
      setErrorNueva({ texto: t("errores.saldoNoCubre", textosSaldo(falta, idioma)), campo: "monto" });
      return;
    }
    setErrorNueva(null);
    setAgregando(true);
    let respuesta: Response | null = null;
    let json: { aviso?: string; tarea?: Omit<FilaTareaEvento, "bloqueo" | "tieneFoto"> } | null = null;
    try {
      respuesta = await fetch(`/api/eventos/${encodeURIComponent(eventoId)}/tareas`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(cuerpoCrear({ nombre: "", descripcion: "", contextoIa: "", filas: [nueva] }).tareas[0]),
      });
      json = (await respuesta.json().catch(() => null)) as typeof json;
    } catch {
      respuesta = null;
    }
    setAgregando(false);
    const tarea = json?.tarea;
    if (!respuesta?.ok || !tarea) {
      setErrorNueva({ texto: json?.aviso ?? "Could not add the task.", campo: null });
      return;
    }
    setFilas((actuales) => [
      ...actuales,
      {
        id: tarea.id,
        titulo: tarea.titulo,
        tipo: tarea.tipo,
        monto: tarea.monto,
        tope: tarea.tope,
        condicion: tarea.condicion,
        estado: tarea.estado,
        miembroId: tarea.miembroId,
        prioridad: tarea.prioridad,
        dificultad: tarea.dificultad,
        bloqueo: null,
        tieneFoto: false,
        cuentaCobro: Boolean(tarea.miembroId && miembros.find((item) => item.usuarioId === tarea.miembroId)?.cuentaCobro),
        contrato: null,
        // Same as the page: a reimbursement locks its confirmed amount, so only the cap counts until then.
        montoLote: tarea.tipo === "reembolso" ? null : tarea.monto,
        topeLote: tarea.tipo === "reembolso" ? (tarea.tope ?? tarea.monto) : tarea.monto,
      },
    ]);
    setNueva(null);
  }

  /** One Cavos signature of the existing per-task lock: deploy, or fund an existing contract. */
  async function firmarPaso(paso: NonNullable<ReturnType<typeof siguientePaso>>): Promise<string | null> {
    const fila = filasLote.find((item) => item.id === paso.tareaId);
    const monto = montoServidor.current.get(paso.tareaId) ?? (fila?.montoLote ? Number(fila.montoLote) : undefined);
    const pago = await firmarPasos([paso.accion], paso.tareaId, {
      ...(firmar ? { firmar } : {}),
      extra: {
        firmante: wallet ?? undefined,
        ...(paso.contrato ? { contrato: paso.contrato } : {}),
        ...(typeof monto === "number" && Number.isFinite(monto) ? { monto } : {}),
      },
    });
    if (paso.accion === "desplegar" && typeof pago.monto === "number") montoServidor.current.set(paso.tareaId, pago.monto);
    return pago.contrato;
  }

  function marcarFila(tareaId: string, cambio: { contrato?: string | null; fondeado?: boolean | null }) {
    if (cambio.contrato) setFilas((actuales) => actuales.map((fila) => (fila.id === tareaId ? { ...fila, contrato: cambio.contrato } : fila)));
    if (cambio.fondeado !== undefined) setFondeos((actual) => ({ ...actual, [tareaId]: cambio.fondeado ?? null }));
  }

  /** Every click signs exactly one step, so each Cavos window opens from that click. */
  async function firmarSiguiente(base: EstadoLote | null = loteRef.current) {
    if (firmando) return;
    setAviso(null);
    if (!demo && !wallet) {
      setAviso(AVISO_SIN_CUENTA_FIRMA);
      return;
    }
    const estado = base && !loteTerminado(base) ? base : iniciarLote(filasLote, resumen.listas);
    const paso = siguientePaso(estado);
    if (!paso) return;
    if (demo) {
      await firmarDemo(estado);
      return;
    }
    setLote(empezarFirma(estado));
    setAvisosFila((actual) => {
      const resto = { ...actual };
      delete resto[paso.tareaId];
      return resto;
    });
    try {
      const contrato = await firmarPaso(paso);
      if (paso.accion === "desplegar") marcarFila(paso.tareaId, { contrato, fondeado: false });
      else marcarFila(paso.tareaId, { contrato, fondeado: true });
      setLote((actual) => (actual ? terminarPaso(actual, { ok: true, contrato }) : actual));
    } catch (error) {
      const contrato = error instanceof ErrorFirmaCliente ? error.contrato : null;
      if (contrato) marcarFila(paso.tareaId, { contrato, fondeado: false });
      const mensaje = error instanceof ErrorFirmaCliente ? error.message : AVISO_FIRMA;
      if (esAvisoDispositivo(mensaje) || mensaje === AVISO_PASSKEY) firmaNavegador.marcarSinClave(mensaje === AVISO_PASSKEY);
      setAvisosFila((actual) => ({ ...actual, [paso.tareaId]: mensajeClaro(mensajeFirmaVisible(mensaje)) }));
      setLote((actual) => (actual ? terminarPaso(actual, { ok: false, contrato }) : actual));
    }
  }

  /**
   * Demo sessions have no wallet and no Cavos window, but the run reads the same: one click per signature,
   * «Siguiente firma» between them. The task's last signature sets the practice lock.
   */
  async function firmarDemo(estado: EstadoLote) {
    const tarea = estado.cola[estado.indice]!;
    const ultimo = estado.paso === tarea.pasos.length - 1;
    setLote(empezarFirma(estado));
    await new Promise((listo) => setTimeout(listo, pausaDemo()));
    if (!ultimo) {
      setLote((actual) => (actual ? terminarPaso(actual, { ok: true, contrato: null }) : actual));
      return;
    }
    const resultado = await accionDemo(tarea.id, "bloquear");
    if (resultado.ok) {
      marcarFila(tarea.id, { contrato: resultado.contrato, fondeado: true });
      setLote((actual) => (actual ? terminarPaso(actual, { ok: true, contrato: resultado.contrato }) : actual));
    } else {
      setAvisosFila((actual) => ({ ...actual, [tarea.id]: resultado.aviso }));
      // The practice lock is one call: a failure starts that task over.
      setLote((actual) => (actual ? terminarPaso({ ...actual, paso: 0 }, { ok: false, contrato: null }) : actual));
    }
  }

  function reintentar(tareaId: string) {
    const actual = loteRef.current;
    if (!actual || firmando) return;
    const siguiente = reintentarTarea(actual, tareaId);
    setLote(siguiente);
    // Signs right away only when that task is next; otherwise it waits its turn behind «Siguiente firma».
    if (siguientePaso(siguiente)?.tareaId === tareaId) void firmarSiguiente(siguiente);
  }

  // Mock B (Pao): the list's last row. Neutral dashed, like the wizard's; the screen's one lime action is the lock.
  const filaAgregar = eventoId ? (
    <li className="pj-tnueva" data-agregar-tarea>
      {nueva ? (
        <form
          className="cp-suelta"
          onSubmit={(evento) => {
            evento.preventDefault();
            void agregarNueva();
          }}
        >
          <TarjetaTarea
            fila={nueva}
            numero={filas.length + 1}
            quitable={false}
            sugeridos={sugeridos ?? []}
            error={errorNueva?.texto ?? null}
            campoError={errorNueva?.campo ?? null}
            onCambio={(cambio) => {
              setNueva((actual) => (actual ? { ...actual, ...cambio } : actual));
              setErrorNueva(null);
            }}
            onQuitar={() => setNueva(null)}
          />
          <div className="hyto-acciones-fila mt-3 flex flex-wrap justify-center gap-2">
            <button type="submit" className="hyto-btn-line is-inline px-5" disabled={agregando} aria-busy={agregando || undefined}>
              {t("eventos.addTask")}
            </button>
            <button type="button" className="hyto-btn-line is-inline px-5" onClick={() => setNueva(null)}>
              {t("eventos.cancel")}
            </button>
          </div>
        </form>
      ) : (
        <button type="button" className="cp-agregar pj-agregar" onClick={abrirNueva}>
          <Icono nombre="plus" />
          {t("eventos.addTask")}
        </button>
      )}
    </li>
  ) : null;

  if (filas.length === 0) {
    return (
      <main className="hyto-page">
        <p className="text-lg font-semibold">{t("eventos.noTasks")}</p>
        {filaAgregar ? <ul className="pj-tlista">{filaAgregar}</ul> : null}
      </main>
    );
  }

  const total = filas.reduce((suma, fila) => suma + (Number(fila.tipo === "reembolso" ? (fila.tope ?? fila.monto) : fila.monto) || 0), 0);
  // Mid-run the button stays lime: «Siguiente firma» between signatures, busy (not gray) while one is open.
  const botonDeshabilitado = !enCurso && (faltaClave || resumen.k === 0 || Boolean(faltaSaldo));
  const botonOcupado = firmando || (enCurso && faltaClave);
  const rotuloBoton = enCurso
    ? t("proyecto.siguienteFirma")
    : t(resumen.n === 1 ? "proyecto.bloquearLoteUna" : "proyecto.bloquearLote", { k: resumen.k, n: resumen.n });

  return (
    <main className="hyto-page">
      {resumen.n > 0 || enCurso ? (
        <section className="pj-card pj-lote" aria-labelledby="lote-titulo">
          <span className="pj-lote-ic" aria-hidden="true">
            <Icono nombre="lock" />
          </span>
          <div className="pj-lote-txt">
            <p id="lote-titulo" className="pj-lote-t">
              {enCurso ? t("proyecto.bloqueandoTitulo") : (() => {
                const monto = formatearMonto(resumen.monto, idioma);
                const frase = t(resumen.n === 1 ? "proyecto.sinBloquearUna" : "proyecto.sinBloquear", { monto: "\u0000", n: resumen.n });
                const [antes, despues] = frase.split("\u0000");
                return (
                  <>
                    {antes}
                    <b>{monto}</b>
                    {despues}
                  </>
                );
              })()}
            </p>
            {progreso ? (
              <>
                <div
                  className="pj-lote-barra"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={progreso.pct}
                  aria-labelledby="lote-titulo"
                >
                  <i style={{ width: `${Math.max(progreso.pct, 4)}%` }} />
                </div>
                <p className="pj-lote-prog" role="status" aria-live="polite">
                  {t("proyecto.progresoLote", { i: progreso.i, n: progreso.n, f: progreso.f, g: progreso.g })}
                </p>
              </>
            ) : (
              <p className="pj-lote-s">
                <Icono nombre="info" tam={14} />
                {t("proyecto.notaStellar")}
              </p>
            )}
            {faltaSaldo && !enCurso ? (
              <p id="lote-saldo" role="alert" className="mt-2 text-sm text-[var(--suave)]">
                {t("errores.saldoNoCubre", textosSaldo(faltaSaldo, idioma))}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            className="hyto-btn"
            disabled={botonDeshabilitado}
            aria-disabled={botonOcupado || undefined}
            aria-busy={firmando}
            aria-describedby={[faltaSaldo && !enCurso ? "lote-saldo" : "", faltaClave ? "clave-lote" : ""].filter(Boolean).join(" ") || undefined}
            onClick={() => {
              if (botonOcupado) return;
              void firmarSiguiente();
            }}
          >
            <Icono nombre="lock" />
            {rotuloBoton}
          </button>
        </section>
      ) : null}
      {!demo && resumen.k > 0 ? <ClaveNavegador id="clave-lote" className="mt-3" firma={firmaNavegador} contexto="bloqueo" /> : null}

      <div className="pj-thead" aria-hidden="true">
        <span />
        <span>{t("proyecto.colTarea")}</span>
        <span>{t("proyecto.colTipo")}</span>
        <span>{t("proyecto.colMonto")}</span>
        <span>{t("proyecto.colPersona")}</span>
        <span>{t("proyecto.colEstado")}</span>
        <span />
      </div>
      <p className="pj-mlist-h">
        <span>{t("proyecto.nTareas", { n: filas.length })}</span>
        <span>{t("proyecto.totalMonto", { monto: formatearMonto(total.toFixed(2), idioma) })}</span>
      </p>

      <ul className="pj-tlista">
        {filas.map((tarea) => {
          const filaLote = filasLote.find((item) => item.id === tarea.id)!;
          const editando = editandoId === tarea.id && borrador && !tarea.bloqueo;
          const faltaFila = editando && borrador ? faltaDeBorrador(tarea, borrador, saldo) : null;
          const fallida = Boolean(lote?.fallidas[tarea.id]);
          const pendienteBloqueo = sinBloquear(filaLote);
          const sinPersona = pendienteBloqueo && !tarea.miembroId.trim();
          const sinCuenta = !demo && pendienteBloqueo && !sinPersona && !tarea.cuentaCobro;
          const bloqueada = estaBloqueada(filaLote);
          const tono = fallida ? "naranja" : actualId === tarea.id ? "activa" : sinPersona ? "gris" : undefined;
          const persona = miembros.find((item) => item.usuarioId === tarea.miembroId);
          const nombre = persona?.nombre ?? sugeridos?.find((item) => item.usuarioId === tarea.miembroId)?.nombre ?? null;
          const hasta = tarea.tipo === "reembolso" && !tarea.montoConfirmado;
          const cifra = tarea.tipo === "reembolso" ? (tarea.montoConfirmado ?? tarea.tope ?? tarea.monto) : tarea.monto;
          const detalle = detalleMontoTarea(tarea, idioma);
          const estadoVisible = estadoConFoto(tarea.estado, tarea.tieneFoto);
          const nota = fallida ? (
            <button type="button" className="pj-reintentar" disabled={firmando} onClick={() => reintentar(tarea.id)}>
              <Icono nombre="refresh" tam={14} />
              {t("proyecto.reintentar")}
            </button>
          ) : sinPersona ? (
            <span className="pj-tnota">
              <Icono nombre="alert" tam={14} />
              {t("proyecto.asigneAlguien")}
            </span>
          ) : sinCuenta ? (
            <span className="pj-tnota">
              <Icono nombre="alert" tam={14} />
              {t("proyecto.sinCuentaCobro")}
            </span>
          ) : (
            <span className="pj-tnota">
              <Icono nombre={tarea.tieneFoto ? "checkC" : "cal"} tam={14} />
              {t(tarea.tieneFoto ? "proyecto.yaEvidencia" : "proyecto.sinEvidencia")}
            </span>
          );
          const montoNodo = (
            <span className="pj-amt">
              {hasta ? <small>{t("proyecto.hasta")} </small> : null}
              {formatearMonto(cifra, idioma)}
              {bloqueada ? (
                <span className="pj-candado" role="img" aria-label={t("proyecto.bloqueada")} title={t("proyecto.bloqueada")}>
                  <Icono nombre="lock" tam={14} />
                </span>
              ) : null}
            </span>
          );
          const tipoNodo = (
            <span className="pj-tipo" data-tipo={tarea.tipo}>
              {etiquetaTipo(tarea.tipo, idioma)}
            </span>
          );
          const estadoNodo = (
            <span className="pj-st" data-estado={estadoVisible}>
              {estadoVisible === "en revisión" ? t("proyecto.porRevisar") : etiquetaEstado(estadoVisible, idioma)}
            </span>
          );
          const personaNodo = <PersonaProyecto nombre={nombre} asignada={Boolean(tarea.miembroId)} />;
          return (
            <li key={tarea.id} className="pj-trow" data-fila={tono} data-tarea={tarea.id}>
              <span className="pj-ticon" aria-hidden="true">
                <Icono nombre={tarea.tipo === "reembolso" ? "receipt" : "broom"} />
              </span>
              <div className="pj-tc-titulo min-w-0">
                <p className="pj-item-t">{textoVisible(tarea.titulo, idioma)}</p>
                {nota}
                {detalle ? <p className="text-xs text-[var(--suave)]">{detalle}</p> : null}
                {fallida && avisosFila[tarea.id] ? <p className="pj-tnota is-naranja">{claro(avisosFila[tarea.id]!)}</p> : null}
              </div>
              <div className="pj-tc-tipo">{tipoNodo}</div>
              <div className="pj-tc-monto">{montoNodo}</div>
              <div className="pj-tc-persona min-w-0">{personaNodo}</div>
              <div className="pj-tc-estado">{estadoNodo}</div>
              <div className="pj-tcampo-m is-mid" aria-hidden="true">
                {tipoNodo}
                {montoNodo}
                {estadoNodo}
              </div>
              <div className="pj-tcampo-m is-bot">
                {personaNodo}
                {nota}
              </div>
              <div className="pj-tc-mas relative" data-menu={tarea.id}>
                <button
                  type="button"
                  className="pj-mas"
                  aria-haspopup="menu"
                  aria-expanded={menuId === tarea.id}
                  aria-label={t("proyecto.masAcciones", { titulo: textoVisible(tarea.titulo, idioma) })}
                  onClick={() => setMenuId((actual) => (actual === tarea.id ? null : tarea.id))}
                >
                  <Icono nombre="dots" />
                </button>
                {menuId === tarea.id ? (
                  <div className="pj-menu" role="menu">
                    {tarea.bloqueo ? null : (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setMenuId(null);
                          setEditandoId(null);
                          setEligiendoId(tarea.id);
                        }}
                      >
                        <Icono nombre="swap" tam={16} />
                        {tarea.miembroId ? t("sugeridos.cambiar") : t("sugeridos.asignar")}
                      </button>
                    )}
                    {tarea.bloqueo ? null : (
                      <button type="button" role="menuitem" onClick={() => abrir(tarea)}>
                        <Icono nombre="edit" tam={16} />
                        {t("eventos.edit")}
                      </button>
                    )}
                    <Link href={`/revision/${tarea.id}`} role="menuitem" className="flex min-h-10 items-center gap-2.5 rounded-[10px] px-3 py-2 text-[13.5px] hover:bg-[var(--superficie-2)]">
                      <Icono nombre="chevR" tam={16} />
                      {t("bandeja.openReview")}
                    </Link>
                    {tarea.bloqueo ? (
                      <p className="pj-menu-nota">
                        <Icono nombre="checkC" tam={16} />
                        {t("proyecto.yaEvidencia")}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>

              {eligiendoId === tarea.id && !tarea.bloqueo ? (
                <div className="pj-panel-fila mt-3">
                  {conSugeridos && sugeridos && proyectoId ? (
                    <div className="hyto-card p-4">
                      <SugeridosAsignar
                        proyectoId={proyectoId}
                        tarea={{ id: tarea.id, titulo: textoVisible(tarea.titulo, idioma) }}
                        sugeridos={sugeridos}
                        actualId={tarea.miembroId}
                        onAsignar={async (usuarioId) => {
                          if (await asignar(tarea.id, usuarioId)) setEligiendoId(null);
                        }}
                        onCerrar={() => setEligiendoId(null)}
                      />
                    </div>
                  ) : (
                    <label className="block text-sm" htmlFor={`asignar-${tarea.id}`}>
                      {t("eventos.assign")}
                      <select
                        id={`asignar-${tarea.id}`}
                        className="hyto-input mt-2"
                        value={tarea.miembroId}
                        onChange={(evento) => {
                          void asignar(tarea.id, evento.target.value).then((ok) => {
                            if (ok) setEligiendoId(null);
                          });
                        }}
                      >
                        <option value="">{t("comunes.unassigned")}</option>
                        {miembros.map((item) => (
                          <option key={item.usuarioId} value={item.usuarioId}>
                            {nombreDe(item.nombre)}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  <FichaAsignada miembros={miembros} miembroId={tarea.miembroId} />
                </div>
              ) : null}

              {editando && borrador ? (
                <form
                  className="pj-panel-fila mt-3 grid gap-4 sm:grid-cols-2"
                  onSubmit={(evento) => {
                    evento.preventDefault();
                    void guardar(tarea);
                  }}
                >
                  <label className="block text-sm text-[var(--suave)] sm:col-span-2" htmlFor={`titulo-${tarea.id}`}>
                    {t("eventos.titleLabel")}
                    <input
                      id={`titulo-${tarea.id}`}
                      value={borrador.titulo}
                      onChange={(evento) => setBorrador({ ...borrador, titulo: evento.target.value })}
                      className="hyto-input mt-2"
                    />
                  </label>
                  <label className="block text-sm text-[var(--suave)] sm:col-span-2" htmlFor={`condicion-${tarea.id}`}>
                    {t("eventos.photoMust")}
                    <input
                      id={`condicion-${tarea.id}`}
                      value={borrador.condicion}
                      onChange={(evento) => setBorrador({ ...borrador, condicion: evento.target.value })}
                      className="hyto-input mt-2"
                    />
                  </label>
                  <label className="block text-sm text-[var(--suave)]" htmlFor={`monto-${tarea.id}`}>
                    {t("eventos.amount")}
                    <input
                      id={`monto-${tarea.id}`}
                      inputMode="decimal"
                      value={borrador.monto}
                      aria-invalid={avisoMontoEntrada(borrador.monto) ? true : undefined}
                      onChange={(evento) => setBorrador({ ...borrador, monto: escribirMonto(evento.target.value) })}
                      className="hyto-input mt-2"
                    />
                    {avisoMontoEntrada(borrador.monto) ? (
                      <p role="alert" className="mt-2 text-sm text-[var(--peligro)]">
                        {avisoMontoEntrada(borrador.monto)}
                      </p>
                    ) : null}
                  </label>
                  {tarea.tipo === "reembolso" ? (
                    <label className="block text-sm text-[var(--suave)]" htmlFor={`tope-${tarea.id}`}>
                      {t("eventos.limitUsdc")}
                      <input
                        id={`tope-${tarea.id}`}
                        inputMode="decimal"
                        value={borrador.tope}
                        aria-invalid={avisoMontoEntrada(borrador.tope) || faltaFila ? true : undefined}
                        aria-describedby={faltaFila ? `saldo-${tarea.id}` : undefined}
                        onChange={(evento) => setBorrador({ ...borrador, tope: escribirMonto(evento.target.value) })}
                        className="hyto-input mt-2"
                      />
                    </label>
                  ) : null}
                  {faltaFila ? (
                    <p id={`saldo-${tarea.id}`} role="alert" className="text-sm leading-6 text-[var(--peligro)] sm:col-span-2">
                      {t("errores.saldoNoCubre", textosSaldo(faltaFila, idioma))}
                    </p>
                  ) : null}
                  <label className="block text-sm text-[var(--suave)] sm:col-span-2" htmlFor={`asignar-editar-${tarea.id}`}>
                    {t("eventos.assign")}
                    <select
                      id={`asignar-editar-${tarea.id}`}
                      className="hyto-input mt-2"
                      value={borrador.miembroId}
                      onChange={(evento) => setBorrador({ ...borrador, miembroId: evento.target.value })}
                    >
                      <option value="">{t("comunes.unassigned")}</option>
                      {miembros.map((item) => (
                        <option key={item.usuarioId} value={item.usuarioId}>
                          {nombreDe(item.nombre)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="hyto-acciones-fila flex flex-wrap gap-2 sm:col-span-2">
                    <button type="submit" className="hyto-btn-line is-inline px-5" disabled={guardando || Boolean(faltaFila)}>
                      {t("eventos.save")}
                    </button>
                    <button
                      type="button"
                      className="hyto-btn-line is-inline px-5"
                      onClick={() => {
                        setEditandoId(null);
                        setBorrador(null);
                      }}
                    >
                      {t("eventos.cancel")}
                    </button>
                  </div>
                </form>
              ) : null}
              {tarea.bloqueo && (eligiendoId === tarea.id || editandoId === tarea.id) ? (
                <p id={`bloqueo-${tarea.id}`} className="pj-panel-fila mt-3 text-sm text-[var(--suave)]">
                  {claro(tarea.bloqueo)}
                </p>
              ) : null}
            </li>
          );
        })}
        {filaAgregar}
      </ul>
      {aviso ? (
        <p role="alert" className="mt-4 text-sm text-[var(--peligro)]">
          {claro(aviso)}
        </p>
      ) : null}
    </main>
  );
}
