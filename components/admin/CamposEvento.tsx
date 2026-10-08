"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTexto } from "@/components/ui/Idioma";
import { contadorCerca, errorPortada } from "@/lib/ui/campos-evento";

export function IconoImagen() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="3" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="m4 18 5-5 4 4 3-3 4 4" />
    </svg>
  );
}

export function IconoCandado() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

/** Dashed dropzone over a visually hidden file input; the label and the input keep the same id. */
export function ZonaPortada({
  id,
  archivo,
  nombreEvento,
  etiqueta,
  ayudaId,
  onArchivo,
}: {
  id: string;
  archivo: File | null;
  nombreEvento: string;
  etiqueta: string;
  ayudaId: string;
  onArchivo: (archivo: File | null) => void;
}) {
  const t = useTexto();
  const entrada = useRef<HTMLInputElement>(null);
  const [vista, setVista] = useState<string | null>(null);
  const [arrastre, setArrastre] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!archivo) {
      setVista(null);
      return;
    }
    const url = URL.createObjectURL(archivo);
    setVista(url);
    return () => URL.revokeObjectURL(url);
  }, [archivo]);

  function elegir(lista: FileList | null) {
    const elegido = lista?.[0] ?? null;
    const falla = elegido ? errorPortada(elegido) : null;
    if (elegido && falla) {
      if (entrada.current) entrada.current.value = "";
      setError(falla === "type" ? t("eventos.coverType") : t("eventos.coverSize"));
      return;
    }
    setError(null);
    onArchivo(elegido);
  }

  function abrir() {
    entrada.current?.click();
  }

  function quitar() {
    if (entrada.current) entrada.current.value = "";
    setError(null);
    onArchivo(null);
  }

  return (
    <div>
      <label className="block text-sm text-[var(--suave)]" htmlFor={id}>
        {etiqueta}
      </label>
      <div className="mt-2">
        {archivo && vista ? (
          <div>
            <div className="hyto-marco-16-9">
              {/* eslint-disable-next-line @next/next/no-img-element -- local object URL */}
              <img src={vista} alt={t("eventos.coverPreviewAlt", { name: nombreEvento.trim() || archivo.name })} />
            </div>
            <div className="hyto-zona-archivo">
              <span className="hyto-zona-nombre">{archivo.name}</span>
              <span className="flex gap-2">
                <button type="button" onClick={abrir} className="hyto-btn-line is-inline px-4">
                  {t("eventos.coverReplace")}
                </button>
                <button type="button" onClick={quitar} className="hyto-btn-line is-inline px-4">
                  {t("eventos.coverRemove")}
                </button>
              </span>
            </div>
          </div>
        ) : (
          <div
            className={`hyto-zona${arrastre ? " is-arrastre" : ""}`}
            onClick={abrir}
            onDragOver={(evento) => {
              evento.preventDefault();
              setArrastre(true);
            }}
            onDragLeave={() => setArrastre(false)}
            onDrop={(evento) => {
              evento.preventDefault();
              setArrastre(false);
              elegir(evento.dataTransfer.files);
            }}
          >
            <IconoImagen />
            <span>{t("eventos.coverDrop")}</span>
            <span className="hyto-zona-ayuda">{t("eventos.coverDropHelp")}</span>
          </div>
        )}
        <input
          ref={entrada}
          id={id}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          aria-describedby={ayudaId}
          tabIndex={archivo ? -1 : 0}
          onChange={(evento) => elegir(evento.target.files)}
          className="sr-only"
        />
        {error ? (
          <p role="alert" className="mt-2 text-sm text-[var(--peligro)]">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/** Textarea that grows with its text (the CSS caps it at about 12 rows). */
export function AreaTexto({
  id,
  valor,
  max,
  filas,
  ayudaId,
  onCambio,
}: {
  id: string;
  valor: string;
  max: number;
  filas: number;
  ayudaId: string;
  onCambio: (valor: string) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const area = ref.current;
    if (!area) return;
    area.style.height = "auto";
    area.style.height = `${area.scrollHeight}px`;
  }, [valor]);
  return (
    <textarea
      ref={ref}
      id={id}
      value={valor}
      maxLength={max}
      rows={filas}
      aria-describedby={ayudaId}
      onChange={(evento) => onCambio(evento.target.value)}
      className="hyto-input hyto-area mt-2"
    />
  );
}

/** Right-aligned counter on its own line. The live region speaks only when the 90 % line is crossed. */
export function Contador({ largo, max }: { largo: number; max: number }) {
  const t = useTexto();
  const cerca = contadorCerca(largo, max);
  return (
    <p className={`hyto-contador${cerca ? " is-alto" : ""}`}>
      {largo}/{max}
      <span className="sr-only" aria-live="polite">
        {cerca ? t("eventos.counterNear") : ""}
      </span>
    </p>
  );
}
