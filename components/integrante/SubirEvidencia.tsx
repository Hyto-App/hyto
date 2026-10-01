"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BotonPrincipal } from "@/components/integrante/BotonPrincipal";
import { InsigniaDemo } from "@/components/sesion/InsigniaDemo";
import { PrepararUsdc } from "@/components/sesion/PrepararUsdc";
import { Salir } from "@/components/sesion/Salir";
import { SalirDemo } from "@/components/sesion/SalirDemo";
import { guardarEstado, guardarEvidencia, leerMemoria } from "@/lib/integrante/almacen";
import { formatearFecha, formatearMonto } from "@/lib/integrante/formato";
import { etiquetaTipo, textoVisible } from "@/lib/ui/etiquetas";
import { ErrorDeSesion, leerTarea, subirEvidencia } from "@/lib/integrante/rutas";
import type { Evidencia, Tarea } from "@/lib/integrante/tipos";

type Fase = "cargando" | "inicio" | "camara" | "foto" | "enviando" | "lista" | "faltante";

const MAX_FOTO = 4_000_000;
const TIPOS_FOTO = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif"]);

function blobDeLienzo(lienzo: HTMLCanvasElement, calidad: number): Promise<Blob | null> {
  return new Promise((resolve) => lienzo.toBlob((blob) => resolve(blob), "image/jpeg", calidad));
}

export function SubirEvidencia({ tareaId }: { tareaId: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const archivoRef = useRef<HTMLInputElement>(null);
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
  const [sinCamara, setSinCamara] = useState(false);

  useEffect(() => {
    let activo = true;
    const memoria = leerMemoria();
    leerTarea(tareaId, { miembroId: memoria.miembroId, wallet: memoria.cuentas[memoria.miembroId]?.direccion }, {
      estados: memoria.estados,
    }).then((resultado) => {
      if (!activo) return;
      if (!resultado.tarea) {
        setFase("faltante");
        return;
      }
      setTarea(resultado.tarea);
      setEjemplo(resultado.ejemplo);
      const guardada = memoria.evidencias[resultado.tarea.id];
      if (guardada) {
        setEvidencia(guardada);
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
  }, [tareaId]);

  useEffect(() => {
    montadoRef.current = true;
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

  function usarFoto(blob: Blob) {
    if (fotoUrlRef.current) URL.revokeObjectURL(fotoUrlRef.current);
    const url = URL.createObjectURL(blob);
    fotoUrlRef.current = url;
    setFotoUrl(url);
    setFoto(blob);
    setError(null);
    streamRef.current?.getTracks().forEach((pista) => pista.stop());
    streamRef.current = null;
    setFase("foto");
  }

  async function abrirCamara() {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setSinCamara(true);
      archivoRef.current?.click();
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
      setSinCamara(true);
      setError("Could not open the camera.");
    }
  }

  async function tomarFoto() {
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
    let calidad = 0.9;
    let blob = await blobDeLienzo(lienzo, calidad);
    while (blob && blob.size > MAX_FOTO && calidad > 0.45) {
      calidad -= 0.15;
      blob = await blobDeLienzo(lienzo, calidad);
    }
    if (!blob) {
      setError("Could not take the photo.");
      return;
    }
    if (blob.size > MAX_FOTO) {
      setError("The photo is too large.");
      return;
    }
    usarFoto(blob);
  }

  function elegirArchivo(evento: React.ChangeEvent<HTMLInputElement>) {
    const archivo = evento.target.files?.[0];
    evento.target.value = "";
    if (!archivo) return;
    if (archivo.size > MAX_FOTO) {
      setError("The photo is too large.");
      return;
    }
    const tipo = archivo.type.toLowerCase().split(";")[0].trim();
    if (tipo === "image/svg+xml" || (tipo && !TIPOS_FOTO.has(tipo))) {
      setError("Choose a photo.");
      return;
    }
    usarFoto(archivo);
  }

  async function enviar() {
    if (!tarea || !foto || enviandoRef.current) return;
    enviandoRef.current = true;
    setFase("enviando");
    setError(null);
    try {
      const resultado = await subirEvidencia(tarea, foto);
      if (resultado.ejemplo && !ejemplo) {
        setError("Could not send. Try again.");
        setFase("foto");
        return;
      }
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
    if (fotoUrlRef.current) URL.revokeObjectURL(fotoUrlRef.current);
    fotoUrlRef.current = null;
    setFotoUrl(null);
    setFase("inicio");
  }

  if (fase === "cargando") {
    return (
      <main>
        <p className="text-[var(--suave)]">Loading…</p>
      </main>
    );
  }

  if (fase === "faltante" || !tarea) {
    return (
      <main>
        <p className="text-lg">We couldn't find that task.</p>
        <Link href="/mis-tareas" className="mt-6 inline-block text-sm font-medium">
          Back to My tasks
        </Link>
      </main>
    );
  }

  const mostrarRevision = tarea.tipo === "reembolso" && evidencia?.monto && evidencia.fecha;
  const accion =
    fase === "camara"
      ? "Take photo"
      : fase === "foto"
        ? "Send"
        : fase === "enviando"
          ? "Sending…"
          : sinCamara
            ? "Choose photo"
            : "Open camera";

  return (
    <main>
      <header className="mb-8">
        <p className="text-sm text-[var(--suave)]">
          <Link href="/mis-tareas">My tasks</Link>
          <InsigniaDemo />
          <SalirDemo />
          <Salir className="ml-3 align-middle" />
        </p>
        <p className="mt-4 text-sm text-[var(--suave)]">{etiquetaTipo(tarea.tipo)}</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">{textoVisible(tarea.titulo)}</h1>
        {tarea.condicion ? <p className="mt-3 text-sm leading-6 text-[var(--suave)]">{textoVisible(tarea.condicion)}</p> : null}
      </header>

      {ejemplo ? null : (
        <div className="mb-6">
          <PrepararUsdc />
        </div>
      )}

      {fase === "lista" && !fotoUrl ? null : (
        <div className="overflow-hidden rounded-3xl bg-[var(--papel)]">
          {fotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={fotoUrl} alt="Evidence" className="aspect-[3/4] w-full object-cover" />
          ) : fase === "camara" ? (
            <video ref={videoRef} playsInline muted aria-label="Camera preview" className="aspect-[3/4] w-full object-cover" />
          ) : (
            <div className="flex aspect-[3/4] items-center justify-center px-8 text-center text-sm text-[var(--suave)]">
              {tarea.tipo === "reembolso" ? "Photo of the receipt" : "Photo of the work"}
            </div>
          )}
        </div>
      )}

      {mostrarRevision ? (
        <dl className="mt-6 grid grid-cols-2 gap-4 rounded-3xl bg-[var(--papel)] p-6">
          <div>
            <dt className="text-sm text-[var(--suave)]">Amount</dt>
            <dd className="mt-1 text-2xl font-semibold tracking-tight">{formatearMonto(evidencia.monto!)}</dd>
          </div>
          <div>
            <dt className="text-sm text-[var(--suave)]">Date</dt>
            <dd className="mt-1 text-2xl font-semibold tracking-tight">{formatearFecha(evidencia.fecha!)}</dd>
          </div>
        </dl>
      ) : null}

      {fase === "lista" ? (
        <p className="mt-6 text-lg font-medium">Evidence sent</p>
      ) : (
        <div className="mt-6">
          <BotonPrincipal
            type="button"
            disabled={fase === "enviando"}
            onClick={() => {
              if (fase === "camara") void tomarFoto();
              else if (fase === "foto") void enviar();
              else if (sinCamara || !navigator.mediaDevices?.getUserMedia) archivoRef.current?.click();
              else void abrirCamara();
            }}
          >
            {accion}
          </BotonPrincipal>
        </div>
      )}

      {error ? (
        <p role="alert" className="mt-4 text-sm text-[var(--pendiente-tinta)]">
          {error}
        </p>
      ) : null}

      {fase === "foto" || fase === "lista" ? (
        <button type="button" onClick={tomarOtra} className="mt-4 text-sm text-[var(--suave)]">
          Take another
        </button>
      ) : null}

      {ejemplo ? (
        <p className="mt-6 text-sm leading-6 text-[var(--suave)]">Example view, until the routes respond.</p>
      ) : null}

      <input
        ref={archivoRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif"
        capture="environment"
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
        onChange={elegirArchivo}
      />
    </main>
  );
}
