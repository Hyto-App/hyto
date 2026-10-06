"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { PastillaVeredicto } from "@/components/admin/PastillaVeredicto";
import { BotonPrincipal } from "@/components/integrante/BotonPrincipal";
import { PastillaEstado } from "@/components/integrante/EstadoTarea";
import { Checklist } from "@/components/integrante/evidencia/Checklist";
import { LineaRevision } from "@/components/integrante/evidencia/LineaRevision";
import { PanelMile } from "@/components/integrante/evidencia/PanelMile";
import { PantallaPagada } from "@/components/integrante/evidencia/PantallaPagada";
import { PantallaRechazada } from "@/components/integrante/evidencia/PantallaRechazada";
import { useModoDemo } from "@/components/sesion/InsigniaDemo";
import { useClaro, useIdioma, useTexto } from "@/components/ui/Idioma";
import { MileAnimada } from "@/components/ui/MileAnimada";
import { leerMemoria } from "@/lib/integrante/almacen";
import { archivoDeCamaraReciente, esFotoDeCamara } from "@/lib/integrante/fotoEnVivo";
import { avisoArchivo, evaluarArchivo } from "@/lib/evidencia/validar";
import { formatearFecha, formatearHora, formatearMonto, montoDeTarea } from "@/lib/integrante/formato";
import { notaDeTarea } from "@/lib/integrante/nota";
import { estaRechazada, puntosFallidos } from "@/lib/integrante/revision";
import { puntosDeCondicion } from "@/lib/integrante/puntos";
import { esperaRevision, INTERVALO_SEGUIMIENTO_MS, seguirConsultando } from "@/lib/integrante/seguimiento";
import { textoVisible } from "@/lib/ui/etiquetas";
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
  const [capturadaEn, setCapturadaEn] = useState<string | null>(null);
  const [nombreArchivo, setNombreArchivo] = useState<string | null>(null);
  const [cargaError, setCargaError] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);
  const [evento, setEvento] = useState<string | null>(null);
  const [esperaAgotada, setEsperaAgotada] = useState(false);
  const [enviadaEn, setEnviadaEn] = useState<Date | null>(null);
  const [archivoRechazado, setArchivoRechazado] = useState(false);
  const [reintentando, setReintentando] = useState(false);
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
      .then((cuerpo: { proyectos?: { id: string; nombre: string }[]; proyecto?: { id: string; nombre: string } } | null) => {
        if (!activo || !cuerpo) return;
        const lista = cuerpo.proyectos ?? (cuerpo.proyecto ? [cuerpo.proyecto] : []);
        setEvento(lista.find((item) => item.id === proyectoId)?.nombre ?? null);
      })
      .catch(() => undefined);
    return () => {
      activo = false;
    };
  }, [tarea?.proyectoId]);

  useEffect(() => {
    montadoRef.current = true;
    if (!navigator.mediaDevices?.getUserMedia) setConCaptura(true);
    return () => {
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

  // The review runs after the upload. Ask again every 3 s, up to 60 s, until the grade or a new state arrives.
  const esperando = fase === "lista" && !!tarea && !ejemplo && !avisoEnvio && !esperaAgotada && esperaRevision(tarea);
  useEffect(() => {
    if (!esperando) return;
    let activo = true;
    const inicio = Date.now();
    const referencia = { estado: "en revisión", nota: null } as const;
    const id = setInterval(() => {
      void leerTarea(tareaId, { miembroId: "" }, { muestra: demo })
        .catch(() => null)
        .then((fresco) => {
          if (!activo) return;
          const actual = fresco?.tarea && !fresco.ejemplo ? fresco.tarea : null;
          if (actual) setTarea(actual);
          if (!seguirConsultando(referencia, actual ?? referencia, Date.now() - inicio)) setEsperaAgotada(true);
        });
    }, INTERVALO_SEGUIMIENTO_MS);
    return () => {
      activo = false;
      clearInterval(id);
    };
  }, [esperando, tareaId, demo]);

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

  async function abrirCamara() {
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
    } catch {
      setError("Could not open the camera. Allow the camera and try again.");
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
    setError(null);
    setFase("inicio");
  }

  async function aceptarArchivo(archivo: File) {
    if (!archivoPermitido(archivo)) {
      rechazarSeleccion("Choose a PDF, JPEG, PNG, or WebP file.", true);
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
    const tipo = archivo.type.toLowerCase();
    const nombre = archivo.name.toLowerCase();
    if (tipo === "application/pdf" || nombre.endsWith(".pdf")) return true;
    if (tipo === "image/jpeg" || tipo === "image/png" || tipo === "image/webp") return true;
    return nombre.endsWith(".jpg") || nombre.endsWith(".jpeg") || nombre.endsWith(".png") || nombre.endsWith(".webp");
  }

  function elegirArchivo(evento: React.ChangeEvent<HTMLInputElement>) {
    const archivo = evento.target.files?.[0];
    evento.target.value = "";
    if (!archivo || tarea?.tipo !== "reembolso") return;
    void aceptarArchivo(archivo);
  }

  function elegirCaptura(evento: React.ChangeEvent<HTMLInputElement>) {
    const archivo = evento.target.files?.[0];
    evento.target.value = "";
    if (!archivo || tarea?.tipo !== "trabajo") return;
    void aceptarCaptura(archivo);
  }

  async function aceptarCaptura(archivo: File) {
    if (!esFotoDeCamara(archivo)) {
      rechazarSeleccion("Take the photo with the camera.", false);
      return;
    }
    if (!archivoDeCamaraReciente(archivo)) {
      rechazarSeleccion("Take the photo now. Photos from the gallery are not accepted.", false);
      return;
    }
    prepararRevision(false);
    const validado = await evaluarArchivo(archivo, { soloJpeg: true });
    if (!validado.ok) {
      rechazarSeleccion(validado.motivo === "tipo" ? "Take the photo with the camera." : avisoArchivo(validado.motivo), false);
      return;
    }
    usarFoto(archivo, null, new Date(archivo.lastModified).toISOString());
  }

  function soltarArchivo(evento: React.DragEvent<HTMLButtonElement>) {
    evento.preventDefault();
    if (tarea?.tipo !== "reembolso") return;
    const archivo = evento.dataTransfer.files?.[0];
    if (!archivo) return;
    void aceptarArchivo(archivo);
  }

  async function enviar() {
    if (!tarea || !foto || enviandoRef.current) return;
    enviandoRef.current = true;
    setFase("enviando");
    setError(null);
    try {
      const token = tarea.tipo === "trabajo" ? await pedirTokenEvidencia(tarea.id) : undefined;
      const resultado = await subirEvidencia(tarea, foto, {
        token,
        capturadaEn: capturadaEn ?? undefined,
        nombre: nombreArchivo ?? undefined,
      });
      const fresco = await leerTarea(tarea.id, { miembroId: "" }, { muestra: demo });
      if (fresco.tarea && !fresco.ejemplo) setTarea(fresco.tarea);
      setEvidencia(resultado.evidencia);
      setAvisoEnvio(resultado.aviso);
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
    setEnviadaEn(null);
    setArchivoRechazado(false);
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
  const envioBloqueado = archivoRechazado && reembolso && fase === "inicio" && !foto;
  const accion = envioBloqueado
    ? t("evidencia.send")
    : fase === "camara"
      ? t("evidencia.takePhoto")
      : fase === "foto"
        ? t("evidencia.send")
        : fase === "enviando"
          ? t("evidencia.sending")
          : reembolso
            ? t("evidencia.chooseFile")
            : t("evidencia.openCamera");
  const pista = fase === "inicio" && !envioBloqueado ? (reembolso ? t("evidencia.chooseFirst") : t("evidencia.takePhotoFirst")) : null;

  const cerrada = tarea.estado === "pagado" || tarea.etapa === "aprobada" || Boolean(tarea.hashPago?.trim());
  const enviada = fase === "lista" || cerrada;
  const revisando = fase === "enviando" || esperando;
  const montoVisible = montoDeTarea(tarea);
  const calificacion = notaDeTarea(tarea);
  const mileSinTerminar = esperaAgotada && !calificacion && !avisoEnvio && !cerrada;
  const titulo = textoVisible(tarea.titulo, idioma);
  const esPdf = foto?.type === "application/pdf";
  const momentoEnvio = enviadaEn ?? (tarea.enviadaEn && !Number.isNaN(Date.parse(tarea.enviadaEn)) ? new Date(tarea.enviadaEn) : null);
  const hora = momentoEnvio ? formatearHora(momentoEnvio, idioma) : null;
  const meta = [evento ? textoVisible(evento, idioma) : null].filter(Boolean).join("");
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
          evento={evento}
          onReintentar={empezarReintento}
          onArchivo={reembolso ? () => archivoRef.current?.click() : undefined}
        />
        {reembolso ? (
          <input
            ref={archivoRef}
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp,.pdf,.jpg,.jpeg,.png,.webp"
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
        {evento ? <p className="hyto-tarea-meta">{textoVisible(evento, idioma)}</p> : null}
      </div>
      <span className="hyto-chip-monto">{montoVisible}</span>
    </header>
  );

  const vistaFoto =
    fotoUrl && !esPdf ? (
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
            <h2>{t("evidencia.mileChecking")}</h2>
            <p>{t("evidencia.fewSeconds")}</p>
          </div>
        </section>
        {vistaFoto ? (
          <div className="hyto-visor hyto-visor-chico">
            {vistaFoto}
            <span className="hyto-visor-pill">{t("evidencia.onePhoto")}</span>
          </div>
        ) : null}
        <Checklist condicion={tarea.condicion} revisando />
        <div className="hyto-actions">
          <BotonPrincipal type="button" disabled aria-busy={fase === "enviando"} className="hyto-btn-grande">
            {fase === "enviando" ? t("evidencia.sending") : t("evidencia.sentShort")}
          </BotonPrincipal>
          <p className="hyto-pista">{fase === "enviando" ? t("evidencia.sendingNote") : t("evidencia.willTell")}</p>
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
                : nombre
                  ? t("evidencia.greatJobName", { name: nombre })
                  : t("evidencia.greatJob")}
          </h1>
          {mileSinTerminar ? (
            <p role="status" className="hyto-enviada-aviso">
              {t("evidencia.mileRetry")}
            </p>
          ) : avisoEnvio ? (
            <p role="alert" className="hyto-enviada-aviso">
              {claro(avisoEnvio)}
              {t("evidencia.fixSuffix")}
            </p>
          ) : tarea.etapa === "enviada_organizador" ? (
            <p className="mt-2 text-sm leading-6 text-[var(--suave)]" role="status">
              {t("evidencia.reachedOrganizer")}
            </p>
          ) : (
            <p className="hyto-tarea-meta">{t("evidencia.greatJobSub")}</p>
          )}
        </header>
        <article className="hyto-tarjeta hyto-resumen">
          {vistaFoto ? <div className="hyto-resumen-mini">{vistaFoto}</div> : null}
          <div>
            <PastillaEstado estado={tarea.estado} />
            <h2>{titulo}</h2>
            {evento || hora ? (
              <p className="hyto-tarea-meta">{hora ? t("evidencia.sentAt", { event: evento ? textoVisible(evento, idioma) : t("comunes.event"), time: hora }) : meta}</p>
            ) : null}
            {calificacion ? (
              <div className="hyto-resumen-nota">
                <PastillaVeredicto veredicto={calificacion.veredicto} nota={calificacion.nota} />
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
        />
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
              {reembolso ? t("evidencia.sendAnother") : t("evidencia.takeAnother")}
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
      <div className="hyto-tarea-cols">
        <div className="hyto-tarea-col">
          <PanelMile />
          <div className="hyto-visor">
            {fotoUrl && esPdf ? (
              <div className="hyto-visor-vacio">{nombreArchivo ?? t("evidencia.invoicePdf")}</div>
            ) : fotoUrl ? (
              vistaFoto
            ) : fase === "camara" ? (
              <video ref={videoRef} playsInline muted aria-label={t("evidencia.camera")} />
            ) : (
              <div className="hyto-visor-vacio">
                <p>{reembolso ? t("evidencia.receiptPlaceholder") : t("evidencia.cameraOff")}</p>
                {!reembolso ? (
                  <button type="button" className="hyto-btn-line" onClick={() => void abrirCamara()}>
                    {t("evidencia.openCamera")}
                  </button>
                ) : null}
              </div>
            )}
            {fase === "foto" ? (
              <>
                <span className="hyto-visor-pill">{esPdf ? (nombreArchivo ?? t("evidencia.invoicePdf")) : t("evidencia.onePhoto")}</span>
                <button type="button" onClick={tomarOtra} className="hyto-visor-otra">
                  {reembolso ? t("evidencia.chooseAnother") : t("evidencia.takeAnother")}
                </button>
              </>
            ) : null}
          </div>
          {reembolso && (fase === "inicio" || fase === "foto") ? (
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
          {!reembolso && fase === "inicio" ? <p className="hyto-pista">{t("evidencia.galleryHint")}</p> : null}
        </div>
        <div className="hyto-tarea-col">
          <Checklist condicion={tarea.condicion} fallidos={fallidosMarcados} />
          {mostrarRevision ? (
            <dl className="hyto-tarjeta hyto-dato-leido">
              <div>
                <dt>{t("comunes.amount")}</dt>
                <dd className="hyto-amount">{formatearMonto(evidencia.monto!)}</dd>
              </div>
              <div>
                <dt>{t("comunes.date")}</dt>
                <dd className="hyto-amount">{formatearFecha(evidencia.fecha!)}</dd>
              </div>
            </dl>
          ) : null}
          {error ? (
            <p role="alert" className="hyto-error-linea">
              {claro(error)}
            </p>
          ) : null}
          <div className="hyto-actions">
            <BotonPrincipal
              type="button"
              className="hyto-btn-grande"
              disabled={envioBloqueado}
              onClick={() => {
                if (envioBloqueado) return;
                if (fase === "camara") tomarFoto();
                else if (fase === "foto") void enviar();
                else if (reembolso) archivoRef.current?.click();
                else void abrirCamara();
              }}
            >
              {accion}
            </BotonPrincipal>
            {pista ? <p className="hyto-pista">{pista}</p> : null}
          </div>
          {ejemplo ? <p className="hyto-tarea-meta">{t("evidencia.sample")}</p> : null}
        </div>
      </div>

      {reembolso ? (
        <input
          ref={archivoRef}
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp,.pdf,.jpg,.jpeg,.png,.webp"
          tabIndex={-1}
          aria-hidden="true"
          className="sr-only"
          onChange={elegirArchivo}
        />
      ) : conCaptura ? (
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
