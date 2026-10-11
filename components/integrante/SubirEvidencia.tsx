"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BotonPrincipal } from "@/components/integrante/BotonPrincipal";
import { Checklist } from "@/components/integrante/evidencia/Checklist";
import { LineaRevision } from "@/components/integrante/evidencia/LineaRevision";
import { MiniaturaEvidencia } from "@/components/integrante/evidencia/MiniaturaEvidencia";
import { ResumenResultado } from "@/components/integrante/evidencia/ResumenResultado";
import { PanelMile } from "@/components/integrante/evidencia/PanelMile";
import { ActividadTarea } from "@/components/integrante/ActividadTarea";
import { MomentoLaTengo } from "@/components/integrante/evidencia/MomentoLaTengo";
import { PantallaPagada } from "@/components/integrante/evidencia/PantallaPagada";
import { PantallaRechazada } from "@/components/integrante/evidencia/PantallaRechazada";
import { useModoDemo } from "@/components/sesion/InsigniaDemo";
import { useClaro, useIdioma, useTexto } from "@/components/ui/Idioma";
import { MileAnimada } from "@/components/ui/MileAnimada";
import { errorSinCamara, listaSinCamara } from "@/lib/integrante/camaraDispositivo";
import { codigoTelefono } from "@/lib/integrante/codigoTelefono";
import { leerMemoria } from "@/lib/integrante/almacen";
import { ORIGEN_ARCHIVO, archivoDeCamaraReciente, esFotoDeCamara } from "@/lib/integrante/fotoEnVivo";
import { ACCEPT_RECIBO, archivoReciboPermitido, esDocumentoDeclarado, esMimeDocumental } from "@/lib/evidencia/tipo";
import { avisoArchivo, evaluarArchivo } from "@/lib/evidencia/validar";
import { formatearFecha, formatearHora, formatearMonto, montoDeTarea, montosDeCobro, vistaMonto } from "@/lib/integrante/formato";
import { notaDeTarea } from "@/lib/integrante/nota";
import { estaRechazada, puntosFallidos } from "@/lib/integrante/revision";
import { puntosDeCondicion } from "@/lib/integrante/puntos";
import { esperaRevision, INTERVALO_SEGUIMIENTO_MS, mostrarReintento, seguirConsultando, topeSeguimientoMs } from "@/lib/integrante/seguimiento";
import { nombreEnIdioma } from "@/lib/sesion/nombre";
import { textoVisible } from "@/lib/ui/etiquetas";
import { ContextoEvento } from "./ContextoEvento";

type ProyectoLista = { id: string; nombre: string; descripcion?: string | null; portada?: boolean };
import { ErrorDeEnvio, ErrorDeSesion, leerTarea, pedirTokenEvidencia, subirEvidencia } from "@/lib/integrante/rutas";
import type { Evidencia, Tarea } from "@/lib/integrante/tipos";

type Fase = "cargando" | "inicio" | "camara" | "foto" | "enviando" | "lista" | "faltante";

export function SubirEvidencia({ tareaId, nombre = null }: { tareaId: string; nombre?: string | null }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const archivoRef = useRef<HTMLInputElement>(null);
  const capturaRef = useRef<HTMLInputElement>(null);
  const fotoUrlRef = useRef<string | null>(null);
  const montadoRef = useRef(true);
  const enviandoRef = useRef(false);
  const [fase, setFase] = useState<Fase>("cargando");
  const [tarea, setTarea] = useState<Tarea | null>(null);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [foto, setFoto] = useState<Blob | null>(null);
  const [evidencia, setEvidencia] = useState<Evidencia | null>(null);
  const [ejemplo, setEjemplo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avisoEnvio, setAvisoEnvio] = useState<string | null>(null);
  const [conCaptura, setConCaptura] = useState(false);
  const [sinCamara, setSinCamara] = useState(false);
  const [capturadaEn, setCapturadaEn] = useState<string | null>(null);
  const [nombreArchivo, setNombreArchivo] = useState<string | null>(null);
  const [cargaError, setCargaError] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);
  const [evento, setEvento] = useState<string | null>(null);
  const [contextoEvento, setContextoEvento] = useState<{ descripcion: string | null; portada: boolean }>({ descripcion: null, portada: false });
  const [esperaAgotada, setEsperaAgotada] = useState(false);
  const [esperaLocal, setEsperaLocal] = useState(false);
  const [enviadaEn, setEnviadaEn] = useState<Date | null>(null);
  const [archivoRechazado, setArchivoRechazado] = useState(false);
  const [reintentando, setReintentando] = useState(false);
  /** True for a file picked or dropped (origen=archivo, no camera token). False for a live camera capture. */
  const [desdeArchivo, setDesdeArchivo] = useState(false);
  const [arrastrando, setArrastrando] = useState(false);
  const demo = useModoDemo();
  const t = useTexto();
  const claro = useClaro();
  const idioma = useIdioma();

  useEffect(() => {
    let activo = true;
    const memoria = leerMemoria();
    setCargaError(null);
    setReintentando(false);
    leerTarea(tareaId, { miembroId: "" }, { estados: demo ? memoria.estados : undefined, muestra: demo }).then((resultado) => {
      if (!activo) return;
      if (resultado.error) {
        setCargaError(resultado.error);
        setFase("faltante");
        return;
      }
      if (!resultado.tarea) {
        setFase("faltante");
        return;
      }
      setTarea(resultado.tarea);
      if (resultado.tarea.evento) setEvento(resultado.tarea.evento);
      setEjemplo(resultado.ejemplo);
      const guardada = memoria.evidencias[resultado.tarea.id];
      if (resultado.tarea.estado !== "pendiente") {
        if (guardada) setEvidencia(guardada);
        setFase("lista");
        return;
      }
      setFase("inicio");
    }).catch(() => {
      if (!activo) return;
      setFase("faltante");
    });
    return () => {
      activo = false;
    };
  }, [tareaId, demo, intento]);

  useEffect(() => {
    const proyectoId = tarea?.proyectoId;
    if (!proyectoId) return;
    let activo = true;
    fetch("/api/proyectos")
      .then((respuesta) => (respuesta.ok ? respuesta.json() : null))
      .then((cuerpo: { proyectos?: ProyectoLista[]; proyecto?: ProyectoLista } | null) => {
        if (!activo || !cuerpo) return;
        const lista = cuerpo.proyectos ?? (cuerpo.proyecto ? [cuerpo.proyecto] : []);
        const encontrado = lista.find((item) => item.id === proyectoId);
        setEvento(encontrado?.nombre ?? null);
        setContextoEvento({ descripcion: encontrado?.descripcion ?? null, portada: Boolean(encontrado?.portada) });
      })
      .catch(() => undefined);
    return () => {
      activo = false;
    };
  }, [tarea?.proyectoId]);

  useEffect(() => {
    montadoRef.current = true;
    const medios = navigator.mediaDevices;
    if (!medios?.getUserMedia) {
      setConCaptura(true);
      return () => {
        montadoRef.current = false;
        streamRef.current?.getTracks().forEach((pista) => pista.stop());
        streamRef.current = null;
        if (fotoUrlRef.current) URL.revokeObjectURL(fotoUrlRef.current);
      };
    }
    let vivo = true;
    if (medios.enumerateDevices) {
      medios
        .enumerateDevices()
        .then((lista) => {
          if (vivo && listaSinCamara(lista)) setSinCamara(true);
        })
        .catch(() => undefined);
    }
    return () => {
      vivo = false;
      montadoRef.current = false;
      streamRef.current?.getTracks().forEach((pista) => pista.stop());
      streamRef.current = null;
      if (fotoUrlRef.current) URL.revokeObjectURL(fotoUrlRef.current);
    };
  }, []);

  useEffect(() => {
    if (fase !== "camara" || !videoRef.current || !streamRef.current) return;
    const video = videoRef.current;
    video.srcObject = streamRef.current;
    let vivo = true;
    void video.play().catch(() => {
      if (vivo) setError("Could not show the camera.");
    });
    return () => {
      vivo = false;
    };
  }, [fase]);

  // The review runs after the upload. Ask again every 3 s while the grade is missing,
  // including after the retry message, so a late verdict can still replace it.
  // A failure already stored is not "still checking".
  const vigilar = fase === "lista" && tarea != null && !ejemplo && !avisoEnvio && esperaRevision(tarea);
  const reintentoMile = tarea != null && !avisoEnvio && mostrarReintento(tarea, { esperaLocal, esperaAgotada });
  const esperando = vigilar && !reintentoMile;
  useEffect(() => {
    if (!vigilar) return;
    let activo = true;
    const inicio = Date.now();
    const tope = topeSeguimientoMs(esperaLocal ? null : tarea?.enviadaEn, inicio, esperaLocal);
    const cerrar = () => {
      if (activo) setEsperaAgotada(true);
    };
    if (tope <= 0) cerrar();
    const referencia = { estado: "en revisión", nota: null } as const;
    const id = setInterval(() => {
      void leerTarea(tareaId, { miembroId: "" }, { muestra: demo })
        .catch(() => null)
        .then((fresco) => {
          if (!activo) return;
          const actual = fresco?.tarea && !fresco.ejemplo ? fresco.tarea : null;
          if (actual) setTarea(actual);
          const transcurrido = Date.now() - inicio;
          if (transcurrido >= tope || !seguirConsultando(referencia, actual ?? referencia, transcurrido)) cerrar();
        });
    }, INTERVALO_SEGUIMIENTO_MS);
    const corte = setTimeout(cerrar, tope);
    return () => {
      activo = false;
      clearInterval(id);
      clearTimeout(corte);
    };
  }, [vigilar, tareaId, demo, esperaLocal, tarea?.enviadaEn]);

  function usarFoto(blob: Blob, nombre: string | null, captura: string | null, archivo = false) {
    if (fotoUrlRef.current) URL.revokeObjectURL(fotoUrlRef.current);
    const url = URL.createObjectURL(blob);
    fotoUrlRef.current = url;
    setFotoUrl(url);
    setFoto(blob);
    setNombreArchivo(nombre);
    setCapturadaEn(captura);
    setDesdeArchivo(archivo);
    setError(null);
    setArchivoRechazado(false);
    streamRef.current?.getTracks().forEach((pista) => pista.stop());
    streamRef.current = null;
    setFase("foto");
  }

  async function abrirCamara() {
    if (!tarea) return;
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      capturaRef.current?.click();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: "environment" } },
      });
      if (!montadoRef.current) {
        stream.getTracks().forEach((pista) => pista.stop());
        return;
      }
      streamRef.current = stream;
      setFase("camara");
    } catch (error) {
      if (errorSinCamara(error)) {
        setSinCamara(true);
        setError(null);
        return;
      }
      setError(t("evidencia.noCamera"));
    }
  }

  async function seguirEnTelefono() {
    const id = tarea?.id ?? tareaId;
    const codigo = codigoTelefono(id);
    const url = `${window.location.origin}/tareas/${encodeURIComponent(id)}`;
    try {
      await navigator.clipboard?.writeText(`${codigo}\n${url}`);
    } catch {
      // The code stays on the screen either way.
    }
  }

  function tomarFoto() {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      setError("The camera is not ready yet.");
      return;
    }
    const lienzo = document.createElement("canvas");
    lienzo.width = video.videoWidth;
    lienzo.height = video.videoHeight;
    const contexto = lienzo.getContext("2d");
    if (!contexto) {
      setError("Could not take the photo.");
      return;
    }
    contexto.drawImage(video, 0, 0);
    lienzo.toBlob(
      (blob) => {
        void (async () => {
          if (!blob) {
            setError("Could not take the photo.");
            return;
          }
          const validado = await evaluarArchivo(blob, { soloJpeg: true });
          if (!validado.ok) {
            setError(avisoArchivo(validado.motivo));
            return;
          }
          usarFoto(blob, null, new Date().toISOString());
        })();
      },
      "image/jpeg",
      0.9,
    );
  }

  function limpiarFoto() {
    if (fotoUrlRef.current) URL.revokeObjectURL(fotoUrlRef.current);
    fotoUrlRef.current = null;
    setFotoUrl(null);
    setFoto(null);
    setNombreArchivo(null);
    setCapturadaEn(null);
    setDesdeArchivo(false);
  }

  function rechazarSeleccion(aviso: string, bloquearEnvio: boolean) {
    limpiarFoto();
    setArchivoRechazado(bloquearEnvio);
    setError(aviso);
    setFase("inicio");
  }

  function prepararRevision(bloquearEnvio: boolean) {
    limpiarFoto();
    setArchivoRechazado(bloquearEnvio);
    setError(null);
    setFase("inicio");
  }

  async function aceptarArchivo(archivo: File) {
    if (!archivoPermitido(archivo)) {
      rechazarSeleccion("Choose a PDF, HTML, text, JPEG, PNG, or WebP file.", true);
      return;
    }
    prepararRevision(true);
    const validado = await evaluarArchivo(archivo);
    if (!validado.ok) {
      rechazarSeleccion(avisoArchivo(validado.motivo), true);
      return;
    }
    usarFoto(archivo, archivo.name || null, null, true);
  }

  function archivoPermitido(archivo: File): boolean {
    return archivoReciboPermitido(archivo.type, archivo.name);
  }

  function elegirArchivo(evento: React.ChangeEvent<HTMLInputElement>) {
    const archivo = evento.target.files?.[0];
    evento.target.value = "";
    if (!archivo || !tarea) return;
    void aceptarArchivo(archivo);
  }

  function elegirCaptura(evento: React.ChangeEvent<HTMLInputElement>) {
    const archivo = evento.target.files?.[0];
    evento.target.value = "";
    if (!archivo || !tarea) return;
    void aceptarCaptura(archivo);
  }

  async function aceptarCaptura(archivo: File) {
    // A desktop can ignore `capture` and open the file picker. Anything that is not a fresh camera JPEG
    // is a picked file: it goes up as origen=archivo, without the camera token.
    if (!esFotoDeCamara(archivo) || !archivoDeCamaraReciente(archivo)) {
      await aceptarArchivo(archivo);
      return;
    }
    prepararRevision(false);
    const validado = await evaluarArchivo(archivo, { soloJpeg: true });
    if (!validado.ok) {
      rechazarSeleccion(avisoArchivo(validado.motivo), true);
      return;
    }
    usarFoto(archivo, null, new Date(archivo.lastModified).toISOString());
  }

  function soltarArchivo(evento: React.DragEvent<HTMLElement>) {
    evento.preventDefault();
    setArrastrando(false);
    if (!tarea) return;
    const archivo = evento.dataTransfer.files?.[0];
    if (!archivo) return;
    void aceptarArchivo(archivo);
  }

  function sobreZona(evento: React.DragEvent<HTMLElement>) {
    evento.preventDefault();
    if (!arrastrando) setArrastrando(true);
  }

  async function enviar() {
    if (!tarea || !foto || enviandoRef.current) return;
    enviandoRef.current = true;
    setFase("enviando");
    setError(null);
    try {
      // Only a live camera capture on a work task carries the camera token and the capture time.
      const enVivo = tarea.tipo === "trabajo" && !desdeArchivo;
      const token = enVivo ? await pedirTokenEvidencia(tarea.id) : undefined;
      const resultado = await subirEvidencia(tarea, foto, {
        token,
        capturadaEn: enVivo ? (capturadaEn ?? undefined) : undefined,
        nombre: nombreArchivo ?? undefined,
        origen: enVivo ? undefined : ORIGEN_ARCHIVO,
      });
      const fresco = await leerTarea(tarea.id, { miembroId: "" }, { muestra: demo });
      if (fresco.tarea && !fresco.ejemplo) setTarea(fresco.tarea);
      setEvidencia(resultado.evidencia);
      setAvisoEnvio(resultado.aviso);
      setEsperaLocal(true);
      setEsperaAgotada(false);
      // A lost answer that the task read confirmed is already sent, not a fresh upload:
      // keep the server's enviadaEn instead of stamping it now.
      setEnviadaEn(resultado.evidencia !== null ? new Date() : null);
      setFase("lista");
    } catch (err) {
      setError(err instanceof ErrorDeSesion || err instanceof ErrorDeEnvio ? err.aviso : "Could not send. Try again.");
      setFase("foto");
    } finally {
      enviandoRef.current = false;
    }
  }

  function empezarReintento() {
    setReintentando(true);
    tomarOtra();
  }

  function tomarOtra() {
    setEvidencia(null);
    setAvisoEnvio(null);
    setFoto(null);
    setCapturadaEn(null);
    setNombreArchivo(null);
    setEsperaAgotada(false);
    setEsperaLocal(false);
    setEnviadaEn(null);
    setArchivoRechazado(false);
    setDesdeArchivo(false);
    if (fotoUrlRef.current) URL.revokeObjectURL(fotoUrlRef.current);
    fotoUrlRef.current = null;
    setFotoUrl(null);
    setFase("inicio");
  }

  if (fase === "cargando") {
    return (
      <main className="hyto-page">
        <p className="text-[var(--suave)]">{t("comunes.loading")}</p>
      </main>
    );
  }

  if (fase === "faltante" || !tarea) {
    return (
      <main className="hyto-page">
        <p className="text-lg" role="alert">
          {claro(cargaError ?? "We couldn't find that task.")}
        </p>
        {cargaError ? (
          <button type="button" className="hyto-btn mt-6 max-w-xs" onClick={() => setIntento((actual) => actual + 1)}>
            {t("comunes.tryAgain")}
          </button>
        ) : (
          <Link href="/mis-tareas" className="hyto-btn-line is-inline mt-6 px-5">
            {t("evidencia.back")}
          </Link>
        )}
      </main>
    );
  }

  const mostrarRevision = tarea.tipo === "reembolso" && evidencia?.monto && evidencia.fecha;
  const reembolso = tarea.tipo === "reembolso";
  /** A picked file, or any reimbursement: the retake and send-again labels talk about a file. */
  const recibo = reembolso || desdeArchivo;
  const envioBloqueado = archivoRechazado && fase === "inicio" && !foto;
  // No camera here: the phone code is offered, and the file picker and the drop zone stay available.
  const seguirTelefono = sinCamara && fase === "inicio";
  const camaraDisponible = !sinCamara;
  const mostrarPrincipal = fase === "camara" || fase === "foto" || envioBloqueado;
  const accion = envioBloqueado ? t("evidencia.send") : fase === "camara" ? t("evidencia.takePhoto") : t("evidencia.send");

  const cerrada = tarea.estado === "pagado" || tarea.etapa === "aprobada" || Boolean(tarea.hashPago?.trim());
  const enviada = fase === "lista" || cerrada;
  const revisando = fase === "enviando" || esperando;
  const vista = vistaMonto(tarea, idioma);
  const montoVisible = vista.linea;
  const cobro = montosDeCobro(tarea, idioma);
  const montoPaso = cobro?.pago || vista.pago || montoDeTarea(tarea, idioma);
  const calificacion = notaDeTarea(tarea);
  const insuficiente = calificacion?.veredicto === "insuficiente";
  const parcial = calificacion?.veredicto === "parcial";
  /** Only when another photo can really be sent: the task is not paid or approved yet. */
  const mejorable = !cerrada && (insuficiente || parcial || tarea.etapa === "enviada_organizador");
  const mileSinTerminar = reintentoMile;
  const titulo = textoVisible(tarea.titulo, idioma);
  const esDocumento = foto ? esDocumentoDeclarado(foto.type, nombreArchivo ?? "") : false;
  const documental = esDocumento || esMimeDocumental(tarea.tipoArchivo);
  const etiquetaDocumento =
    nombreArchivo ?? (foto?.type === "application/pdf" ? t("evidencia.invoicePdf") : t("evidencia.textFile"));
  const momentoEnvio = enviadaEn ?? (tarea.enviadaEn && !Number.isNaN(Date.parse(tarea.enviadaEn)) ? new Date(tarea.enviadaEn) : null);
  const hora = momentoEnvio ? formatearHora(momentoEnvio, idioma) : null;
  const nombreEvento = (evento || tarea.evento || "").trim();
  const meta = [nombreEvento ? textoVisible(nombreEvento, idioma) : null].filter(Boolean).join("");
  const rechazada = estaRechazada(tarea);
  const fallidosMarcados = reintentando && rechazada ? puntosFallidos(tarea, puntosDeCondicion(tarea.condicion).length) : null;

  if (tarea.estado === "pagado") {
    return <PantallaPagada tarea={tarea} titulo={titulo} />;
  }

  const montoFrente = vista.pago || (tarea.tipo === "trabajo" ? formatearMonto(tarea.monto, idioma) : vista.linea);
  const topeFondo = vista.tope && vista.pago && vista.tope !== vista.pago ? t("eventos.limit", { amount: vista.tope }) : null;
  const cumbre = calificacion?.veredicto === "cumplió" && !mileSinTerminar && !avisoEnvio;

  if (rechazada && fase === "inicio" && !reintentando) {
    return (
      <>
        <PantallaRechazada
          tarea={tarea}
          evento={nombreEvento || null}
          onReintentar={empezarReintento}
          onArchivo={reembolso ? () => archivoRef.current?.click() : undefined}
        />
        {reembolso ? (
          <input
            ref={archivoRef}
            type="file"
            accept={ACCEPT_RECIBO}
            tabIndex={-1}
            aria-hidden="true"
            className="sr-only"
            onChange={elegirArchivo}
          />
        ) : null}
      </>
    );
  }

  const cabecera = (
    <header className="hyto-tarea-cab">
      <div>
        <p className="hyto-eyebrow">{t("evidencia.upload")}</p>
        <h1 className="hyto-tarea-titulo">{titulo}</h1>
        {nombreEvento ? <p className="hyto-tarea-meta">{textoVisible(nombreEvento, idioma)}</p> : null}
      </div>
      <span className="hyto-chip-monto">{montoVisible}</span>
    </header>
  );

  const srcFoto =
    fotoUrl ?? (tarea.ultimaEvidenciaId ? `/api/evidencias/${encodeURIComponent(tarea.ultimaEvidenciaId)}/foto` : null);
  const vistaFoto =
    srcFoto && !esDocumento ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={srcFoto} alt={t("evidencia.alt")} />
    ) : null;

  const miniatura = (
    <MiniaturaEvidencia src={srcFoto} documento={esDocumento} etiqueta={esDocumento ? etiquetaDocumento : t("evidencia.alt")} />
  );

  if (revisando) {
    return (
      <main className="hyto-page hyto-tarea">
        {cabecera}
        <section className="hyto-tarjeta hyto-revisando" aria-live="polite">
          <MileAnimada estado="buscando" tamano={140} />
          <div>
            <span className="hyto-badge hyto-badge-rev">{t("evidencia.checking")}</span>
            <h2>{t(documental ? "evidencia.mileCheckingFile" : "evidencia.mileChecking")}</h2>
            <p>{t("evidencia.fewSeconds")}</p>
          </div>
        </section>
        {vistaFoto ? (
          <div className="hyto-visor hyto-visor-chico">
            {vistaFoto}
            <span className="hyto-visor-pill">{documental ? etiquetaDocumento : t("evidencia.onePhoto")}</span>
          </div>
        ) : null}
        <Checklist condicion={tarea.condicion} revisando />
        <ActividadTarea tarea={tarea} />
        <div className="hyto-actions">
          <BotonPrincipal type="button" disabled aria-busy={fase === "enviando"} className="hyto-btn-grande">
            {fase === "enviando" ? t("evidencia.sending") : t("evidencia.sentShort")}
          </BotonPrincipal>
          <p className="hyto-pista">{fase === "enviando" ? t("evidencia.sendingNote") : t("evidencia.stillHere")}</p>
        </div>
      </main>
    );
  }

  if (enviada && cumbre) {
    return (
      <MomentoLaTengo
        tareaId={tarea.id}
        monto={montoFrente}
        tope={topeFondo}
        resumen={
          <ResumenResultado
            tarea={tarea}
            titulo={titulo}
            calificacion={calificacion}
            montoVisible={montoVisible}
            miniatura={miniatura}
          />
        }
      >
        <LineaRevision tarea={tarea} revisionCerrada={esperaAgotada || !!avisoEnvio} monto={montoPaso} archivo={documental} />
        <ActividadTarea tarea={tarea} />
        {!cerrada ? (
          <button type="button" onClick={tomarOtra} className="hyto-btn-line">
            {t("evidencia.sendAnotherEvidence")}
          </button>
        ) : null}
      </MomentoLaTengo>
    );
  }

  if (enviada) {
    return (
      <main className="hyto-page hyto-tarea hyto-enviada">
        <header className="hyto-enviada-cab">
          {mileSinTerminar || avisoEnvio ? (
            <div className="hyto-enviada-alerta" aria-hidden="true">
              !
            </div>
          ) : (
            <MileAnimada estado="lo-tengo" tamano={64} />
          )}
          <h1 className="hyto-tarea-titulo">
            {mileSinTerminar
              ? t("evidencia.mileCouldntFinish")
              : avisoEnvio
                ? t("evidencia.sentAction")
                : insuficiente
                  ? nombre
                    ? t(documental ? "evidencia.notEnoughNameFile" : "evidencia.notEnoughName", { name: nombreEnIdioma(nombre, idioma) })
                    : t(documental ? "evidencia.notEnoughFile" : "evidencia.notEnough")
                  : parcial
                    ? nombre
                      ? t("evidencia.partialName", { name: nombreEnIdioma(nombre, idioma) })
                      : t("evidencia.partial")
                    : nombre
                      ? t(documental ? "evidencia.greatJobNameFile" : "evidencia.greatJobName", { name: nombreEnIdioma(nombre, idioma) })
                      : t(documental ? "evidencia.greatJobFile" : "evidencia.greatJob")}
          </h1>
          {mileSinTerminar ? (
            <p role="status" className="hyto-enviada-aviso">
              {t(documental ? "evidencia.mileRetryFile" : "evidencia.mileRetry")}
            </p>
          ) : avisoEnvio ? (
            <p role="alert" className="hyto-enviada-aviso">
              {claro(avisoEnvio)}
              {t("evidencia.fixSuffix")}
            </p>
          ) : (
            <>
              {calificacion !== null || tarea.etapa === "enviada_organizador" ? (
                <p className="hyto-en-revision" role="status">
                  {t("evidencia.mileYaMiro")}
                </p>
              ) : null}
              {tarea.etapa === "enviada_organizador" ? <p className="hyto-tarea-meta">{t("evidencia.reachedOrganizer")}.</p> : null}
              {mejorable ? (
                <p className="hyto-tarea-meta">{t(documental ? "evidencia.betterFile" : "evidencia.betterPhoto")}</p>
              ) : tarea.etapa !== "enviada_organizador" ? (
                <p className="hyto-tarea-meta">{t("evidencia.greatJobSub")}</p>
              ) : null}
            </>
          )}
        </header>
        <ResumenResultado
          tarea={tarea}
          titulo={titulo}
          calificacion={calificacion}
          montoVisible={montoVisible}
          miniatura={miniatura}
          mostrarLlamada={!mejorable}
          meta={
            nombreEvento || hora ? (
              <p className="hyto-tarea-meta">
                {hora
                  ? nombreEvento
                    ? t("evidencia.sentAt", { event: textoVisible(nombreEvento, idioma), time: hora })
                    : t(documental ? "evidencia.fileSentAt" : "evidencia.photoSentAt", { time: hora })
                  : meta}
              </p>
            ) : null
          }
        />
        <LineaRevision
          tarea={tarea}
          revisionCerrada={esperaAgotada || !!avisoEnvio}
          mileSinTerminar={mileSinTerminar}
          monto={montoPaso}
          archivo={documental}
        />
        <ActividadTarea tarea={tarea} />
        <div className="hyto-enviada-acciones">
          {mileSinTerminar ? (
            <button type="button" onClick={tomarOtra} className="hyto-btn hyto-btn-grande">
              {t("comunes.tryAgain")}
            </button>
          ) : (
            <Link href="/mis-tareas" className="hyto-btn hyto-btn-grande">
              {t("evidencia.backToTasks")}
            </Link>
          )}
          {mileSinTerminar ? (
            <Link href="/mis-tareas" className="hyto-btn-line">
              {t("evidencia.backToTasks")}
            </Link>
          ) : !cerrada ? (
            <button type="button" onClick={tomarOtra} className="hyto-btn-line">
              {t("evidencia.sendAnotherEvidence")}
            </button>
          ) : null}
        </div>
        {error ? (
          <p role="alert" className="hyto-error-linea">
            {claro(error)}
          </p>
        ) : null}
        {ejemplo ? <p className="hyto-tarea-meta">{t("evidencia.sample")}</p> : null}
      </main>
    );
  }

  return (
    <main className="hyto-page hyto-tarea">
      {cabecera}
      <ContextoEvento
        proyectoId={tarea.proyectoId}
        nombre={nombreEvento}
        descripcion={contextoEvento.descripcion}
        portada={contextoEvento.portada}
      />
      <div className="hyto-tarea-cols">
        <div className="hyto-tarea-col">
          {fase === "inicio" ? (
            <div className="hyto-requisito-angosto">
              <Checklist condicion={tarea.condicion} fallidos={fallidosMarcados} ancla="hyto-requisito-titulo" />
            </div>
          ) : null}
          {seguirTelefono ? (
            <div className="hyto-sin-camara" role="status">
              <p>{t("evidencia.noCameraDevice")}</p>
              <p>{t("evidencia.phoneCodeHelp")}</p>
              <p className="hyto-codigo-telefono">
                <span>{t("evidencia.phoneCodeLabel")}</span> <strong>{codigoTelefono(tarea.id)}</strong>
              </p>
              <button type="button" className="hyto-btn-line" onClick={() => void seguirEnTelefono()}>
                {t("evidencia.continuePhone")}
              </button>
            </div>
          ) : null}
          <PanelMile />
          {fase !== "inicio" || fotoUrl ? (
            <div className="hyto-visor">
              {fotoUrl && esDocumento ? (
                <div className="hyto-visor-vacio">
                  <span className="hyto-evid-chip">{etiquetaDocumento}</span>
                </div>
              ) : fotoUrl ? (
                vistaFoto
              ) : fase === "camara" ? (
                <video ref={videoRef} playsInline muted aria-label={t("evidencia.camera")} />
              ) : null}
              {fase === "foto" ? (
                <>
                  <span className="hyto-visor-pill">{esDocumento ? etiquetaDocumento : t("evidencia.onePhoto")}</span>
                  <button type="button" onClick={tomarOtra} className="hyto-visor-otra">
                    {desdeArchivo ? t("evidencia.chooseAnother") : t("evidencia.takeAnother")}
                  </button>
                </>
              ) : null}
            </div>
          ) : null}
          {fase === "inicio" ? (
            <div className="hyto-evid-slot">
              <div className="hyto-evid-movil">
                {camaraDisponible ? (
                  <BotonPrincipal type="button" className="hyto-btn-grande" onClick={() => void abrirCamara()}>
                    {t("evidencia.tomarFoto")}
                  </BotonPrincipal>
                ) : null}
                <button type="button" className="hyto-evid-contorno" onClick={() => archivoRef.current?.click()}>
                  {t("evidencia.subirArchivo")}
                </button>
              </div>
              <div className="hyto-evid-escritorio">
                <button
                  type="button"
                  className={`hyto-evid-soltar${arrastrando ? " is-encima" : ""}`}
                  onClick={() => archivoRef.current?.click()}
                  onDragEnter={sobreZona}
                  onDragOver={sobreZona}
                  onDragLeave={() => setArrastrando(false)}
                  onDrop={soltarArchivo}
                >
                  <span className="hyto-evid-soltar-titulo">{t("evidencia.soltarTitulo")}</span>
                  <span className="hyto-evid-soltar-formatos">{t("evidencia.soltarFormatos")}</span>
                </button>
                {camaraDisponible ? (
                  <button type="button" className="hyto-evid-texto" onClick={() => void abrirCamara()}>
                    {t("evidencia.tomarFoto")}
                  </button>
                ) : null}
              </div>
              <p className="hyto-pista hyto-evid-pista">{t("evidencia.unaEvidencia")}</p>
            </div>
          ) : null}
        </div>
        <div className="hyto-tarea-col">
          <div className="hyto-checklist-lado">
            <Checklist condicion={tarea.condicion} fallidos={fallidosMarcados} />
          </div>
          <ActividadTarea tarea={tarea} />
          {mostrarRevision ? (
            <dl className="hyto-tarjeta hyto-dato-leido">
              <div>
                <dt>{t("comunes.amount")}</dt>
                <dd className="hyto-amount">{formatearMonto(evidencia.monto!, idioma)}</dd>
              </div>
              <div>
                <dt>{t("comunes.date")}</dt>
                <dd className="hyto-amount">{formatearFecha(evidencia.fecha!, idioma)}</dd>
              </div>
            </dl>
          ) : null}
          {error ? (
            <p role="alert" className="hyto-error-linea">
              {claro(error)}
            </p>
          ) : null}
          {mostrarPrincipal ? (
            <div className="hyto-actions">
              <BotonPrincipal
                type="button"
                className="hyto-btn-grande"
                disabled={envioBloqueado}
                onClick={() => {
                  if (envioBloqueado) return;
                  if (fase === "camara") tomarFoto();
                  else if (fase === "foto") void enviar();
                }}
              >
                {accion}
              </BotonPrincipal>
            </div>
          ) : null}
          {ejemplo ? <p className="hyto-tarea-meta">{t("evidencia.sample")}</p> : null}
        </div>
      </div>

      <input
        ref={archivoRef}
        type="file"
        accept={ACCEPT_RECIBO}
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
        onChange={elegirArchivo}
      />
      {conCaptura && camaraDisponible ? (
        <input
          ref={capturaRef}
          type="file"
          accept="image/jpeg"
          capture="environment"
          tabIndex={-1}
          aria-hidden="true"
          className="sr-only"
          onChange={elegirCaptura}
        />
      ) : null}
    </main>
  );
}
