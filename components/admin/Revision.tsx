"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AccionesRevisionFallida } from "@/components/admin/RevisionFallida";
import { FichaVoluntario } from "@/components/perfil/Ficha";
import { BotonPrincipal } from "@/components/integrante/BotonPrincipal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
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
  botonesRevision,
  cargarDetalleOrganizador,
  confirmarMonto,
  leerFondeo,
  montoDeVista,
  pagoPendiente,
  type DetalleRevision,
} from "@/lib/admin/remoto";
import { consultarHasta, type EstadoConsulta } from "@/lib/admin/consulta-escrow";
import { mismaTareaAdmin } from "@/lib/admin/novedades";
import { reintentoFondoEnCurso } from "@/lib/admin/reintento-fondo";
import { centavos, detalleMonto, enlaceCredencial, enlacePago, etiquetaOrigen, notaCopia, notaManual, normalizarMonto, sinVeredicto, vistaAdmin } from "@/lib/admin/vista";
import { esTipoDocumento } from "@/lib/evidencia/tipo";
import { AVISO_MONTO_INVALIDO, montoDentroDelTope } from "@/lib/escrow/monto";
import {
  AVISO_FIRMA,
  AVISO_REINGRESO,
  ErrorFirmaCliente,
  firmarPasos,
  mensajeFirmaVisible,
  pasosDesde,
  type AccionCliente,
  type PagoFirmado,
} from "@/lib/escrow/firmarCliente";
import { acortarDireccion, formatearFecha, formatearMonto, montoAsegurado, montoDeTarea } from "@/lib/integrante/formato";
import { puntosDeCondicion } from "@/lib/integrante/puntos";
import { cuerpoPedirOtra } from "@/lib/integrante/revision";
import { useClaro, useIdioma, useTexto } from "@/components/ui/Idioma";
import { cajaDeFallo, detalleFallo, frasePaso, mensajeClaro, pasosDePago, tituloFallo } from "@/lib/ui/claro";
import { etiquetaTipo, textoVisible } from "@/lib/ui/etiquetas";
import type { TareaAdmin } from "@/lib/admin/tipos";

export function Revision({
  tareaId,
  eventoId,
  firmar,
}: {
  tareaId: string;
  eventoId?: string;
  firmar?: (unsignedXdr: string) => Promise<string>;
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
    setTarea(undefined);
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
    if (fondeoForzado.current === contrato) {
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
      return;
    }
    publicarAviso(null);
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

  async function correr(acciones: readonly AccionCliente[], senal?: AbortSignal) {
    if (paso || !tarea) return;
    if (!wallet) {
      publicarAviso(AVISO_REINGRESO);
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
      if (actual === "marcar" || actual === "aprobar" || actual === "liberar") setReanudar(actual);
      if (error instanceof ErrorFirmaCliente && error.contrato) contratoParcial = error.contrato;
      const codigo = error instanceof ErrorFirmaCliente ? error.codigo : null;
      publicarAviso(mensajeClaro(mensajeFirmaVisible(error instanceof ErrorFirmaCliente ? error.message : AVISO_FIRMA)), {
        paso: actual,
        codigo,
      });
    } finally {
      setPaso(null);
      if (!pago && contratoParcial) setContrato(contratoParcial);
      if (!pago && contratoParcial && acciones.includes("fondear")) setFondeado(false);
      const fresco = await cargarDetalleOrganizador(tareaId);
      const contratoConocido = fresco?.contratoEscrow ?? pago?.contrato ?? contratoParcial;
      if (contratoConocido) setContrato(contratoConocido);
      if (!pago && acciones.includes("fondear") && contratoConocido) setFondeado(false);
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

  const botones = botonesRevision(tarea, real, { contrato, fondeado });
  const esperaConfirmacion =
    real && tarea.tipo === "reembolso" && !contrato && tarea.estado !== "pagado" && montoDeVista(tarea) === null;
  const topePago = normalizarMonto(tarea.tope ?? "") ?? normalizarMonto(tarea.monto);
  const sobreTope = Boolean(topePago && tarea.montoRevisado && centavos(tarea.montoRevisado) > centavos(topePago));
  const borradorNormal = normalizarMonto(borrador);
  const coincide = Boolean(tarea.montoConfirmado && borradorNormal && tarea.montoConfirmado === borradorNormal);
  const puedeDesplegar = botones.desplegar && (tarea.tipo !== "reembolso" || coincide);
  const origen = etiquetaOrigen(tarea.origen, idioma);
  const pago = enlacePago(tarea.hashPago);
  const pendiente = pagoPendiente(tarea);
  const transaccion = hashPaso && hashPaso !== tarea.hashPago ? enlacePago(hashPaso) : null;
  const credencial = enlaceCredencial(tarea.credencialUrl);
  const ocupado = paso !== null;
  const caja = cajaDeFallo({ paso: falloPaso, codigo: falloCodigo });
  const avisoVisible = aviso ? claro(aviso) : null;
  const datosConfirmacion = (clave: "bloquear" | "fondear" | "pagar") => {
    const cifra = montoDeVista(tarea);
    const monto = cifra === null ? undefined : cifra.toFixed(2);
    if (clave === "pagar")
      return {
        titulo: t("confirmar.payTitle"),
        monto,
        destinatario: tarea.miembro ? { nombre: tarea.miembro } : undefined,
        detalle: t("confirmar.payDetail"),
        irreversible: true,
        confirmar: t("confirmar.payAction", { monto: monto ?? "" }),
        onConfirmar: (senal: AbortSignal) => correr(pasosDesde(reanudar), senal),
      };
    return {
      titulo: t(clave === "bloquear" ? "confirmar.lockTitle" : "confirmar.finishTitle"),
      monto,
      detalle: t(clave === "bloquear" ? "confirmar.lockDetail" : "confirmar.finishDetail"),
      confirmar: t("confirmar.lockAction", { monto: monto ?? "" }),
      onConfirmar: (senal: AbortSignal) => correr(clave === "bloquear" ? ["desplegar", "fondear"] : ["fondear"], senal),
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
          <p className="hyto-amount text-2xl">{montoDeTarea(tarea, idioma)}</p>
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
                      ? t(tarea.lectura.fuente ? "revision.printedConvertedSource" : "revision.printedConverted", {
                          monto: tarea.lectura.montoOriginal,
                          tasa: String(tarea.lectura.tasa),
                          moneda: tarea.lectura.moneda,
                          fuente:
                            tarea.lectura.fuente === "hacienda"
                              ? tarea.lectura.fechaTasa
                                ? t("revision.rateHacienda", { fecha: tarea.lectura.fechaTasa })
                                : t("revision.rateHaciendaSinFecha")
                              : t("revision.rateFallback"),
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
            {modoDemo && (esperaConfirmacion || puedeDesplegar || botones.fondear || botones.pagar) ? (
              <p className="text-sm leading-6 text-[var(--suave)]">{t("revision.demoNoMoney")}</p>
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

            {puedeDesplegar || esperaConfirmacion ? (
              <>
                <p className="text-sm leading-6 text-[var(--suave)]">
                  {t("revision.setsAside", { monto: montoDeTarea(tarea, idioma) })}
                </p>
                {esperaConfirmacion && !puedeDesplegar ? (
                  <p id="bloqueo-monto" className="text-sm leading-6 text-[var(--suave)]">
                    {t("revision.lockNeedsAmount")}
                  </p>
                ) : null}
                <BotonPrincipal
                  type="button"
                  disabled={ocupado || !puedeDesplegar || modoDemo}
                  aria-busy={ocupado}
                  aria-describedby={esperaConfirmacion && !puedeDesplegar ? "bloqueo-monto" : undefined}
                  onClick={() => setConfirmacion({ clave: "bloquear", abierto: true })}
                >
                  {paso === "desplegar" || paso === "fondear" ? etiquetaPaso(paso) : t("pago.lockBudget")}
                </BotonPrincipal>
              </>
            ) : null}
            {botones.fondear ? (
              <>
                <p className="text-sm leading-6 text-[var(--suave)]">{t("revision.oneMore")}</p>
                <BotonPrincipal type="button" disabled={ocupado || modoDemo} aria-busy={ocupado} onClick={() => setConfirmacion({ clave: "fondear", abierto: true })}>
                  {paso === "fondear" ? etiquetaPaso("fondear") : t("pago.finishLocking")}
                </BotonPrincipal>
              </>
            ) : null}
            {botones.pagar ? (
              <>
                {fondeado === true ? (
                  <p className="text-sm leading-6 text-[var(--suave)]">{t("revision.secured", { monto: montoAsegurado(tarea, idioma) })}</p>
                ) : null}
                <BotonPrincipal type="button" disabled={ocupado || modoDemo} aria-busy={ocupado} onClick={() => setConfirmacion({ clave: "pagar", abierto: true })}>
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

          {avisoVisible ? <AvisoFirma mensaje={aviso ?? ""} className="mt-4 text-sm leading-6 text-[var(--suave)]" /> : null}

          {real && pendiente ? (
            <div className="mt-4" aria-live="polite">
              <p className="text-sm leading-6 text-[var(--suave)]">
                {consultaPago === "agotada" ? t("revision.paymentStillPending") : t("revision.paymentSent")}{" "}
                {pago ? (
                  <a href={pago} className="font-semibold underline-offset-4 hover:underline">
                    {t("pago.viewChain")}
                  </a>
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
                  {t("pago.checkAgain")}
                </button>
              ) : null}
            </div>
          ) : null}

          {transaccion ? (
            <a href={transaccion} className="hyto-btn-line is-inline mt-4 px-5">
              {t("pago.viewChain")}
            </a>
          ) : null}

          {real && (wallet || contrato) ? (
            <details className="mt-6 text-sm text-[var(--suave)]">
              <summary className="cursor-pointer">{t("revision.technical")}</summary>
              {wallet ? <p className="mt-2 font-mono">{t("revision.yourAccount", { direccion: acortarDireccion(wallet) })}</p> : null}
              {contrato ? <p className="mt-2 font-mono">{t("revision.budgetRef", { direccion: acortarDireccion(contrato) })}</p> : null}
            </details>
          ) : null}

          {tarea.estado === "pagado" ? (
            <div className="mt-8 space-y-3">
              <p className="text-lg font-medium">{t("revision.paidAmount", { monto: formatearMonto(detalleMonto(tarea).cifra, idioma) })}</p>
              {pago ? (
                <a href={pago} className="hyto-btn-line is-inline px-5">
                  {t("pago.viewChain")}
                </a>
              ) : (
                <p className="text-sm leading-6 text-[var(--suave)]">
                  {real ? t("revision.paidWait") : t("revision.samplePay")}
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

function FotoEvidencia({ src, alt }: { src: string; alt: string }) {
  const t = useTexto();
  const [lista, setLista] = useState(false);
  const [rota, setRota] = useState(false);

  useEffect(() => {
    setLista(false);
    setRota(false);
  }, [src]);

  if (rota) {
    return (
      <div className="hyto-photo-nota">
        <p>{t("revision.photoBroken")}</p>
      </div>
    );
  }

  return (
    <>
      {lista ? null : (
        <div className="hyto-photo-nota" role="status">
          <span className="hyto-spinner" aria-hidden="true" />
          <span className="sr-only">{t("revision.loadingPhoto")}</span>
        </div>
      )}
      <img
        src={src}
        alt={alt}
        onLoad={() => setLista(true)}
        onError={() => setRota(true)}
        style={lista ? undefined : { opacity: 0 }}
      />
    </>
  );
}
