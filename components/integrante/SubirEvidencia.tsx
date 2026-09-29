"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BotonPrincipal } from "@/components/integrante/BotonPrincipal";
import { InsigniaDemo } from "@/components/sesion/InsigniaDemo";
import { SalirDemo } from "@/components/sesion/SalirDemo";
import { guardarEstado, guardarEvidencia, leerMemoria } from "@/lib/integrante/almacen";
import { formatearFecha, formatearMonto } from "@/lib/integrante/formato";
import { ErrorDeSesion, leerTarea, subirEvidencia } from "@/lib/integrante/rutas";
import type { Evidencia, Tarea } from "@/lib/integrante/tipos";

type Fase = "cargando" | "inicio" | "camara" | "foto" | "enviando" | "lista" | "faltante";

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
      if (vivo) setError("No se pudo mostrar la cámara.");
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
      setError("No se pudo abrir la cámara.");
    }
  }

  function tomarFoto() {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      setError("La cámara todavía no está lista.");
      return;
    }
    const lienzo = document.createElement("canvas");
    lienzo.width = video.videoWidth;
    lienzo.height = video.videoHeight;
    const contexto = lienzo.getContext("2d");
    if (!contexto) {
      setError("No se pudo tomar la foto.");
      return;
    }
    contexto.drawImage(video, 0, 0);
    lienzo.toBlob(
      (blob) => {
        if (!blob) {
          setError("No se pudo tomar la foto.");
          return;
        }
        usarFoto(blob);
      },
      "image/jpeg",
      0.9,
    );
  }

  function elegirArchivo(evento: React.ChangeEvent<HTMLInputElement>) {
    const archivo = evento.target.files?.[0];
    evento.target.value = "";
    if (!archivo) return;
    if (archivo.type && !archivo.type.startsWith("image/")) {
      setError("Elige una foto.");
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
      setEvidencia(resultado.evidencia);
      setEjemplo(resultado.ejemplo);
      if (resultado.ejemplo) {
        guardarEvidencia(resultado.evidencia);
        guardarEstado(tarea.id, "en revisión");
        setTarea({ ...tarea, estado: "en revisión" });
      }
      setFase("lista");
    } catch (err) {
      setError(err instanceof ErrorDeSesion ? err.aviso : "No se pudo enviar. Intenta otra vez.");
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
        <p className="text-[var(--suave)]">Cargando…</p>
      </main>
    );
  }

  if (fase === "faltante" || !tarea) {
    return (
      <main>
        <p className="text-lg">No encontramos esa tarea.</p>
        <Link href="/mis-tareas" className="mt-6 inline-block text-sm font-medium">
          Volver a Mis tareas
        </Link>
      </main>
    );
  }

  const mostrarRevision = tarea.tipo === "reembolso" && evidencia?.monto && evidencia.fecha;
  const accion =
    fase === "camara"
      ? "Tomar foto"
      : fase === "foto"
        ? "Enviar"
        : fase === "enviando"
          ? "Enviando…"
          : sinCamara
            ? "Elegir foto"
            : "Abrir cámara";

  return (
    <main>
      <header className="mb-8">
        <p className="text-sm text-[var(--suave)]">
          <Link href="/mis-tareas">Mis tareas</Link>
          <InsigniaDemo />
          <SalirDemo />
        </p>
        <p className="mt-4 text-sm capitalize text-[var(--suave)]">{tarea.tipo}</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">{tarea.titulo}</h1>
        {tarea.condicion ? <p className="mt-3 text-sm leading-6 text-[var(--suave)]">{tarea.condicion}</p> : null}
      </header>

      {fase === "lista" && !fotoUrl ? null : (
        <div className="overflow-hidden rounded-3xl bg-[var(--papel)]">
          {fotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={fotoUrl} alt="Evidencia" className="aspect-[3/4] w-full object-cover" />
          ) : fase === "camara" ? (
            <video ref={videoRef} playsInline muted aria-label="Vista previa de la cámara" className="aspect-[3/4] w-full object-cover" />
          ) : (
            <div className="flex aspect-[3/4] items-center justify-center px-8 text-center text-sm text-[var(--suave)]">
              {tarea.tipo === "reembolso" ? "Foto del comprobante" : "Foto de lo hecho"}
            </div>
          )}
        </div>
      )}

      {mostrarRevision ? (
        <dl className="mt-6 grid grid-cols-2 gap-4 rounded-3xl bg-[var(--papel)] p-6">
          <div>
            <dt className="text-sm text-[var(--suave)]">Monto</dt>
            <dd className="mt-1 text-2xl font-semibold tracking-tight">{formatearMonto(evidencia.monto!)}</dd>
          </div>
          <div>
            <dt className="text-sm text-[var(--suave)]">Fecha</dt>
            <dd className="mt-1 text-2xl font-semibold tracking-tight">{formatearFecha(evidencia.fecha!)}</dd>
          </div>
        </dl>
      ) : null}

      {fase === "lista" ? (
        <p className="mt-6 text-lg font-medium">Evidencia enviada</p>
      ) : (
        <div className="mt-6">
          <BotonPrincipal
            type="button"
            disabled={fase === "enviando"}
            onClick={() => {
              if (fase === "camara") tomarFoto();
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
          Tomar otra
        </button>
      ) : null}

      {ejemplo ? (
        <p className="mt-6 text-sm leading-6 text-[var(--suave)]">Vista de ejemplo, hasta que las rutas respondan.</p>
      ) : null}

      <input
        ref={archivoRef}
        type="file"
        accept="image/*"
        capture="environment"
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
        onChange={elegirArchivo}
      />
    </main>
  );
}
