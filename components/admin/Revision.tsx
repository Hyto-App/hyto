"use client";

import Link from "next/link";
import { Fragment, useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AccionesRevisionFallida } from "@/components/admin/RevisionFallida";
import { Icono } from "@/components/admin/IconosProyecto";
import { Mile } from "@/components/ui/Mile";
import { PersonaProyecto } from "@/components/admin/PersonaProyecto";
import { pasosRevision, rotuloPasoPago, rotuloPrincipalRevision } from "@/lib/admin/proyecto-vista";
import { FichaVoluntario } from "@/components/perfil/Ficha";
import { BotonPrincipal } from "@/components/integrante/BotonPrincipal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EnlaceExplorador } from "@/components/ui/EnlaceExplorador";
import { PastillaEstado } from "@/components/integrante/EstadoTarea";
import { EtiquetasNota, MotivoNota } from "@/components/admin/EtiquetasNota";
import { IndicadorActualizado } from "@/components/admin/IndicadorActualizado";
import { PastillaVeredicto } from "@/components/admin/PastillaVeredicto";
import { useNovedadesEvento } from "@/components/admin/usarNovedades";
import { AvisoFirma, esAvisoDispositivo } from "@/components/sesion/AvisoFirma";
import { ProgresoFirma } from "@/components/admin/ProgresoFirma";
import { ClaveNavegador, sinClave, useFirmaNavegador, type RevisarFirma } from "@/components/sesion/ClaveNavegador";
import { AvisoSesion } from "@/components/sesion/AvisoSesion";
import { useModoDemo } from "@/components/sesion/InsigniaDemo";
import { guardarDecision } from "@/lib/admin/memoria";
import {
  accionDemo,
  botonesDemo,
  botonesRevision,
  cargarDetalleOrganizador,
  confirmarMonto,
  leerFondeo,
  montoDeVista,
  pagoPendiente,
  type DetalleRevision,
} from "@/lib/admin/remoto";
import { consultarHasta, type EstadoConsulta } from "@/lib/admin/consulta-escrow";
import { tareaEjemploDeDemo } from "@/lib/admin/ejemplo";
import { mismaTareaAdmin } from "@/lib/admin/novedades";
import { reintentoFondoEnCurso } from "@/lib/admin/reintento-fondo";
import { centavos, detalleMonto, enlaceContrato, enlaceCredencial, enlacePago, etiquetaOrigen, notaCopia, notaManual, normalizarMonto, sinVeredicto, vistaAdmin } from "@/lib/admin/vista";
import { faltaParaBloquear } from "@/lib/escrow/saldo";
import { esTipoDocumento } from "@/lib/evidencia/tipo";
import { CODIGO_YA_FONDEADO } from "@/lib/escrow/fondeo";
import { AVISO_MONTO_INVALIDO, montoDentroDelTope } from "@/lib/escrow/monto";
import {
  AVISO_FIRMA,
  AVISO_PASSKEY,
  AVISO_REINGRESO,
  AVISO_SIN_CUENTA_FIRMA,
  ErrorFirmaCliente,
  firmarPasos,
  mensajeFirmaVisible,
  pasosDesde,
  type AccionCliente,
  type PagoFirmado,
} from "@/lib/escrow/firmarCliente";
import { acortarDireccion, explicarPago, formatearFecha, formatearMonto, montoAsegurado, montoDelBloqueo, montoQueAparta, textosSaldo, vistaMonto } from "@/lib/integrante/formato";
import { puntosDeCondicion } from "@/lib/integrante/puntos";
import { cuerpoPedirOtra } from "@/lib/integrante/revision";
import { AVISO_ENVIO_FALLIDO } from "@/lib/integrante/rutas";
import { useClaro, useIdioma, useTexto } from "@/components/ui/Idioma";
import { cajaDeFallo, detalleFallo, frasePaso, mensajeClaro, tituloFallo } from "@/lib/ui/claro";
import { etiquetaTipo, textoVisible } from "@/lib/ui/etiquetas";
import { esContratoDemo } from "@/lib/sesion/demo";
import type { TareaAdmin } from "@/lib/admin/tipos";

function pausaPasoDemo(): number {
  return typeof process !== "undefined" && process.env.NODE_TEST_CONTEXT ? 0 : 900;
}

function frasePagada(tarea: TareaAdmin, idioma: "en" | "es"): string {
  const detalle = detalleMonto(tarea);
  const frase = explicarPago(
    {
      tipo: tarea.tipo,
      monto: tarea.monto,
      tope: tarea.tope,
      montoConfirmado: tarea.tipo === "reembolso" ? detalle.cifra : null,
    },
    idioma,
  )?.frase;
  return frase || formatearMonto(detalle.cifra, idioma);
}

export function Revision({
  tareaId,
  eventoId,
  firmar,
  saldo = null,
  revisarFirma,
}: {
  tareaId: string;
  eventoId?: string;
  firmar?: (unsignedXdr: string) => Promise<string>;
  saldo?: string | null;
  /** Same check Settings uses: does this browser hold the account key? */
  revisarFirma?: RevisarFirma;
}) {
  const modoDemo = useModoDemo();
  const t = useTexto();
  const claro = useClaro();
  const idioma = useIdioma();
  const [tarea, setTarea] = useState<TareaAdmin | null | undefined>(undefined);
  const [foto, setFoto] = useState<string | null>(null);
  const [real, setReal] = useState(false);
  const [paso, setPaso] = useState<AccionCliente | null>(null);
  // The steps of the signature in flight, from before the key check until it ends. Drives the Cavos line.
  const [firmando, setFirmando] = useState<readonly AccionCliente[] | null>(null);
  const [hashPaso, setHashPaso] = useState<string | null>(null);
  const [contrato, setContrato] = useState<string | null>(null);
  const [fondeado, setFondeado] = useState<boolean | null>(null);
  const [reanudar, setReanudar] = useState<AccionCliente | null>(null);
  const [wallet, setWallet] = useState<string | null>(null);
  const [aviso, escribirAviso] = useState<string | null>(null);
  const [hojaPedir, setHojaPedir] = useState(false);
  const [pidioOtra, setPidioOtra] = useState(false);
  const [notaPedir, setNotaPedir] = useState("");
  const [fallidosPedir, setFallidosPedir] = useState<number[]>([]);
  const [falloPaso, setFalloPaso] = useState<AccionCliente | null>(null);
  const [falloCodigo, setFalloCodigo] = useState<string | null>(null);
  // Asked up front, like Settings: a browser without the account key sees the steps to bring it
  // here before Lock budget, not a notice after the server already prepared the step.
  const firmaNavegador = useFirmaNavegador(real && !modoDemo && Boolean(wallet) && !firmar, revisarFirma);
  const faltaClave = sinClave(firmaNavegador);

  function publicarAviso(
    mensaje: string | null,
    fallo: { paso: AccionCliente | null; codigo: string | null } | null = null,
  ) {
    escribirAviso(mensaje);
    setFalloPaso(fallo?.paso ?? null);
    setFalloCodigo(fallo?.codigo ?? null);
  }
  const [borrador, setBorrador] = useState("");
  const [confirmando, setConfirmando] = useState(false);
  const fondeoForzado = useRef<string | null>(null);
  const [intento, setIntento] = useState(0);
  const [consultaFondo, setConsultaFondo] = useState<EstadoConsulta>(null);
  const [vueltaFondo, setVueltaFondo] = useState(0);
  const [consultaPago, setConsultaPago] = useState<EstadoConsulta>(null);
  const [vueltaPago, setVueltaPago] = useState(0);
  const [confirmacion, setConfirmacion] = useState<{ clave: "bloquear" | "fondear" | "pagar"; abierto: boolean } | null>(null);
  // «Bloquear y aprobar»: set when the lock was started from a task with evidence waiting; a good lock opens the pay dialog.
  const aprobarTras = useRef(false);
  const abrirPago = useRef(false);
  const pagoDisponible = useRef(false);

  useEffect(() => {
    let viva = true;
    const local = modoDemo ? tareaEjemploDeDemo(tareaId) : null;
    setTarea(local ?? undefined);
    setFoto(null);
    setReal(false);
    setHashPaso(null);
    setContrato(null);
    setFondeado(null);
    setReanudar(null);
    fondeoForzado.current = null;
    setWallet(null);
    publicarAviso(null);
    void cargarDetalleOrganizador(tareaId).then((detalle) => {
      if (!viva) return;
      if (!detalle) {
        if (local) return;
        setTarea(null);
        publicarAviso("Could not load this review.");
        return;
      }
      setReal(true);
      setTarea(detalle.tarea);
      setFoto(detalle.foto);
      setContrato(detalle.contratoEscrow);
      setWallet(detalle.wallet);
    });
    return () => {
      viva = false;
    };
  }, [tareaId, modoDemo, intento]);

  useEffect(() => {
    if (!real || !contrato) return;
    // A demo lock has no contract on the network: there is no balance to read.
    if (fondeoForzado.current === contrato || esContratoDemo(contrato)) {
      setFondeado(true);
      return;
    }
    let viva = true;
    setConsultaFondo("leyendo");
    void consultarHasta({
      leer: () => leerFondeo(contrato),
      listo: (valor) => valor !== null,
      vivo: () => viva && fondeoForzado.current !== contrato,
    }).then((resultado) => {
      if (!viva || fondeoForzado.current === contrato) return;
      if (!resultado.listo) {
        setConsultaFondo("agotada");
        return;
      }
      setConsultaFondo(null);
      setFondeado(resultado.valor);
    });
    return () => {
      viva = false;
    };
  }, [real, contrato, vueltaFondo]);

  const claveMonto = tarea
    ? `${tarea.id}|${tarea.montoConfirmado ?? ""}|${tarea.montoRevisado ?? ""}|${tarea.tope ?? ""}|${tarea.monto}`
    : "";
  const tareaMontoRef = useRef(tarea);
  tareaMontoRef.current = tarea;
  useEffect(() => {
    const actual = tareaMontoRef.current;
    if (!actual || actual.tipo !== "reembolso") return;
    const base = actual.montoConfirmado ?? actual.montoRevisado ?? "";
    setBorrador(montoDentroDelTope(base, actual.tope, actual.monto) ?? "");
  }, [claveMonto]);

  const pasoRef = useRef(paso);
  pasoRef.current = paso;
  const confirmandoRef = useRef(confirmando);
  confirmandoRef.current = confirmando;
  const fotoRef = useRef(foto);
  fotoRef.current = foto;
  const tareaRef = useRef(tarea);
  tareaRef.current = tarea;
  const localRef = useRef(0);

  const { reciente, sesionVencida } = useNovedadesEvento({
    proyectoId: real && eventoId ? eventoId : undefined,
    tareas: tarea
      ? [{ id: tarea.id, estado: tarea.estado, veredicto: tarea.veredicto, origen: tarea.origen }]
      : [],
    exigirFoto: true,
    fotoDe: (id) => (id === tareaId ? fotoRef.current : null),
    alCambiar: async (ids) => {
      const marca = localRef.current;
      if (pasoRef.current || confirmandoRef.current || reintentoFondoEnCurso(tareaId)) {
        return { ok: false, avisar: false };
      }
      if (!ids.includes(tareaId)) return { ok: true, avisar: false };
      const detalle = await cargarDetalleOrganizador(tareaId);
      if (
        !detalle ||
        localRef.current !== marca ||
        pasoRef.current ||
        confirmandoRef.current ||
        reintentoFondoEnCurso(tareaId)
      ) {
        return { ok: false, avisar: false };
      }
      const previa = tareaRef.current;
      const tareaIgual = previa ? mismaTareaAdmin(previa, detalle.tarea) : false;
      const fotoIgual = fotoRef.current === detalle.foto;
      if (!tareaIgual) setTarea(detalle.tarea);
      if (!fotoIgual) setFoto(detalle.foto);
      return { ok: true, avisar: !tareaIgual || !fotoIgual };
    },
  });

  function abrirPedir() {
    setNotaPedir("");
    setFallidosPedir([]);
    setHojaPedir(true);
  }

  async function pedirOtra() {
    if (!tarea) return;
    const puntos = puntosDeCondicion(tarea.condicion);
    const cuerpo = cuerpoPedirOtra(notaPedir, fallidosPedir, puntos);
    if (!real) {
      setHojaPedir(false);
      decidir("pendiente");
      setPidioOtra(true);
      return;
    }
    publicarAviso(null);
    try {
      const respuesta = await fetch(`/api/revision/${encodeURIComponent(tareaId)}/pedir`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(cuerpo),
      });
      const leido = (await respuesta.json().catch(() => null)) as { aviso?: string } | null;
      if (!respuesta.ok) {
        publicarAviso(leido?.aviso ?? "Could not ask for another photo.");
        return;
      }
      setHojaPedir(false);
      setTarea((actual) => (actual ? sinVeredicto({ ...actual, estado: "pendiente" }) : actual));
      setPidioOtra(true);
    } catch {
      // A dropped connection rejects the fetch. The task stays in review until the request lands.
      publicarAviso(AVISO_ENVIO_FALLIDO);
    }
  }

  function decidir(decision: "pagado" | "pendiente") {
    const guardado = guardarDecision(tareaId, decision);
    if (guardado.aviso) {
      publicarAviso(guardado.aviso);
      return;
    }
    publicarAviso(null);
    const vista = vistaAdmin(guardado.memoria);
    setTarea(vista.tareas.find((item) => item.id === tareaId) ?? null);
  }

  const aplicarDetalle = useCallback((detalle: DetalleRevision) => {
    localRef.current += 1;
    setReal(true);
    setTarea(detalle.tarea);
    setFoto(detalle.foto);
    setContrato(detalle.contratoEscrow);
    setWallet(detalle.wallet);
  }, []);

  const esperaPago = real && tarea ? pagoPendiente(tarea) : false;
  useEffect(() => {
    if (!esperaPago) {
      setConsultaPago(null);
      return;
    }
    let viva = true;
    setConsultaPago("leyendo");
    // GET /api/revision/:id marks the task paid once the read model shows milestone 0 released.
    void consultarHasta({
      leer: () => cargarDetalleOrganizador(tareaId),
      listo: (detalle) => detalle !== null && !pagoPendiente(detalle.tarea),
      inmediata: false,
      vivo: () => viva && !pasoRef.current,
    }).then((resultado) => {
      if (!viva) return;
      if (!resultado.listo || !resultado.valor) {
        setConsultaPago("agotada");
        return;
      }
      setConsultaPago(null);
      aplicarDetalle(resultado.valor);
    });
    return () => {
      viva = false;
    };
  }, [esperaPago, tareaId, vueltaPago, aplicarDetalle]);

  async function confirmar() {
    if (confirmando || !tarea || tarea.tipo !== "reembolso") return;
    const pago = montoDentroDelTope(borrador, tarea.tope, tarea.monto);
    if (!pago) {
      publicarAviso(AVISO_MONTO_INVALIDO);
      return;
    }
    setConfirmando(true);
    publicarAviso(null);
    try {
      const resultado = await confirmarMonto(tareaId, pago);
      if ("aviso" in resultado) {
        publicarAviso(resultado.aviso);
        return;
      }
      setBorrador(resultado.montoConfirmado);
      setTarea((actual) => (actual ? { ...actual, montoConfirmado: resultado.montoConfirmado } : actual));
    } finally {
      setConfirmando(false);
    }
  }

  /** Demo mode walks the same steps as the real flow, with no wallet and no signature. */
  async function correrDemo(accion: "bloquear" | "pagar", senal: AbortSignal): Promise<boolean> {
    if (paso || !tarea) return false;
    publicarAviso(null);
    const pasos: AccionCliente[] = accion === "bloquear" ? ["desplegar", "fondear"] : ["marcar", "aprobar", "liberar"];
    let resultado: Awaited<ReturnType<typeof accionDemo>> | null = null;
    try {
      for (const actual of pasos) {
        if (senal.aborted) return false;
        setPaso(actual);
        await new Promise((listo) => setTimeout(listo, pausaPasoDemo()));
      }
      if (senal.aborted) return false;
      resultado = await accionDemo(tareaId, accion);
      if (!resultado.ok) {
        publicarAviso(resultado.aviso);
        return false;
      }
      if (resultado.contrato) {
        fondeoForzado.current = resultado.contrato;
        setContrato(resultado.contrato);
        setFondeado(true);
      }
      return true;
    } finally {
      setPaso(null);
      if (resultado?.ok) {
        const fresco = await cargarDetalleOrganizador(tareaId);
        if (fresco) aplicarDetalle(fresco);
        else if (accion === "pagar") setTarea((actual) => (actual ? { ...actual, estado: "pagado" } : actual));
      }
    }
  }

  /** True when the steps went through (or the network already held the budget). */
  async function correr(acciones: readonly AccionCliente[], senal?: AbortSignal): Promise<boolean> {
    if (paso || !tarea) return false;
    if (!wallet) {
      publicarAviso(AVISO_SIN_CUENTA_FIRMA);
      return false;
    }
    if (acciones[0] !== "desplegar" && !contrato) {
      publicarAviso("Lock the budget before you pay.");
      return false;
    }
    publicarAviso(null);
    setFirmando(acciones);
    let actual: AccionCliente | null = null;
    let pago: PagoFirmado | null = null;
    let contratoParcial: string | null = null;
    let yaEnRed = false;
    let exito = false;
    try {
      pago = await firmarPasos(acciones, tareaId, {
        ...(firmar ? { firmar } : {}),
        ...(senal ? { senal } : {}),
        extra: {
          firmante: wallet,
          ...(contrato ? { contrato } : {}),
          monto: montoDeVista(tarea) ?? undefined,
          indice: 0,
          estado: "completed",
        },
        alEmpezar: (accion) => {
          actual = accion;
          setPaso(accion);
        },
      });
      if (pago.contrato) setContrato(pago.contrato);
      if (acciones.includes("fondear") && pago.contrato) {
        fondeoForzado.current = pago.contrato;
        setFondeado(true);
      }
      setReanudar(null);
      setHashPaso(pago.hash);
      if (pago.aviso) publicarAviso(mensajeClaro(pago.aviso));
    } catch (error) {
      const codigo = error instanceof ErrorFirmaCliente ? error.codigo : null;
      if (codigo === CODIGO_YA_FONDEADO) {
        // The network already holds the budget. Offering Finish locking again would lock it twice.
        yaEnRed = true;
        if (contrato) fondeoForzado.current = contrato;
        setFondeado(true);
        setReanudar(null);
        publicarAviso(null);
      } else {
        if (actual === "marcar" || actual === "aprobar" || actual === "liberar") setReanudar(actual);
        if (error instanceof ErrorFirmaCliente && error.contrato) contratoParcial = error.contrato;
        const mensajeError = error instanceof ErrorFirmaCliente ? error.message : "";
        if (esAvisoDispositivo(mensajeError) || mensajeError === AVISO_PASSKEY) {
          // Same guide as the up-front check, with Try again restoring the key from a passkey.
          firmaNavegador.marcarSinClave(mensajeError === AVISO_PASSKEY);
          publicarAviso(null);
        } else publicarAviso(mensajeClaro(mensajeFirmaVisible(error instanceof ErrorFirmaCliente ? error.message : AVISO_FIRMA)), {
          paso: actual,
          codigo,
        });
      }
    } finally {
      setPaso(null);
      setFirmando(null);
      if (!yaEnRed && !pago && contratoParcial) setContrato(contratoParcial);
      if (!yaEnRed && !pago && contratoParcial && acciones.includes("fondear")) setFondeado(false);
      const fresco = await cargarDetalleOrganizador(tareaId);
      const contratoConocido = fresco?.contratoEscrow ?? pago?.contrato ?? contratoParcial;
      exito = Boolean(pago) || yaEnRed;
      if (contratoConocido) setContrato(contratoConocido);
      if (!yaEnRed && !pago && acciones.includes("fondear") && contratoConocido) setFondeado(false);
      if (fresco) {
        setTarea(fresco.tarea);
        setFoto(fresco.foto);
        setWallet(fresco.wallet ?? wallet);
        setReal(true);
      } else if (pago?.hash && acciones.includes("liberar")) {
        const hashPago = pago.hash;
        setTarea((actualTarea) => {
          if (!actualTarea) return actualTarea;
          return { ...actualTarea, estado: "pagado", hashPago };
        });
      }
    }
    return exito;
  }

  if (tarea === undefined) {
    return (
      <main className="hyto-page" aria-busy="true">
        <p className="text-[var(--suave)]">{t("comunes.loading")}</p>
        <div className="mt-4 grid gap-3">
          {[0, 1].map((item) => (
            <div key={item} className="hyto-skel">
              <i />
              <span>
                <i />
                <i />
              </span>
            </div>
          ))}
        </div>
      </main>
    );
  }

  if (!tarea) {
    return (
      <main className="hyto-page">
        <p className="text-lg" role="alert">
          {claro(aviso ?? "We couldn't find that task.")}
        </p>
        {aviso ? (
          <button type="button" className="hyto-btn mt-6 max-w-xs" onClick={() => setIntento((actual) => actual + 1)}>
            {t("comunes.tryAgain")}
          </button>
        ) : (
          <Link href={eventoId ? `/eventos/${eventoId}` : "/eventos"} className="hyto-btn-line is-inline mt-6 px-5">
            {t("revision.backEvent")}
          </Link>
        )}
      </main>
    );
  }

  const demoReal = real && modoDemo;
  const botonesBase = botonesRevision(tarea, real, { contrato, fondeado });
  const demo = botonesDemo(tarea, contrato);
  const botones = demoReal
    ? { ...botonesBase, desplegar: demo.bloquear, fondear: false, pagar: demo.pagar, verificarFondo: false }
    : botonesBase;
  const esperaConfirmacion =
    real && !demoReal && tarea.tipo === "reembolso" && !contrato && tarea.estado !== "pagado" && montoDeVista(tarea) === null;
  const topePago = normalizarMonto(tarea.tope ?? "") ?? normalizarMonto(tarea.monto);
  const sobreTope = Boolean(topePago && tarea.montoRevisado && centavos(tarea.montoRevisado) > centavos(topePago));
  const borradorNormal = normalizarMonto(borrador);
  const coincide = Boolean(tarea.montoConfirmado && borradorNormal && tarea.montoConfirmado === borradorNormal);
  // In demo the server confirms a reimbursement amount within the cap, so lock does not wait for the form.
  const puedeDesplegar = botones.desplegar && (demoReal || tarea.tipo !== "reembolso" || coincide);
  // A real file on a pending task means the last photo was sent back. Lock stays off until a new one arrives.
  const esperaOtraFoto =
    real &&
    tarea.estado === "pendiente" &&
    tarea.veredicto === null &&
    (pidioOtra || Boolean(foto) || (tarea.intentosAnteriores?.length ?? 0) > 0);
  const cifraBloqueo = montoDeVista(tarea);
  const faltaSaldo =
    real && !demoReal && cifraBloqueo !== null ? faltaParaBloquear(saldo, String(cifraBloqueo)) : null;
  const describeBloqueo = [
    esperaOtraFoto ? "bloqueo-foto" : "",
    esperaConfirmacion && !puedeDesplegar ? "bloqueo-monto" : "",
    faltaSaldo ? "bloqueo-saldo" : "",
    faltaClave ? "clave-navegador" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const origen = etiquetaOrigen(tarea.origen, idioma);
  const pago = enlacePago(tarea.hashPago);
  const pendiente = pagoPendiente(tarea);
  const transaccion = hashPaso && hashPaso !== tarea.hashPago ? enlacePago(hashPaso) : null;
  const cadenaBloqueo = real && tarea.estado !== "pagado" && !pendiente ? enlaceContrato(contrato) : null;
  const credencial = enlaceCredencial(tarea.credencialUrl);
  const ocupado = paso !== null;
  const caja = cajaDeFallo({ paso: falloPaso, codigo: falloCodigo });
  const avisoVisible = aviso ? claro(aviso) : null;
  // Said in the dialog before the person confirms, and kept up to date while it signs.
  const progresoDe = (acciones: readonly AccionCliente[]) =>
    demoReal ? undefined : <ProgresoFirma acciones={firmando ?? acciones} paso={paso} />;
  const datosConfirmacion = (clave: "bloquear" | "fondear" | "pagar") => {
    const cifra = montoDeVista(tarea);
    const monto = cifra === null ? undefined : cifra.toString();
    if (clave === "pagar") {
      const visible = monto ? formatearMonto(monto, idioma) : "";
      return {
        titulo: t("confirmar.payTitle"),
        monto,
        destinatario: tarea.miembro ? { nombre: textoVisible(tarea.miembro, idioma) } : undefined,
        detalle: t("confirmar.payDetail"),
        irreversible: true,
        confirmar: t("confirmar.payAction", { monto: visible }),
        progreso: progresoDe(pasosDesde(reanudar)),
        onConfirmar: async (senal: AbortSignal) => {
          await (demoReal ? correrDemo("pagar", senal) : correr(pasosDesde(reanudar), senal));
        },
      };
    }
    // The lock dialog always names the amount. A reimbursement without a confirmed amount shows "Up to" the cap.
    const bloqueo = montoDelBloqueo(tarea, idioma);
    return {
      titulo: t(clave === "bloquear" ? "confirmar.lockTitle" : "confirmar.finishTitle"),
      montoTexto: bloqueo?.visible,
      detalle: t(
        clave === "bloquear" ? (bloqueo?.hasta ? "confirmar.lockDetailCap" : "confirmar.lockDetail") : "confirmar.finishDetail",
      ),
      confirmar: t("confirmar.lockAction", { monto: bloqueo?.accion ?? "" }),
      progreso: progresoDe(clave === "bloquear" ? ["desplegar", "fondear"] : ["fondear"]),
      onConfirmar: async (senal: AbortSignal) => {
        const encadenar = aprobarTras.current;
        aprobarTras.current = false;
        const listo = await (demoReal && clave === "bloquear"
          ? correrDemo("bloquear", senal)
          : correr(clave === "bloquear" ? ["desplegar", "fondear"] : ["fondear"], senal));
        abrirPago.current = listo && encadenar && !senal.aborted;
      },
    };
  };
  const etiquetaPaso = (accion: AccionCliente) =>
    accion === "desplegar"
      ? t("pago.settingUp")
      : accion === "fondear"
        ? t("pago.locking")
        : accion === "marcar"
          ? t("pago.checking")
          : accion === "aprobar"
            ? t("pago.approving")
            : t("pago.paying");

  const enRevision = tarea.estado === "en revisión";
  const bloqueado = Boolean(contrato) && fondeado === true;
  // One primary per screen: pay when the budget is locked, otherwise lock (and approve right after, when evidence waits).
  const primaria: "pagar" | "fondear" | "bloquear" | null = botones.pagar
    ? "pagar"
    : botones.fondear
      ? "fondear"
      : puedeDesplegar || esperaConfirmacion
        ? "bloquear"
        : null;
  const rotulo = rotuloPrincipalRevision({
    enRevision,
    desplegar: primaria === "bloquear",
    fondear: primaria === "fondear",
    pagar: primaria === "pagar",
  });
  const bloqueoInactivo =
    primaria === "bloquear" ? !puedeDesplegar || esperaOtraFoto || Boolean(faltaSaldo) || faltaClave : primaria === "fondear" ? Boolean(faltaSaldo) || faltaClave : faltaClave;
  const describePrimaria =
    primaria === "bloquear"
      ? describeBloqueo
      : primaria === "fondear"
        ? [faltaSaldo ? "bloqueo-saldo" : "", faltaClave ? "clave-navegador" : ""].filter(Boolean).join(" ")
        : faltaClave
          ? "clave-navegador"
          : "";
  pagoDisponible.current = botones.pagar;
  const pulsarPrimaria = () => {
    if (ocupado || !primaria || bloqueoInactivo) return;
    // «Bloquear y aprobar»: after the lock signs, the payment dialog opens so the same decision finishes.
    aprobarTras.current = primaria !== "pagar" && enRevision;
    setConfirmacion({ clave: primaria, abierto: true });
  };
  const pasosLinea = pasosRevision({
    evidencia: tarea.estado !== "pendiente",
    bloqueado: bloqueado || tarea.estado === "pagado",
    pagado: tarea.estado === "pagado",
  });
  const montoLinea = vistaMonto(tarea, idioma);
  const nombreMiembro = textoVisible(tarea.miembro, idioma);
  const subPasos = [
    t("proyecto.pasoEvidencia"),
    t("proyecto.pasoBloqueado"),
    rotuloPasoPago(tarea.estado === "pagado", idioma),
  ];
  const detallesPasos = [
    "",
    bloqueado || tarea.estado === "pagado" ? t("proyecto.pasoEnStellar", { monto: montoLinea.linea }) : "",
    nombreMiembro ? t("proyecto.pasoA", { nombre: nombreMiembro }) : "",
  ];

  return (
    <main className="hyto-page">
      <header>
        <div className="pj-rtitulo">
          <h1 className="hyto-title">{textoVisible(tarea.titulo, idioma)}</h1>
          <MontoCabecera tarea={tarea} />
        </div>
        <p className="pj-rsub">
          <span>{etiquetaTipo(tarea.tipo, idioma)}</span>
          <span aria-hidden="true">·</span>
          <PersonaProyecto nombre={tarea.miembro} asignada={Boolean(tarea.miembro)} tam="sm" />
        </p>
        {tarea.perfilVoluntario ? <FichaVoluntario ficha={tarea.perfilVoluntario} /> : null}
        <IndicadorActualizado activo={real && Boolean(eventoId)} visible={reciente} />
      </header>
      {sesionVencida ? <AvisoSesion /> : null}
      {real ? (
        <ol className="hyto-tarjeta pj-pasos" aria-label={t("proyecto.pasos")}>
          {pasosLinea.map((estado, indice) => (
            <Fragment key={subPasos[indice]}>
              {indice > 0 ? <li aria-hidden="true" className="pj-linea" data-hecha={estado === "hecho" ? "si" : "no"} /> : null}
              <li className="pj-paso" data-estado={estado} aria-current={estado === "ahora" ? "step" : undefined}>
                <span className="pj-punto" aria-hidden="true">
                  {estado === "hecho" ? <Icono nombre="check" tam={14} /> : indice + 1}
                </span>
                <span>
                  <b>{subPasos[indice]}</b>
                  {detallesPasos[indice] ? <small>{detallesPasos[indice]}</small> : null}
                  {indice === 2 ? null : (
                    <span className="sr-only">
                      {" · "}
                      {estado === "hecho" ? t("comunes.done") : estado === "ahora" ? t("comunes.now") : t("comunes.later")}
                    </span>
                  )}
                </span>
              </li>
            </Fragment>
          ))}
        </ol>
      ) : null}
      <div className="pj-rgrid">
        <figure className="hyto-photo">
          {foto && esTipoDocumento(tarea.tipoArchivo) ? (
            <div className="flex aspect-[4/5] flex-col items-center justify-center gap-3 px-8 text-center">
              <p className="text-sm text-[var(--suave)]">
                {tarea.tipoArchivo === "application/pdf" ? t("evidencia.invoicePdf") : t("evidencia.textFile")}
              </p>
              <a href={foto} className="hyto-btn-line is-inline px-5" target="_blank" rel="noreferrer">
                {tarea.tipoArchivo === "application/pdf" ? t("revision.openInvoice") : t("revision.openFile")}
              </a>
            </div>
          ) : foto ? (
            <FotoEvidencia src={foto} alt={textoVisible(tarea.titulo, idioma)} />
          ) : !real && tarea.frase ? (
            <div className="flex aspect-[4/5] flex-col justify-end bg-[var(--superficie-2)] p-8">
              <p className="text-sm text-[var(--suave)]">{t("revision.sampleEvidence")}</p>
              <p className="mt-2 text-lg font-medium leading-7">{textoVisible(tarea.titulo, idioma)}</p>
            </div>
          ) : (
            <div className="flex aspect-[4/5] flex-col items-center justify-center gap-2 px-8 text-center text-sm text-[var(--suave)]">
              <p>{t("revision.noPhoto")}</p>
              <p>{t("revision.waitingVolunteer")}</p>
            </div>
          )}
        </figure>

        <section className="hyto-panel pj-rpanel">
          {tarea.condicion ? (
            <>
              <p className="pj-lab">{t("proyecto.loPedido")}</p>
              <p className="pj-pedido">{textoVisible(tarea.condicion, idioma)}</p>
              <div className="pj-hr" aria-hidden="true" />
            </>
          ) : null}
          {!real ? <p className="mb-4 text-sm leading-6 text-[var(--suave)]">{t("revision.sampleReview")}</p> : null}

          <div className="pj-mileblk">
            {tarea.veredicto ? (
              <p className="mb-3 flex items-center gap-2.5 text-sm font-medium">
                <Mile estado={tarea.estado === "pagado" ? "celebrando" : "recomendando"} tamano={40} />
                {t("proyecto.recomendacionMile")}
              </p>
            ) : null}
            <div className="flex flex-wrap items-center gap-3">
              {tarea.veredicto ? <PastillaVeredicto veredicto={tarea.veredicto} nota={tarea.nota} /> : <PastillaEstado estado={tarea.estado} />}
              {tarea.veredicto ? <MotivoNota etiquetas={tarea.etiquetas} condicion={tarea.condicion} /> : null}
              {/* The title already says «Recomendación de Mile»; only a failed review names its origin. */}
              {origen && tarea.origen === "error" ? <span className="text-sm text-[var(--suave)]">{origen}</span> : null}
            </div>
            <EtiquetasNota etiquetas={tarea.etiquetas} conMotivo={Boolean(tarea.veredicto)} vozMile condicion={tarea.condicion} />
            {notaManual(tarea.codigo) ? (
              <p className="mt-4 text-sm font-medium">{claro(notaManual(tarea.codigo) ?? "")}</p>
            ) : tarea.origen === "error" ? (
              <p className="mt-4 text-sm font-medium text-[var(--peligro)]">{t("revision.mileNo")}</p>
            ) : null}
            {notaCopia(tarea.motivoCopia) ? (
              <p className="mt-4 text-sm font-medium">{textoVisible(notaCopia(tarea.motivoCopia) ?? "", idioma)}</p>
            ) : null}
            {tarea.origen === "error" && tarea.frase ? (
              <p role="alert" className="mt-2 text-base leading-7">
                {textoVisible(tarea.frase, idioma)}
              </p>
            ) : tarea.frase ? (
              <p className="mt-3 text-[15px] leading-6">{textoVisible(tarea.frase, idioma)}</p>
            ) : null}
            {tarea.veredicto || tarea.frase ? (
              <p className="pj-mnota">
                <Icono nombre="info" tam={14} />
                {t("proyecto.mileDecide")}
              </p>
            ) : null}
          </div>
          {tarea.origen === "error" && real && tarea.estado !== "pagado" && !contrato ? (
            <AccionesRevisionFallida tareaId={tarea.id} onDetalle={aplicarDetalle} />
          ) : null}

          {tarea.tipo === "reembolso" && tarea.origen !== "error" && (tarea.montoRevisado || tarea.fecha || tarea.lectura?.montoOriginal) ? (
            <dl className="mt-6 grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-[var(--suave)]">{t("revision.amountReceipt")}</dt>
                <dd className="hyto-amount mt-1 text-xl">
                  {tarea.lectura?.montoOriginal && tarea.lectura.moneda && tarea.lectura.moneda !== "USD"
                    ? tarea.lectura.montoOriginal
                    : tarea.montoRevisado
                      ? formatearMonto(tarea.montoRevisado, idioma)
                      : t("revision.notShown")}
                </dd>
                {tarea.lectura?.montoOriginal && tarea.lectura.moneda !== "USD" ? (
                  <dd className="mt-1 text-sm leading-6 text-[var(--suave)]">
                    {tarea.montoRevisado && tarea.lectura.moneda && tarea.lectura.tasa
                      ? t("revision.printedConverted", {
                          monto: tarea.lectura.montoOriginal,
                          tasa: String(tarea.lectura.tasa),
                          moneda: tarea.lectura.moneda,
                        })
                      : t("revision.printedNotConverted", { monto: tarea.lectura.montoOriginal })}
                  </dd>
                ) : null}
              </div>
              <div>
                <dt className="text-sm text-[var(--suave)]">{t("comunes.date")}</dt>
                <dd className="hyto-amount mt-1 text-xl">{tarea.fecha ? formatearFecha(tarea.fecha, idioma) : t("revision.notShown")}</dd>
                {!tarea.fecha && tarea.lectura?.fechaImpresa ? (
                  <dd className="mt-1 text-sm leading-6 text-[var(--suave)]">{t("revision.printedDate", { fecha: tarea.lectura.fechaImpresa })}</dd>
                ) : null}
              </div>
            </dl>
          ) : null}

          {esperaConfirmacion ? (
            <form
              className="mt-6"
              onSubmit={(evento) => {
                evento.preventDefault();
                void confirmar();
              }}
            >
              <label htmlFor="monto-confirmado" className="text-sm text-[var(--suave)]">
                {t("revision.amountToPay")}
              </label>
              <input
                id="monto-confirmado"
                name="monto-confirmado"
                inputMode="decimal"
                required
                aria-describedby={sobreTope ? "monto-confirmado-ayuda monto-confirmado-tope" : "monto-confirmado-ayuda"}
                value={borrador}
                onChange={(evento) => setBorrador(evento.target.value)}
                className="hyto-input mt-2"
              />
              <p id="monto-confirmado-ayuda" className="mt-2 text-sm leading-6 text-[var(--suave)]">
                {t("revision.upTo", { monto: formatearMonto(tarea.tope ?? tarea.monto, idioma) })}
              </p>
              {sobreTope ? (
                <p id="monto-confirmado-tope" className="mt-2 text-sm leading-6 text-[var(--suave)]">
                  {t("revision.overCap", {
                    leido: formatearMonto(tarea.montoRevisado ?? "", idioma),
                    tope: formatearMonto(topePago ?? "", idioma),
                  })}
                </p>
              ) : null}
              <button
                type="button"
                disabled={confirmando || coincide || modoDemo}
                onClick={() => void confirmar()}
                className="hyto-btn-line mt-4 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {coincide ? t("revision.amountConfirmed") : confirmando ? t("revision.confirming") : t("revision.confirmAmount")}
              </button>
            </form>
          ) : tarea.tipo === "reembolso" && tarea.montoConfirmado ? (
            <p className="mt-6 text-sm text-[var(--suave)]">
              {t("revision.amountToPay")}{" "}
              <span className="text-xl font-semibold tracking-tight text-[var(--tinta)]">{formatearMonto(tarea.montoConfirmado, idioma)}</span>
            </p>
          ) : null}

          {caja && aviso ? (
            <div className="hyto-callout mt-5">
              <p className="font-semibold">{tituloFallo(caja, idioma)}</p>
              <p className="mt-1 text-sm">{detalleFallo(caja, avisoVisible ?? "", idioma, falloCodigo)}</p>
            </div>
          ) : null}

          <div className="hyto-actions">
            {botones.aprobarLocal ? (
              <BotonPrincipal type="button" onClick={() => decidir("pagado")}>
                {t("revision.approve")}
              </BotonPrincipal>
            ) : null}

            {!demoReal && primaria ? (
              <ClaveNavegador id="clave-navegador" firma={firmaNavegador} contexto={primaria === "pagar" ? "pago" : "bloqueo"} />
            ) : null}

            {primaria === "bloquear" ? (
              <>
                <p className="text-sm leading-6 text-[var(--suave)]">
                  {t("revision.setsAside", { monto: montoQueAparta(tarea, idioma) })}
                </p>
                {esperaOtraFoto && !pidioOtra ? (
                  <p className="text-sm leading-6 text-[var(--suave)]">
                    {t("revision.lockWaitingPhoto")}
                  </p>
                ) : null}
                {esperaConfirmacion && !puedeDesplegar ? (
                  <p id="bloqueo-monto" className="text-sm leading-6 text-[var(--suave)]">
                    {t("revision.lockNeedsAmount")}
                  </p>
                ) : null}
              </>
            ) : primaria === "fondear" ? (
              <p className="text-sm leading-6 text-[var(--suave)]">{t("revision.oneMore")}</p>
            ) : primaria === "pagar" && fondeado === true ? (
              <p className="text-sm leading-6 text-[var(--suave)]">{t("revision.secured", { monto: montoAsegurado(tarea, idioma) })}</p>
            ) : null}
            {primaria !== "pagar" && primaria && faltaSaldo ? (
              <p id="bloqueo-saldo" role="alert" className="text-sm leading-6 text-[var(--suave)]">
                {t("errores.saldoNoCubre", textosSaldo(faltaSaldo, idioma))}
              </p>
            ) : null}

            {primaria && rotulo ? (
              <BotonPrincipal
                type="button"
                disabled={ocupado || bloqueoInactivo}
                aria-busy={ocupado}
                aria-describedby={describePrimaria || undefined}
                onClick={pulsarPrimaria}
              >
                {paso ? (
                  etiquetaPaso(paso)
                ) : (
                  <span className="inline-flex items-center gap-2">
                    {primaria !== "pagar" ? <Icono nombre="lock" tam={16} /> : null}
                    {t(rotulo)}
                  </span>
                )}
              </BotonPrincipal>
            ) : null}

            {botones.pedirOtra ? (
              <button type="button" onClick={abrirPedir} className="hyto-btn-line">
                <span className="inline-flex items-center gap-2">
                  <Icono nombre="refresh" tam={16} />
                  {t("revision.askAnother")}
                </span>
              </button>
            ) : null}

            {hojaPedir && tarea && botones.pedirOtra ? (
              <form
                className="hyto-tarjeta hyto-pedir"
                onSubmit={(evento) => {
                  evento.preventDefault();
                  void pedirOtra();
                }}
              >
                <h2>{t("revision.whatsMissing")}</h2>
                <ul>
                  {puntosDeCondicion(tarea.condicion).map((punto, indice) => (
                    <li key={`${indice}-${punto}`}>
                      <label>
                        <input
                          type="checkbox"
                          checked={fallidosPedir.includes(indice)}
                          onChange={() =>
                            setFallidosPedir((actual) => (actual.includes(indice) ? actual.filter((item) => item !== indice) : [...actual, indice]))
                          }
                        />
                        <span>{punto}</span>
                      </label>
                    </li>
                  ))}
                </ul>
                <label className="hyto-pedir-nota">
                  {t("revision.messageFor", { name: textoVisible(tarea.miembro, idioma) || t("comunes.unassigned") })}
                  <textarea maxLength={280} value={notaPedir} onChange={(evento) => setNotaPedir(evento.target.value)} />
                </label>
                <div className="hyto-pedir-acciones">
                  <button type="button" className="hyto-btn-line" onClick={() => setHojaPedir(false)}>
                    {t("revision.cancelAsk")}
                  </button>
                  <BotonPrincipal type="submit">{t("revision.askAnother")}</BotonPrincipal>
                </div>
              </form>
            ) : null}

            {esperaOtraFoto ? (
              <p id="bloqueo-foto" role="status" className="hyto-pedir-listo">
                {t("revision.askedSent")}
              </p>
            ) : null}

            {demoReal && (botones.desplegar || botones.pagar) ? (
              <p className="text-center text-sm leading-6 text-[var(--suave)]">{t("revision.demoNote")}</p>
            ) : null}
          </div>

          {confirmacion ? (
            <ConfirmDialog
              abierto={confirmacion.abierto}
              onCerrar={() => {
                setConfirmacion((actual) => (actual ? { ...actual, abierto: false } : actual));
                if (abrirPago.current) {
                  abrirPago.current = false;
                  // Opened on the next tick so the lock dialog finishes closing first.
                  // Only when the screen really offers payment now (budget read as locked, task still in review).
                  window.setTimeout(() => {
                    if (pagoDisponible.current) setConfirmacion({ clave: "pagar", abierto: true });
                  }, 0);
                }
              }}
              {...datosConfirmacion(confirmacion.clave)}
            />
          ) : null}

          {firmando ? <ProgresoFirma acciones={firmando} paso={paso} /> : null}

          {paso ? (
            <p className="mt-4 text-sm leading-6 text-[var(--suave)]" aria-live="polite">
              {frasePaso(paso, idioma)}
            </p>
          ) : null}

          {avisoVisible ? (
            <div role={aviso === AVISO_ENVIO_FALLIDO ? "alert" : undefined}>
              <AvisoFirma mensaje={aviso ?? ""} className="mt-4 text-sm leading-6 text-[var(--suave)]" />
            </div>
          ) : null}

          {real && pendiente ? (
            <div className="mt-4" aria-live="polite">
              <p className="text-sm leading-6 text-[var(--suave)]">
                {consultaPago === "agotada" ? t("revision.paymentStillPending") : t("revision.paymentSent")}{" "}
                {pago ? (
                  <EnlaceExplorador href={pago} className="font-semibold underline-offset-4 hover:underline">
                    {t("pago.viewChain")}
                  </EnlaceExplorador>
                ) : null}
              </p>
              {consultaPago === "agotada" ? (
                <button type="button" className="hyto-btn-line is-inline mt-3 px-5" onClick={() => setVueltaPago((actual) => actual + 1)}>
                  {t("pago.checkAgain")}
                </button>
              ) : null}
            </div>
          ) : botones.verificarFondo && !paso ? (
            <div className="mt-4" aria-live="polite">
              <p className="text-sm leading-6 text-[var(--suave)]">
                {consultaFondo === "agotada" ? t("revision.budgetUnread") : t("revision.checkingBudget")}
              </p>
              {consultaFondo === "agotada" ? (
                <button type="button" className="hyto-btn-line is-inline mt-3 px-5" onClick={() => setVueltaFondo((actual) => actual + 1)}>
                  {t("comunes.tryAgain")}
                </button>
              ) : null}
            </div>
          ) : null}

          {cadenaBloqueo || transaccion ? (
            <EnlaceExplorador href={cadenaBloqueo ?? transaccion ?? ""} className="hyto-btn-line is-inline mt-4 px-5">
              {t("pago.viewChain")}
            </EnlaceExplorador>
          ) : null}

          {real && !demoReal && (wallet || contrato) ? (
            <details className="mt-6 text-sm text-[var(--suave)]">
              <summary className="cursor-pointer">{t("revision.technical")}</summary>
              {wallet ? <p className="mt-2 font-mono">{t("revision.yourAccount", { direccion: acortarDireccion(wallet) })}</p> : null}
              {contrato ? (
                <p className="mt-2 font-mono">{t("revision.budgetRef", { direccion: acortarDireccion(contrato) })}</p>
              ) : (
                <p className="mt-2 max-w-prose leading-6">{t("revision.refPendiente")}</p>
              )}
            </details>
          ) : null}

          {tarea.estado === "pagado" ? (
            <div className="mt-8 space-y-3">
              <p className="text-lg font-medium">{t("revision.paidAmount", { monto: frasePagada(tarea, idioma) })}</p>
              {pago ? (
                <EnlaceExplorador href={pago} className="hyto-btn-line is-inline px-5">
                  {t("pago.viewChain")}
                </EnlaceExplorador>
              ) : (
                <p className="text-sm leading-6 text-[var(--suave)]">
                  {demoReal ? t("evidencia.practiceNetwork") : real ? t("revision.paidWait") : t("revision.samplePay")}
                </p>
              )}
              {credencial ? (
                <a href={credencial} className="hyto-btn-line is-inline px-5">
                  {t("revision.credential")}
                </a>
              ) : null}
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}

function sincronizarImagen(nodo: HTMLImageElement | null, alCargar: () => void, alFallar: () => void): () => void {
  if (!nodo) return () => undefined;
  let viva = true;
  if (nodo.complete && nodo.naturalWidth > 0) alCargar();
  else if (nodo.complete) {
    // A 404 that finished before hydration never fires onError. decode() rejects that case.
    nodo.decode().then(
      () => {
        if (viva && nodo.naturalWidth > 0) alCargar();
      },
      () => {
        if (viva) alFallar();
      },
    );
  }
  return () => {
    viva = false;
  };
}

export function FotoEvidencia({ src, alt }: { src: string; alt: string }) {
  const t = useTexto();
  const abrir = useRef<HTMLButtonElement>(null);
  const imagen = useRef<HTMLImageElement>(null);
  const fallo = useRef(false);
  const [lista, setLista] = useState(false);
  const [rota, setRota] = useState(false);
  const [ampliada, setAmpliada] = useState(false);
  const [srcActiva, setSrcActiva] = useState(src);

  if (src !== srcActiva) {
    setSrcActiva(src);
    fallo.current = false;
    setLista(false);
    setRota(false);
    setAmpliada(false);
  }

  useEffect(
    () =>
      sincronizarImagen(
        imagen.current,
        () => setLista(true),
        () => {
          fallo.current = true;
          setRota(true);
        },
      ),
    [src],
  );

  useEffect(() => {
    if (lista || rota) return;
    const reloj = window.setTimeout(() => {
      fallo.current = true;
      setRota(true);
    }, 8000);
    return () => window.clearTimeout(reloj);
  }, [src, lista, rota]);

  function cerrar() {
    setAmpliada(false);
    abrir.current?.focus();
  }

  if (rota) {
    return (
      <div className="hyto-photo-nota" role="alert">
        <p>{t("revision.photoBroken")}</p>
      </div>
    );
  }

  return (
    <>
      {lista ? null : (
        <div className="hyto-photo-nota" role="status">
          <span className="hyto-spinner" aria-hidden="true" />
          <span>{t("revision.loadingPhoto")}</span>
        </div>
      )}
      <button
        ref={abrir}
        type="button"
        className="hyto-photo-abrir"
        aria-label={t("revision.viewLarger", { titulo: alt })}
        aria-haspopup="dialog"
        aria-expanded={ampliada}
        aria-disabled={lista ? undefined : true}
        tabIndex={lista ? 0 : -1}
        onClick={() => {
          if (lista) setAmpliada(true);
        }}
      >
        <img
          ref={imagen}
          src={src}
          alt=""
          onLoad={() => setLista(true)}
          onError={() => {
            fallo.current = true;
            setRota(true);
          }}
          style={lista ? undefined : { opacity: 0 }}
        />
      </button>
      {ampliada
        ? createPortal(
            <FotoAmpliada src={src} alt={alt} onCerrar={cerrar} />,
            document.body,
          )
        : null}
    </>
  );
}

function FotoAmpliada({ src, alt, onCerrar }: { src: string; alt: string; onCerrar: () => void }) {
  const t = useTexto();
  const titulo = useId();
  const cerrar = useRef<HTMLButtonElement>(null);
  const imagen = useRef<HTMLImageElement>(null);
  const fallo = useRef(false);
  const alCerrar = useRef(onCerrar);
  const [lista, setLista] = useState(false);
  const [rota, setRota] = useState(false);
  alCerrar.current = onCerrar;

  useEffect(
    () =>
      sincronizarImagen(
        imagen.current,
        () => setLista(true),
        () => {
          fallo.current = true;
          setRota(true);
        },
      ),
    [src],
  );

  useEffect(() => {
    cerrar.current?.focus();
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function tecla(evento: KeyboardEvent) {
      if (evento.key === "Escape") {
        evento.preventDefault();
        alCerrar.current();
        return;
      }
      if (evento.key !== "Tab") return;
      evento.preventDefault();
      cerrar.current?.focus();
    }
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("keydown", tecla);
      document.body.style.overflow = anterior;
    };
  }, []);

  return (
    <div className="hyto-photo-amplia" role="dialog" aria-modal="true" aria-labelledby={titulo} onClick={() => alCerrar.current()}>
      <div className="hyto-photo-amplia-columna" onClick={(evento) => evento.stopPropagation()}>
        <h2 id={titulo} className="sr-only">
          {t("revision.viewLarger", { titulo: alt })}
        </h2>
        <button ref={cerrar} type="button" className="hyto-btn-line is-inline" onClick={() => alCerrar.current()}>
          {t("revision.closePhoto")}
        </button>
        <div className="hyto-photo-amplia-marco">
          {rota ? (
            <p className="hyto-photo-nota" role="alert">
              {t("revision.photoBroken")}
            </p>
          ) : (
            <>
              {lista ? null : (
                <p className="hyto-photo-nota" role="status">
                  <span className="hyto-spinner" aria-hidden="true" />
                  <span>{t("revision.loadingPhoto")}</span>
                </p>
              )}
              <img
                ref={imagen}
                src={src}
                alt={alt}
                onLoad={() => setLista(true)}
                onError={() => {
                  fallo.current = true;
                  setRota(true);
                }}
                style={lista ? undefined : { opacity: 0 }}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function MontoCabecera({
  tarea,
}: {
  tarea: Pick<TareaAdmin, "tipo" | "monto" | "tope" | "montoConfirmado" | "montoRevisado">;
}) {
  const t = useTexto();
  const idioma = useIdioma();
  const vista = vistaMonto(tarea, idioma);
  if (vista.pago && vista.tope) {
    return (
      <>
        <span className="pj-precio">
          <span className="sr-only">{t("revision.amountToPay")} </span>
          {vista.pago}
        </span>
        <span className="text-sm text-[var(--suave)]">{t("eventos.limit", { amount: vista.tope })}</span>
      </>
    );
  }
  return <span className="pj-precio">{vista.tope ? t("eventos.limit", { amount: vista.tope }) : vista.linea}</span>;
}
