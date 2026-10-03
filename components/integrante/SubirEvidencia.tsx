"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BotonPrincipal } from "@/components/integrante/BotonPrincipal";
import { PastillaEstado } from "@/components/integrante/EstadoTarea";
import { useModoDemo } from "@/components/sesion/InsigniaDemo";
import { useClaro, useIdioma, useTexto } from "@/components/ui/Idioma";
import { leerMemoria } from "@/lib/integrante/almacen";
import { archivoDeCamaraReciente, esFotoDeCamara } from "@/lib/integrante/fotoEnVivo";
import { formatearFecha, formatearMonto, montoDeTarea } from "@/lib/integrante/formato";
import { etiquetaEstado, etiquetaTipo, textoVisible } from "@/lib/ui/etiquetas";
import { ErrorDeEnvio, ErrorDeSesion, leerTarea, pedirTokenEvidencia, subirEvidencia } from "@/lib/integrante/rutas";
import type { Evidencia, Tarea } from "@/lib/integrante/tipos";

type Fase = "cargando" | "inicio" | "camara" | "foto" | "enviando" | "lista" | "faltante";

export function SubirEvidencia({ tareaId }: { tareaId: string }) {
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
  const demo = useModoDemo();
  const t = useTexto();
  const claro = useClaro();
  const idioma = useIdioma();

  useEffect(() => {
    let activo = true;
    const memoria = leerMemoria();
    setCargaError(null);
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

  function usarFoto(blob: Blob, nombre: string | null, captura: string | null) {
    if (fotoUrlRef.current) URL.revokeObjectURL(fotoUrlRef.current);
    const url = URL.createObjectURL(blob);
    fotoUrlRef.current = url;
    setFotoUrl(url);
    setFoto(blob);
    setNombreArchivo(nombre);
    setCapturadaEn(captura);
    setError(null);
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
        if (!blob) {
          setError("Could not take the photo.");
          return;
        }
        usarFoto(blob, null, new Date().toISOString());
      },
      "image/jpeg",
      0.9,
    );
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
    if (!archivoPermitido(archivo)) {
      setError("Choose a PDF, JPEG, PNG, or WebP file.");
      return;
    }
    usarFoto(archivo, archivo.name, null);
  }

  function elegirCaptura(evento: React.ChangeEvent<HTMLInputElement>) {
    const archivo = evento.target.files?.[0];
    evento.target.value = "";
    if (!archivo || tarea?.tipo !== "trabajo") return;
    if (!esFotoDeCamara(archivo)) {
      setError("Take the photo with the camera.");
      return;
    }
    if (!archivoDeCamaraReciente(archivo)) {
      setError("Take the photo now. Photos from the gallery are not accepted.");
      return;
    }
    usarFoto(archivo, null, new Date(archivo.lastModified).toISOString());
  }

  function soltarArchivo(evento: React.DragEvent<HTMLButtonElement>) {
    evento.preventDefault();
    if (tarea?.tipo !== "reembolso") return;
    const archivo = evento.dataTransfer.files?.[0];
    if (!archivo) return;
    if (!archivoPermitido(archivo)) {
      setError("Choose a PDF, JPEG, PNG, or WebP file.");
      return;
    }
    usarFoto(archivo, archivo.name, null);
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
      setEvidencia(resultado.evidencia);
      setAvisoEnvio(resultado.aviso);
      setFase("lista");
    } catch (err) {
      setError(err instanceof ErrorDeSesion || err instanceof ErrorDeEnvio ? err.aviso : "Could not send. Try again.");
      setFase("foto");
    } finally {
      enviandoRef.current = false;
    }
  }

  function tomarOtra() {
    setEvidencia(null);
    setAvisoEnvio(null);
    setFoto(null);
    setCapturadaEn(null);
    setNombreArchivo(null);
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
  const accion =
    fase === "camara"
      ? t("evidencia.takePhoto")
      : fase === "foto"
        ? t("evidencia.send")
        : fase === "enviando"
          ? t("evidencia.sending")
          : reembolso
            ? t("evidencia.chooseFile")
            : t("evidencia.openCamera");

  const cerrada = tarea.estado !== "pendiente";
  const enviada = fase === "lista" || cerrada;
  const montoVisible = montoDeTarea(tarea);

  return (
    <main className={`hyto-page ${enviada ? "mx-auto max-w-lg" : ""}`}>
      <header className="mb-6">
        <p className="hyto-crumb">
          <Link href="/mis-tareas">{t("tareas.title")}</Link>
          {tarea.proyectoId ? (
            <>
              <span aria-hidden="true">/</span>
              <Link href={`/eventos/${tarea.proyectoId}`}>{textoVisible(evento ?? t("comunes.event"), idioma)}</Link>
            </>
          ) : null}
        </p>
        <p className="mt-4 text-sm text-[var(--suave)]">{etiquetaTipo(tarea.tipo, idioma)}</p>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
          <h1 className="hyto-title">{enviada ? (avisoEnvio ? t("evidencia.sentAction") : t("evidencia.sent")) : fase === "foto" || fase === "enviando" ? t("evidencia.upload") : textoVisible(tarea.titulo, idioma)}</h1>
          <p className="hyto-amount text-2xl">{montoVisible}</p>
        </div>
        <p className="hyto-sub">
          {reembolso ? t("evidencia.receiptHelp") : t("evidencia.photoHelp")}
        </p>
      </header>

      {enviada ? (
        <div className="text-center">
          {avisoEnvio ? (
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-[var(--peligro)] text-2xl text-[var(--peligro)]" aria-hidden="true">
              !
            </div>
          ) : (
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--acento)] text-2xl text-[var(--sobre-acento)]" aria-hidden="true">
              ✓
            </div>
          )}
          <p className="mt-4 text-lg font-medium">{reembolso ? t("evidencia.fileSent") : t("evidencia.photoSent")}</p>
          {avisoEnvio ? (
            <p role="alert" className="mt-2 text-sm leading-6 text-[var(--peligro)]">
              {claro(avisoEnvio)}
              {t("evidencia.fixSuffix")}
            </p>
          ) : (
            <p className="mt-2 text-sm leading-6 text-[var(--suave)]">{t("evidencia.organizerNow")}</p>
          )}
          <article className="hyto-card mt-6 p-4 text-left">
            <p className="font-semibold">{textoVisible(tarea.titulo, idioma)}</p>
            <p className="mt-1 text-sm text-[var(--suave)]">{etiquetaEstado(tarea.estado, idioma)}</p>
            <div className="mt-3">
              <PastillaEstado estado={tarea.estado} />
            </div>
            <p className="hyto-amount mt-3">{montoVisible}</p>
          </article>
          <p className="mt-6 text-left text-sm text-[var(--suave)]">{t("evidencia.organizerApproves")}</p>
          <Link href="/mis-tareas" className="hyto-btn mt-6">
            {t("evidencia.back")}
          </Link>
          <p className="mt-4 text-sm text-[var(--suave)]">{t("evidencia.anotherMaybe")}</p>
        </div>
      ) : (
        <div className="hyto-split">
          <div>
            <div className="hyto-photo">
                {fotoUrl && foto?.type === "application/pdf" ? (
                  <div className="flex aspect-[4/5] items-center justify-center px-8 text-center text-sm text-[var(--suave)]">
                    {nombreArchivo ?? t("evidencia.invoicePdf")}
                  </div>
                ) : fotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={fotoUrl} alt={t("evidencia.alt")} />
                ) : fase === "camara" ? (
                  <video ref={videoRef} playsInline muted aria-label={t("evidencia.camera")} />
                ) : (
                  <div className="flex aspect-[4/5] items-center justify-center px-8 text-center text-sm text-[var(--suave)]">
                    {reembolso ? t("evidencia.receiptPlaceholder") : t("evidencia.workPlaceholder")}
                  </div>
                )}
              </div>
            {reembolso && (fase === "inicio" || fase === "foto") ? (
              <button
                type="button"
                onClick={() => archivoRef.current?.click()}
                onDragOver={(evento) => evento.preventDefault()}
                onDrop={soltarArchivo}
                className="hyto-btn-line is-dashed mt-3"
              >
                {t("evidencia.choosePdf")}
              </button>
            ) : null}
            {!reembolso && fase === "inicio" ? (
              <p className="mt-3 text-sm leading-6 text-[var(--suave)]">{t("evidencia.gallery")}</p>
            ) : null}
          </div>
          <div>
            {tarea.condicion ? (
              <div className="hyto-card p-5">
                <p className="text-sm font-medium">{t("evidencia.mustShow")}</p>
                <p className="mt-2 text-sm leading-6 text-[var(--suave)]">{textoVisible(tarea.condicion, idioma)}</p>
              </div>
            ) : null}
            {mostrarRevision ? (
              <dl className="hyto-card mt-4 grid grid-cols-2 gap-4 p-5">
                <div>
                  <dt className="text-sm text-[var(--suave)]">{t("comunes.amount")}</dt>
                  <dd className="hyto-amount mt-1 text-2xl">{formatearMonto(evidencia.monto!)}</dd>
                </div>
                <div>
                  <dt className="text-sm text-[var(--suave)]">{t("comunes.date")}</dt>
                  <dd className="hyto-amount mt-1 text-2xl">{formatearFecha(evidencia.fecha!)}</dd>
                </div>
              </dl>
            ) : null}
            <div className="hyto-actions">
              <BotonPrincipal
                type="button"
                disabled={fase === "enviando"}
                aria-busy={fase === "enviando"}
                onClick={() => {
                  if (fase === "camara") tomarFoto();
                  else if (fase === "foto") void enviar();
                  else if (reembolso) archivoRef.current?.click();
                  else void abrirCamara();
                }}
              >
                {accion}
              </BotonPrincipal>
              {fase === "enviando" ? (
                <p className="text-sm leading-6 text-[var(--suave)]" aria-live="polite">
                  {t("evidencia.sendingNote")}
                </p>
              ) : null}
              {fase === "foto" ? (
                <button type="button" onClick={tomarOtra} className="hyto-btn-line">
                  {reembolso ? t("evidencia.chooseAnother") : t("evidencia.takeAnother")}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {error ? (
        <p role="alert" className="mt-4 text-sm text-[var(--peligro)]">
          {claro(error)}
        </p>
      ) : null}

      {enviada && !cerrada ? (
        <button type="button" onClick={tomarOtra} className="hyto-btn-line mt-4">
          {reembolso ? t("evidencia.sendAnother") : t("evidencia.takeAnother")}
        </button>
      ) : null}

      {ejemplo ? (
        <p className="mt-6 text-sm leading-6 text-[var(--suave)]">{t("evidencia.sample")}</p>
      ) : null}

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
