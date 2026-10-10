"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AccionesRevisionFallida } from "@/components/admin/RevisionFallida";
import { FichaVoluntario } from "@/components/perfil/Ficha";
import { BotonPrincipal } from "@/components/integrante/BotonPrincipal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EnlaceExplorador } from "@/components/ui/EnlaceExplorador";
import { PastillaEstado } from "@/components/integrante/EstadoTarea";
import { EtiquetasNota, MotivoNota } from "@/components/admin/EtiquetasNota";
import { IndicadorActualizado } from "@/components/admin/IndicadorActualizado";
import { PastillaVeredicto } from "@/components/admin/PastillaVeredicto";
import { useNovedadesEvento } from "@/components/admin/usarNovedades";
import { AvisoFirma } from "@/components/sesion/AvisoFirma";
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
  AVISO_REINGRESO,
  AVISO_SIN_CUENTA_FIRMA,
  ErrorFirmaCliente,
  firmarPasos,
  mensajeFirmaVisible,
  pasosDesde,
  type AccionCliente,
  type PagoFirmado,
} from "@/lib/escrow/firmarCliente";
import { acortarDireccion, explicarPago, formatearFecha, formatearMonto, montoAsegurado, montoQueAparta, textosSaldo, vistaMonto } from "@/lib/integrante/formato";
import { puntosDeCondicion } from "@/lib/integrante/puntos";
import { cuerpoPedirOtra } from "@/lib/integrante/revision";
import { AVISO_ENVIO_FALLIDO } from "@/lib/integrante/rutas";
import { useClaro, useIdioma, useTexto } from "@/components/ui/Idioma";
import { cajaDeFallo, detalleFallo, frasePaso, mensajeClaro, pasosDePago, tituloFallo } from "@/lib/ui/claro";
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
}: {
  tareaId: string;
  eventoId?: string;
  firmar?: (unsignedXdr: string) => Promise<string>;
  saldo?: string | null;
}) {
  const modoDemo = useModoDemo();
  const t = useTexto();
  const claro = useClaro();
  const idioma = useIdioma();
  const [tarea, setTarea] = useState<TareaAdmin | null | undefined>(undefined);
  const [foto, setFoto] = useState<string | null>(null);
  const [real, setReal] = useState(false);
  const [paso, setPaso] = useState<AccionCliente | null>(null);
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
  async function correrDemo(accion: "bloquear" | "pagar", senal: AbortSignal) {
    if (paso || !tarea) return;
    publicarAviso(null);
    const pasos: AccionCliente[] = accion === "bloquear" ? ["desplegar", "fondear"] : ["marcar", "aprobar", "liberar"];
    let resultado: Awaited<ReturnType<typeof accionDemo>> | null = null;
    try {
      for (const actual of pasos) {
        if (senal.aborted) return;
        setPaso(actual);
        await new Promise((listo) => setTimeout(listo, pausaPasoDemo()));
      }
      if (senal.aborted) return;
      resultado = await accionDemo(tareaId, accion);
      if (!resultado.ok) {
        publicarAviso(resultado.aviso);
        return;
      }
      if (resultado.contrato) {
        fondeoForzado.current = resultado.contrato;
        setContrato(resultado.contrato);
        setFondeado(true);
      }
    } finally {
      setPaso(null);
      if (resultado?.ok) {
        const fresco = await cargarDetalleOrganizador(tareaId);
        if (fresco) aplicarDetalle(fresco);
        else if (accion === "pagar") setTarea((actual) => (actual ? { ...actual, estado: "pagado" } : actual));
      }
    }
  }

  async function correr(acciones: readonly AccionCliente[], senal?: AbortSignal) {
    if (paso || !tarea) return;
    if (!wallet) {
      publicarAviso(AVISO_SIN_CUENTA_FIRMA);
      return;
    }
    if (acciones[0] !== "desplegar" && !contrato) {
      publicarAviso("Lock the budget before you pay.");
      return;
    }
    publicarAviso(null);
    let actual: AccionCliente | null = null;
    let pago: PagoFirmado | null = null;
    let contratoParcial: string | null = null;
    let yaEnRed = false;
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
        publicarAviso(mensajeClaro(mensajeFirmaVisible(error instanceof ErrorFirmaCliente ? error.message : AVISO_FIRMA)), {
          paso: actual,
          codigo,
        });
      }
    } finally {
      setPaso(null);
      if (!yaEnRed && !pago && contratoParcial) setContrato(contratoParcial);
      if (!yaEnRed && !pago && contratoParcial && acciones.includes("fondear")) setFondeado(false);
      const fresco = await cargarDetalleOrganizador(tareaId);
      const contratoConocido = fresco?.contratoEscrow ?? pago?.contrato ?? contratoParcial;
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
  const datosConfirmacion = (clave: "bloquear" | "fondear" | "pagar") => {
    const cifra = montoDeVista(tarea);
    const monto = cifra === null ? undefined : formatearMonto(cifra.toString(), idioma);
    if (clave === "pagar")
      return {
        titulo: t("confirmar.payTitle"),
        monto,
        destinatario: tarea.miembro ? { nombre: tarea.miembro } : undefined,
        detalle: t("confirmar.payDetail"),
        irreversible: true,
        confirmar: t("confirmar.payAction", { monto: monto ?? "" }),
        onConfirmar: (senal: AbortSignal) => (demoReal ? correrDemo("pagar", senal) : correr(pasosDesde(reanudar), senal)),
      };
    return {
      titulo: t(clave === "bloquear" ? "confirmar.lockTitle" : "confirmar.finishTitle"),
      monto,
      detalle: t(clave === "bloquear" ? "confirmar.lockDetail" : "confirmar.finishDetail"),
      confirmar: t("confirmar.lockAction", { monto: monto ?? "" }),
      onConfirmar: (senal: AbortSignal) =>
        demoReal && clave === "bloquear" ? correrDemo("bloquear", senal) : correr(clave === "bloquear" ? ["desplegar", "fondear"] : ["fondear"], senal),
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

  return (
    <main className="hyto-page">
      <p className="hyto-crumb print:hidden">
        <Link href={eventoId ? `/eventos/${eventoId}` : "/eventos"}>{t("nav.events")}</Link>
        <span aria-hidden="true">/</span>
        <span>{t("revision.crumb")}</span>
      </p>
      <header className="hyto-page-head">
        <div>
          <h1 className="hyto-title">{textoVisible(tarea.titulo, idioma)}</h1>
          <p className="hyto-sub">
            {etiquetaTipo(tarea.tipo, idioma)} · {textoVisible(tarea.miembro, idioma)}
          </p>
          {tarea.perfilVoluntario ? <FichaVoluntario ficha={tarea.perfilVoluntario} /> : null}
          <IndicadorActualizado activo={real && Boolean(eventoId)} visible={reciente} />
        </div>
        <div className="text-right">
          <MontoCabecera tarea={tarea} />
        </div>
      </header>
      {sesionVencida ? <AvisoSesion /> : null}
      <div className="hyto-review">
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

        <section className="hyto-panel">
          {tarea.condicion ? (
            <>
              <p className="text-sm font-medium">{t("bandeja.photoMust")}</p>
              <p className="mt-2 text-sm leading-6 text-[var(--suave)]">{textoVisible(tarea.condicion, idioma)}</p>
            </>
          ) : null}
          {real ? (
            <ol className="mt-5 space-y-2 text-sm" aria-label={t("revision.steps")}>
              {pasosDePago({
                tieneVeredicto: Boolean(tarea.veredicto),
                revisionFallida: tarea.origen === "error",
                presupuestoListo: Boolean(contrato) && fondeado === true,
                pagado: tarea.estado === "pagado",
              }, idioma).map((item, indice) => (
                <li key={item.nombre} className={item.estado === "now" ? "font-semibold" : "text-[var(--suave)]"}>
                  {item.estado === "done" ? t("comunes.done") : item.estado === "now" ? t("comunes.now") : t("comunes.later")} · {indice + 1}. {item.nombre}
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-5 text-sm leading-6 text-[var(--suave)]">{t("revision.sampleReview")}</p>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            {tarea.veredicto ? <PastillaVeredicto veredicto={tarea.veredicto} nota={tarea.nota} /> : <PastillaEstado estado={tarea.estado} />}
            {tarea.veredicto ? <MotivoNota etiquetas={tarea.etiquetas} /> : null}
            {origen ? <span className="text-sm text-[var(--suave)]">{origen}</span> : null}
          </div>
          <EtiquetasNota etiquetas={tarea.etiquetas} />
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
            <p className="mt-4 text-base leading-7">{textoVisible(tarea.frase, idioma)}</p>
          ) : null}
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
              <p className="mt-1 text-sm">{detalleFallo(caja, avisoVisible ?? "", idioma)}</p>
            </div>
          ) : null}

          <div className="hyto-actions">
            {demoReal && (botones.desplegar || botones.pagar) ? (
              <p className="text-sm leading-6 text-[var(--suave)]">{t("revision.demoNote")}</p>
            ) : null}
            {botones.aprobarLocal ? (
              <BotonPrincipal type="button" onClick={() => decidir("pagado")}>
                {t("revision.approve")}
              </BotonPrincipal>
            ) : null}

            {botones.pedirOtra ? (
              <button type="button" onClick={abrirPedir} className="hyto-btn-line">
                {t("revision.askAnother")}
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

            {pidioOtra ? (
              <p id="bloqueo-foto" role="status" className="hyto-pedir-listo">
                {t("revision.askedSent")}
              </p>
            ) : null}

            {puedeDesplegar || esperaConfirmacion ? (
              <>
                <p className="text-sm leading-6 text-[var(--suave)]">
                  {t("revision.setsAside", { monto: montoQueAparta(tarea, idioma) })}
                </p>
                {esperaOtraFoto && !pidioOtra ? (
                  <p id="bloqueo-foto" className="text-sm leading-6 text-[var(--suave)]">
                    {t("revision.lockWaitingPhoto")}
                  </p>
                ) : null}
                {esperaConfirmacion && !puedeDesplegar ? (
                  <p id="bloqueo-monto" className="text-sm leading-6 text-[var(--suave)]">
                    {t("revision.lockNeedsAmount")}
                  </p>
                ) : null}
                {faltaSaldo ? (
                  <p id="bloqueo-saldo" role="alert" className="text-sm leading-6 text-[var(--suave)]">
                    {t("errores.saldoNoCubre", textosSaldo(faltaSaldo, idioma))}
                  </p>
                ) : null}
                <BotonPrincipal
                  type="button"
                  disabled={ocupado || !puedeDesplegar || esperaOtraFoto || Boolean(faltaSaldo)}
                  aria-busy={ocupado}
                  aria-describedby={describeBloqueo || undefined}
                  onClick={() => {
                    if (ocupado || !puedeDesplegar || esperaOtraFoto || faltaSaldo) return;
                    setConfirmacion({ clave: "bloquear", abierto: true });
                  }}
                >
                  {paso === "desplegar" || paso === "fondear" ? etiquetaPaso(paso) : t("pago.lockBudget")}
                </BotonPrincipal>
              </>
            ) : null}
            {botones.fondear ? (
              <>
                <p className="text-sm leading-6 text-[var(--suave)]">{t("revision.oneMore")}</p>
                {faltaSaldo ? (
                  <p id="bloqueo-saldo" role="alert" className="text-sm leading-6 text-[var(--suave)]">
                    {t("errores.saldoNoCubre", textosSaldo(faltaSaldo, idioma))}
                  </p>
                ) : null}
                <BotonPrincipal
                  type="button"
                  disabled={ocupado || Boolean(faltaSaldo)}
                  aria-busy={ocupado}
                  aria-describedby={faltaSaldo ? "bloqueo-saldo" : undefined}
                  onClick={() => {
                    if (ocupado || faltaSaldo) return;
                    setConfirmacion({ clave: "fondear", abierto: true });
                  }}
                >
                  {paso === "fondear" ? etiquetaPaso("fondear") : t("pago.finishLocking")}
                </BotonPrincipal>
              </>
            ) : null}
            {botones.pagar ? (
              <>
                {fondeado === true ? (
                  <p className="text-sm leading-6 text-[var(--suave)]">{t("revision.secured", { monto: montoAsegurado(tarea, idioma) })}</p>
                ) : null}
                <BotonPrincipal type="button" disabled={ocupado} aria-busy={ocupado} onClick={() => setConfirmacion({ clave: "pagar", abierto: true })}>
                  {paso === "marcar" || paso === "aprobar" || paso === "liberar" ? etiquetaPaso(paso) : t("pago.approvePay")}
                </BotonPrincipal>
              </>
            ) : null}
          </div>

          {confirmacion ? (
            <ConfirmDialog
              abierto={confirmacion.abierto}
              onCerrar={() => setConfirmacion((actual) => (actual ? { ...actual, abierto: false } : actual))}
              {...datosConfirmacion(confirmacion.clave)}
            />
          ) : null}

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
        <p className="text-sm text-[var(--suave)]">{t("revision.amountToPay")}</p>
        <p className="hyto-amount text-2xl">{vista.pago}</p>
        <p className="mt-1 text-sm text-[var(--suave)]">{t("eventos.limit", { amount: vista.tope })}</p>
      </>
    );
  }
  return (
    <p className="hyto-amount text-2xl">
      {vista.tope ? t("eventos.limit", { amount: vista.tope }) : vista.linea}
    </p>
  );
}
