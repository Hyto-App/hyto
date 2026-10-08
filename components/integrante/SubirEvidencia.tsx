"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { EtiquetasNota } from "@/components/admin/EtiquetasNota";
import { PastillaVeredicto } from "@/components/admin/PastillaVeredicto";
import { BotonPrincipal } from "@/components/integrante/BotonPrincipal";
import { PastillaEstado } from "@/components/integrante/EstadoTarea";
import { Checklist } from "@/components/integrante/evidencia/Checklist";
import { LineaRevision } from "@/components/integrante/evidencia/LineaRevision";
import { PanelMile } from "@/components/integrante/evidencia/PanelMile";
import { ActividadTarea } from "@/components/integrante/ActividadTarea";
import { PantallaPagada } from "@/components/integrante/evidencia/PantallaPagada";
import { PantallaRechazada } from "@/components/integrante/evidencia/PantallaRechazada";
import { SeguirEnCelular } from "@/components/integrante/evidencia/SeguirEnCelular";
import { useModoDemo } from "@/components/sesion/InsigniaDemo";
import { useClaro, useIdioma, useTexto } from "@/components/ui/Idioma";
import { MileAnimada } from "@/components/ui/MileAnimada";
import { leerMemoria } from "@/lib/integrante/almacen";
import { archivoDeCamaraReciente, esFotoDeCamara } from "@/lib/integrante/fotoEnVivo";
import { camaraAusente, detectarEscritorio, errorSinCamara } from "@/lib/integrante/sinCamara";
import { ACCEPT_RECIBO, archivoReciboPermitido, esDocumentoDeclarado, esMimeDocumental } from "@/lib/evidencia/tipo";
import { avisoArchivo, evaluarArchivo } from "@/lib/evidencia/validar";
import { formatearFecha, formatearHora, formatearMonto, montoDeTarea } from "@/lib/integrante/formato";
import { notaDeTarea } from "@/lib/integrante/nota";
import { estaRechazada, puntosFallidos } from "@/lib/integrante/revision";
import { puntosDeCondicion } from "@/lib/integrante/puntos";
import { esperaRevision, INTERVALO_SEGUIMIENTO_MS, mostrarReintento, seguirConsultando, topeSeguimientoMs } from "@/lib/integrante/seguimiento";
import { textoVisible } from "@/lib/ui/etiquetas";
import { ContextoEvento } from "./ContextoEvento";

type ProyectoLista = { id: string; nombre: string; descripcion?: string | null; portada?: boolean };
import { ErrorDeEnvio, ErrorDeSesion, leerTarea, pedirTokenEvidencia, subirEvidencia } from "@/lib/integrante/rutas";
import type { Evidencia, Tarea } from "@/lib/integrante/tipos";

type Fase = "cargando" | "inicio" | "camara" | "foto" | "enviando" | "lista" | "faltante";
type PestanaEvidencia = "recibo" | "tarea";

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
  const [pestana, setPestana] = useState<PestanaEvidencia>("tarea");
  const baseId = useId();
  const [rechazoVivo, setRechazoVivo] = useState<null | "camara" | "galeria">(null);
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
      setPestana(resultado.tarea.tipo === "reembolso" ? "recibo" : "tarea");
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
    let vivo = true;
    const media = navigator.mediaDevices;
    if (!media?.getUserMedia) setConCaptura(true);
    else if (detectarEscritorio()) {
      const listar = media.enumerateDevices?.bind(media);
      if (listar) {
        void listar()
          .then((lista) => {
            if (vivo && camaraAusente(lista)) setSinCamara(true);
          })
          .catch(() => undefined);
      }
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

  function usarFoto(blob: Blob, nombre: string | null, captura: string | null) {
    if (fotoUrlRef.current) URL.revokeObjectURL(fotoUrlRef.current);
    const url = URL.createObjectURL(blob);
    fotoUrlRef.current = url;
    setFotoUrl(url);
    setFoto(blob);
    setNombreArchivo(nombre);
    setCapturadaEn(captura);
    setError(null);
    setArchivoRechazado(false);
    streamRef.current?.getTracks().forEach((pista) => pista.stop());
    streamRef.current = null;
    setFase("foto");
  }

  function pestanaSirve(): boolean {
    if (!tarea) return false;
    return pestana === "recibo" ? tarea.tipo === "reembolso" : tarea.tipo === "trabajo";
  }

  async function abrirCamara() {
    if (!pestanaSirve()) return;
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
    } catch (err) {
      if (detectarEscritorio() && errorSinCamara(err)) {
        setSinCamara(true);
        setError(null);
        return;
      }
      setError(t("evidencia.noCamera"));
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
    setRechazoVivo(null);
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
    usarFoto(archivo, archivo.name, null);
  }

  function archivoPermitido(archivo: File): boolean {
    return archivoReciboPermitido(archivo.type, archivo.name);
  }

  function elegirArchivo(evento: React.ChangeEvent<HTMLInputElement>) {
    const archivo = evento.target.files?.[0];
    evento.target.value = "";
    if (!archivo || pestana !== "recibo" || !pestanaSirve()) return;
    void aceptarArchivo(archivo);
  }

  function elegirCaptura(evento: React.ChangeEvent<HTMLInputElement>) {
    const archivo = evento.target.files?.[0];
    evento.target.value = "";
    if (!archivo || pestana !== "tarea" || !pestanaSirve()) return;
    void aceptarCaptura(archivo);
  }

  async function aceptarCaptura(archivo: File) {
    if (!esFotoDeCamara(archivo)) {
      setRechazoVivo("camara");
      rechazarSeleccion(t("evidencia.useCamera"), false);
      return;
    }
    if (!archivoDeCamaraReciente(archivo)) {
      setRechazoVivo("galeria");
      rechazarSeleccion(t("evidencia.gallery"), false);
      return;
    }
    setRechazoVivo(null);
    prepararRevision(false);
    const validado = await evaluarArchivo(archivo, { soloJpeg: true });
    if (!validado.ok) {
      if (validado.motivo === "tipo") setRechazoVivo("camara");
      rechazarSeleccion(validado.motivo === "tipo" ? t("evidencia.useCamera") : avisoArchivo(validado.motivo), false);
      return;
    }
    usarFoto(archivo, null, new Date(archivo.lastModified).toISOString());
  }

  function soltarArchivo(evento: React.DragEvent<HTMLButtonElement>) {
    evento.preventDefault();
    if (pestana !== "recibo" || !pestanaSirve()) return;
    const archivo = evento.dataTransfer.files?.[0];
    if (!archivo) return;
    void aceptarArchivo(archivo);
  }

  async function enviar() {
    if (!tarea || !foto || enviandoRef.current || !pestanaSirve()) return;
    enviandoRef.current = true;
    setFase("enviando");
    setError(null);
    try {
      const token = pestana === "tarea" && tarea.tipo === "trabajo" ? await pedirTokenEvidencia(tarea.id) : undefined;
      const resultado = await subirEvidencia(tarea, foto, {
        token,
        capturadaEn: capturadaEn ?? undefined,
        nombre: nombreArchivo ?? undefined,
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
    setRechazoVivo(null);
    if (fotoUrlRef.current) URL.revokeObjectURL(fotoUrlRef.current);
    fotoUrlRef.current = null;
    setFotoUrl(null);
    setFase("inicio");
  }

  function elegirPestana(siguiente: PestanaEvidencia) {
    if (siguiente === pestana) return;
    streamRef.current?.getTracks().forEach((pista) => pista.stop());
    streamRef.current = null;
    setFoto(null);
    setCapturadaEn(null);
    setNombreArchivo(null);
    setError(null);
    setArchivoRechazado(false);
    setRechazoVivo(null);
    if (fotoUrlRef.current) URL.revokeObjectURL(fotoUrlRef.current);
    fotoUrlRef.current = null;
    setFotoUrl(null);
    setPestana(siguiente);
    setFase("inicio");
  }

  function teclasPestana(evento: React.KeyboardEvent<HTMLButtonElement>, actual: PestanaEvidencia) {
    const orden: PestanaEvidencia[] = ["recibo", "tarea"];
    const indice = orden.indexOf(actual);
    let siguiente: PestanaEvidencia | null = null;
    if (evento.key === "ArrowRight" || evento.key === "ArrowDown") siguiente = orden[(indice + 1) % orden.length] ?? null;
    else if (evento.key === "ArrowLeft" || evento.key === "ArrowUp") siguiente = orden[(indice - 1 + orden.length) % orden.length] ?? null;
    else if (evento.key === "Home") siguiente = orden[0] ?? null;
    else if (evento.key === "End") siguiente = orden[orden.length - 1] ?? null;
    if (!siguiente) return;
    evento.preventDefault();
    elegirPestana(siguiente);
    const id = siguiente === "recibo" ? `${baseId}-recibo` : `${baseId}-tarea`;
    queueMicrotask(() => document.getElementById(id)?.focus());
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
  const recibo = pestana === "recibo";
  const coincide = recibo === reembolso;
  const idRecibo = `${baseId}-recibo`;
  const idTarea = `${baseId}-tarea`;
  const idPanel = `${baseId}-panel`;
  const envioBloqueado = archivoRechazado && coincide && fase === "inicio" && !foto;
  const accion =
    !coincide || envioBloqueado
      ? t("evidencia.send")
      : fase === "camara"
        ? t("evidencia.takePhoto")
        : fase === "foto"
          ? t("evidencia.send")
          : fase === "enviando"
            ? t("evidencia.sending")
            : recibo
              ? t("evidencia.chooseFile")
              : t("evidencia.openCamera");
  const pista = coincide && fase === "inicio" && !envioBloqueado ? (recibo ? t("evidencia.chooseFirst") : t("evidencia.takePhotoFirst")) : null;
  const sinSalidaDeCamara = sinCamara && coincide && !recibo && fase === "inicio";

  const cerrada = tarea.estado === "pagado" || tarea.etapa === "aprobada" || Boolean(tarea.hashPago?.trim());
  const enviada = fase === "lista" || cerrada;
  const revisando = fase === "enviando" || esperando;
  const montoVisible = montoDeTarea(tarea, idioma);
  const calificacion = notaDeTarea(tarea);
  const insuficiente = calificacion?.veredicto === "insuficiente";
  const parcial = calificacion?.veredicto === "parcial";
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

  if (rechazoVivo && fase === "inicio") {
    return (
      <main className="hyto-page hyto-tarea hyto-vivo" role="alert">
        <h1 className="hyto-vivo-titulo">{t("evidencia.liveTitle")}</h1>
        <p className="hyto-vivo-cuerpo">{t(rechazoVivo === "galeria" ? "evidencia.gallery" : "evidencia.useCamera")}</p>
        <p className="hyto-vivo-pista">{t("evidencia.galleryHint")}</p>
        <button
          type="button"
          className="hyto-btn hyto-btn-grande"
          onClick={() => {
            setRechazoVivo(null);
            setError(null);
            void abrirCamara();
          }}
        >
          {t("evidencia.openCamera")}
        </button>
        {conCaptura ? (
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

  const vistaFoto =
    fotoUrl && !esDocumento ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={fotoUrl} alt={t("evidencia.alt")} />
    ) : null;

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
                    ? t(documental ? "evidencia.notEnoughNameFile" : "evidencia.notEnoughName", { name: nombre })
                    : t(documental ? "evidencia.notEnoughFile" : "evidencia.notEnough")
                  : parcial
                    ? nombre
                      ? t("evidencia.partialName", { name: nombre })
                      : t("evidencia.partial")
                    : nombre
                      ? t(documental ? "evidencia.greatJobNameFile" : "evidencia.greatJobName", { name: nombre })
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
              {insuficiente ? (
                <p className="hyto-tarea-meta">{t("evidencia.notEnoughSub")}</p>
              ) : tarea.etapa === "enviada_organizador" ? (
                <p className="hyto-tarea-meta">{t("evidencia.reachedOrganizer")}</p>
              ) : (
                <p className="hyto-tarea-meta">{t(parcial ? "evidencia.partialSub" : "evidencia.greatJobSub")}</p>
              )}
            </>
          )}
        </header>
        <article className="hyto-tarjeta hyto-resumen">
          {vistaFoto ? <div className="hyto-resumen-mini">{vistaFoto}</div> : null}
          <div>
            <PastillaEstado estado={tarea.estado} />
            <h2>{titulo}</h2>
            {nombreEvento || hora ? (
              <p className="hyto-tarea-meta">
                {hora
                  ? nombreEvento
                    ? t("evidencia.sentAt", { event: textoVisible(nombreEvento, idioma), time: hora })
                    : t(documental ? "evidencia.fileSentAt" : "evidencia.photoSentAt", { time: hora })
                  : meta}
              </p>
            ) : null}
            {calificacion ? (
              <div className="hyto-resumen-nota">
                <PastillaVeredicto veredicto={calificacion.veredicto} nota={calificacion.nota} />
                <EtiquetasNota etiquetas={tarea.notas} />
                <p className="hyto-tarea-meta">{t("evidencia.organizerCall")}.</p>
              </div>
            ) : null}
          </div>
          <p className="hyto-amount">{montoVisible}</p>
        </article>
        <LineaRevision
          tarea={tarea}
          revisionCerrada={esperaAgotada || !!avisoEnvio}
          mileSinTerminar={mileSinTerminar}
          monto={montoVisible}
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
              {recibo ? t("evidencia.sendAnother") : t("evidencia.takeAnother")}
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
    <main className="hyto-page hyto-tarea hyto-tarea-subir">
      {cabecera}
      <ContextoEvento
        proyectoId={tarea.proyectoId}
        nombre={nombreEvento}
        descripcion={contextoEvento.descripcion}
        portada={contextoEvento.portada}
      />
      <div className="hyto-tabs flex" role="tablist" aria-label={t("evidencia.tabs")}>
        <button
          type="button"
          role="tab"
          id={idRecibo}
          aria-selected={recibo}
          aria-controls={idPanel}
          tabIndex={recibo ? 0 : -1}
          onClick={() => elegirPestana("recibo")}
          onKeyDown={(evento) => teclasPestana(evento, "recibo")}
        >
          {t("evidencia.tabReceipt")}
        </button>
        <button
          type="button"
          role="tab"
          id={idTarea}
          aria-selected={!recibo}
          aria-controls={idPanel}
          tabIndex={recibo ? -1 : 0}
          onClick={() => elegirPestana("tarea")}
          onKeyDown={(evento) => teclasPestana(evento, "tarea")}
        >
          {t("evidencia.tabTask")}
        </button>
      </div>
      <div className="hyto-tarea-cols" role="tabpanel" id={idPanel} aria-labelledby={recibo ? idRecibo : idTarea}>
        <div className="hyto-tarea-col">
          <PanelMile />
          {sinSalidaDeCamara ? (
            <SeguirEnCelular tareaId={tarea.id} />
          ) : (
          <div className="hyto-visor">
            {!coincide ? (
              <div className="hyto-visor-vacio">
                <p role="status">{recibo ? t("evidencia.mismatchReceipt") : t("evidencia.mismatchTask")}</p>
                <button type="button" className="hyto-btn-line" onClick={() => elegirPestana(reembolso ? "recibo" : "tarea")}>
                  {reembolso ? t("evidencia.backToReceipt") : t("evidencia.backToTask")}
                </button>
              </div>
            ) : fotoUrl && esDocumento ? (
              <div className="hyto-visor-vacio">{etiquetaDocumento}</div>
            ) : fotoUrl ? (
              vistaFoto
            ) : fase === "camara" ? (
              <video ref={videoRef} playsInline muted aria-label={t("evidencia.camera")} />
            ) : (
              <div className="hyto-visor-vacio">
                <p>{recibo ? t("evidencia.receiptPlaceholder") : t("evidencia.cameraOff")}</p>
              </div>
            )}
            {coincide && fase === "foto" ? (
              <>
                <span className="hyto-visor-pill">{esDocumento ? etiquetaDocumento : t("evidencia.onePhoto")}</span>
                <button type="button" onClick={tomarOtra} className="hyto-visor-otra">
                  {recibo ? t("evidencia.chooseAnother") : t("evidencia.takeAnother")}
                </button>
              </>
            ) : null}
          </div>
          )}
          {coincide && recibo && (fase === "inicio" || fase === "foto") ? (
            <button
              type="button"
              onClick={() => archivoRef.current?.click()}
              onDragOver={(evento) => evento.preventDefault()}
              onDrop={soltarArchivo}
              className="hyto-btn-line is-dashed"
            >
              {t("evidencia.choosePdf")}
            </button>
          ) : null}
          {coincide && !recibo && fase === "inicio" && !sinSalidaDeCamara ? <p className="hyto-pista">{t("evidencia.galleryHint")}</p> : null}
        </div>
        <div className="hyto-tarea-col">
          <Checklist condicion={tarea.condicion} fallidos={fallidosMarcados} />
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
          {sinSalidaDeCamara ? null : (
          <div className="hyto-actions">
            <BotonPrincipal
              type="button"
              className="hyto-btn-grande"
              disabled={!coincide || envioBloqueado}
              onClick={() => {
                if (!coincide || envioBloqueado) return;
                if (fase === "camara") tomarFoto();
                else if (fase === "foto") void enviar();
                else if (recibo) archivoRef.current?.click();
                else void abrirCamara();
              }}
            >
              {accion}
            </BotonPrincipal>
            {pista ? <p className="hyto-pista">{pista}</p> : null}
          </div>
          )}
          {ejemplo ? <p className="hyto-tarea-meta">{t("evidencia.sample")}</p> : null}
        </div>
      </div>

      {coincide && recibo ? (
        <input
          ref={archivoRef}
          type="file"
          accept={ACCEPT_RECIBO}
          tabIndex={-1}
          aria-hidden="true"
          className="sr-only"
          onChange={elegirArchivo}
        />
      ) : coincide && conCaptura && !sinCamara ? (
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
