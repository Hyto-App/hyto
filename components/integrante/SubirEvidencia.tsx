"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BotonPrincipal } from "@/components/integrante/BotonPrincipal";
import { PastillaEstado } from "@/components/integrante/EstadoTarea";
import { useModoDemo } from "@/components/sesion/InsigniaDemo";
import { guardarEstado, guardarEvidencia, leerMemoria } from "@/lib/integrante/almacen";
import { archivoDeCamaraReciente, esFotoDeCamara } from "@/lib/integrante/fotoEnVivo";
import { formatearFecha, formatearMonto, montoDeTarea } from "@/lib/integrante/formato";
import { etiquetaEstado, etiquetaTipo, textoVisible } from "@/lib/ui/etiquetas";
import { ErrorDeSesion, leerTarea, pedirTokenEvidencia, subirEvidencia } from "@/lib/integrante/rutas";
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
  const [conCaptura, setConCaptura] = useState(false);
  const [capturadaEn, setCapturadaEn] = useState<string | null>(null);
  const [nombreArchivo, setNombreArchivo] = useState<string | null>(null);
  const [cargaError, setCargaError] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);
  const [evento, setEvento] = useState<string | null>(null);
  const demo = useModoDemo();

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
      setEjemplo(resultado.ejemplo);
      if (resultado.ejemplo) {
        guardarEvidencia(resultado.evidencia);
        guardarEstado(tarea.id, "en revisión");
        setTarea({ ...tarea, estado: "en revisión" });
      }
      setFase("lista");
    } catch (err) {
      setError(err instanceof ErrorDeSesion ? err.aviso : "Could not send. Try again.");
      setFase("foto");
    } finally {
      enviandoRef.current = false;
    }
  }

  function tomarOtra() {
    setEvidencia(null);
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
        <p className="text-[var(--suave)]">Loading…</p>
      </main>
    );
  }

  if (fase === "faltante" || !tarea) {
    return (
      <main className="hyto-page">
        <p className="text-lg" role="alert">
          {cargaError ?? "We couldn't find that task."}
        </p>
        {cargaError ? (
          <button type="button" className="hyto-btn mt-6 max-w-xs" onClick={() => setIntento((actual) => actual + 1)}>
            Try again
          </button>
        ) : (
          <Link href="/mis-tareas" className="mt-6 inline-block text-sm font-medium">
            Back to My tasks
          </Link>
        )}
      </main>
    );
  }

  const mostrarRevision = tarea.tipo === "reembolso" && evidencia?.monto && evidencia.fecha;
  const reembolso = tarea.tipo === "reembolso";
  const accion =
    fase === "camara"
      ? "Take photo"
      : fase === "foto"
        ? "Send"
        : fase === "enviando"
          ? "Sending…"
          : reembolso
            ? "Choose a file"
            : "Open camera";

  const cerrada = tarea.estado !== "pendiente";
  const enviada = fase === "lista" || cerrada;
  const montoVisible = montoDeTarea(tarea);

  return (
    <main className={`hyto-page ${enviada ? "mx-auto max-w-lg" : ""}`}>
      <header className="mb-6">
        <p className="hyto-crumb">
          <Link href="/mis-tareas">My tasks</Link>
          {tarea.proyectoId ? (
            <>
              <span aria-hidden="true">/</span>
              <Link href={`/eventos/${tarea.proyectoId}`}>{textoVisible(evento ?? "Event")}</Link>
            </>
          ) : null}
        </p>
        <p className="mt-4 text-sm text-[var(--suave)]">{etiquetaTipo(tarea.tipo)}</p>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
          <h1 className="hyto-title">{enviada ? "Evidence sent" : fase === "foto" || fase === "enviando" ? "Upload evidence" : textoVisible(tarea.titulo)}</h1>
          <p className="hyto-amount text-2xl">{montoVisible}</p>
        </div>
        <p className="hyto-sub">
          {reembolso
            ? "Upload the receipt or invoice as a PDF or an image. The organizer checks it and sends the payment."
            : "Photograph the finished work with the camera. The organizer checks it and sends the payment."}
        </p>
      </header>

      {enviada ? (
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--acento)] text-2xl text-[var(--sobre-acento)]" aria-hidden="true">
            ✓
          </div>
          <p className="mt-4 text-lg font-medium">{reembolso ? "File sent" : "Photo sent"}</p>
          <p className="mt-2 text-sm leading-6 text-[var(--suave)]">The organizer can review it now. This task shows Paid after they send the money.</p>
          <article className="hyto-card mt-6 p-4 text-left">
            <p className="font-semibold">{textoVisible(tarea.titulo)}</p>
            <p className="mt-1 text-sm text-[var(--suave)]">{etiquetaEstado(tarea.estado)}</p>
            <div className="mt-3">
              <PastillaEstado estado={tarea.estado} />
            </div>
            <p className="hyto-amount mt-3">{montoVisible}</p>
          </article>
          <p className="mt-6 text-left text-sm text-[var(--suave)]">The organizer approves, then the payment leaves the escrow.</p>
          <Link href="/mis-tareas" className="hyto-btn mt-6">
            Back to My tasks
          </Link>
          <p className="mt-4 text-sm text-[var(--suave)]">If the photo isn't clear, the organizer may ask for another one.</p>
        </div>
      ) : (
        <div className="hyto-split">
          <div>
            <div className="hyto-photo">
                {fotoUrl && foto?.type === "application/pdf" ? (
                  <div className="flex aspect-[4/5] items-center justify-center px-8 text-center text-sm text-[var(--suave)]">
                    {nombreArchivo ?? "Invoice PDF"}
                  </div>
                ) : fotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={fotoUrl} alt="Evidence" />
                ) : fase === "camara" ? (
                  <video ref={videoRef} playsInline muted aria-label="Camera preview" />
                ) : (
                  <div className="flex aspect-[4/5] items-center justify-center px-8 text-center text-sm text-[var(--suave)]">
                    {reembolso ? "PDF or image of the receipt" : "Photo of the work"}
                  </div>
                )}
              </div>
            {reembolso && (fase === "inicio" || fase === "foto") ? (
              <button
                type="button"
                onClick={() => archivoRef.current?.click()}
                onDragOver={(evento) => evento.preventDefault()}
                onDrop={soltarArchivo}
                className="mt-3 w-full rounded-2xl border border-dashed border-[var(--borde)] px-4 py-4 text-sm text-[var(--suave)]"
              >
                Choose a PDF or image
              </button>
            ) : null}
            {!reembolso && fase === "inicio" ? (
              <p className="mt-3 text-sm leading-6 text-[var(--suave)]">Take the photo now. Photos from the gallery are not accepted.</p>
            ) : null}
          </div>
          <div>
            {tarea.condicion ? (
              <div className="hyto-card p-5">
                <p className="text-sm font-medium">Your photo must show</p>
                <p className="mt-2 text-sm leading-6 text-[var(--suave)]">{textoVisible(tarea.condicion)}</p>
              </div>
            ) : null}
            {mostrarRevision ? (
              <dl className="hyto-card mt-4 grid grid-cols-2 gap-4 p-5">
                <div>
                  <dt className="text-sm text-[var(--suave)]">Amount</dt>
                  <dd className="hyto-amount mt-1 text-2xl">{formatearMonto(evidencia.monto!)}</dd>
                </div>
                <div>
                  <dt className="text-sm text-[var(--suave)]">Date</dt>
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
                  Sending the photo. The recommendation can take a few seconds.
                </p>
              ) : null}
              {fase === "foto" ? (
                <button type="button" onClick={tomarOtra} className="hyto-btn-line">
                  {reembolso ? "Choose another file" : "Take another"}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {error ? (
        <p role="alert" className="mt-4 text-sm text-[var(--peligro)]">
          {error}
        </p>
      ) : null}

      {enviada && !cerrada ? (
        <button type="button" onClick={tomarOtra} className="mt-4 text-sm text-[var(--suave)]">
          {reembolso ? "Send another file" : "Take another"}
        </button>
      ) : null}

      {ejemplo ? (
        <p className="mt-6 text-sm leading-6 text-[var(--suave)]">Sample task, until your own tasks load.</p>
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
