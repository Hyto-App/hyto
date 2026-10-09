"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useTexto } from "@/components/ui/Idioma";
import { Mile } from "@/components/ui/Mile";
import { PresentacionMile } from "@/components/admin/PresentacionMile";
import { ATAJOS, PREGUNTAS, buscarPreguntas, type IdPregunta, type PreguntaVisible } from "@/lib/ui/ayuda";
import { elementosFoco, teclaDialogo } from "@/lib/ui/dialogo";
import type { Clave } from "@/lib/ui/diccionario";

const CLAVE_ATAJO: Record<(typeof ATAJOS)[number]["id"], Clave> = {
  tareas: "ayuda.atajoTareas",
  evidencia: "ayuda.atajoEvidencia",
  pago: "ayuda.atajoPago",
  faq: "ayuda.atajoFaq",
};

type Props = {
  abierto: boolean;
  alCerrar: () => void;
  devolver: HTMLElement | null;
};

/** Fixed answers. Search only filters this list. */
export function AyudaMile({ abierto, alCerrar, devolver }: Props) {
  const t = useTexto();
  const panel = useRef<HTMLDivElement>(null);
  const campo = useRef<HTMLInputElement>(null);
  const titulo = useId();
  const [consulta, setConsulta] = useState("");
  const [abierta, setAbierta] = useState<IdPregunta | null>(null);

  const preguntas = useMemo<PreguntaVisible[]>(
    () =>
      PREGUNTAS.map((id) => ({
        id,
        pregunta: t(`ayuda.${id}Q`),
        respuesta: t(`ayuda.${id}A`),
      })),
    [t],
  );
  const visibles = buscarPreguntas(preguntas, consulta);
  const elegida = visibles.find((item) => item.id === abierta) ?? null;

  useEffect(() => {
    if (!abierto) return;
    setConsulta("");
    setAbierta(null);
  }, [abierto]);

  useEffect(() => {
    if (!abierto) return;
    const raiz = panel.current;
    if (!raiz) return;
    campo.current?.focus();
    function tecla(evento: KeyboardEvent) {
      if (!panel.current) return;
      teclaDialogo(evento, panel.current, alCerrar);
    }
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("keydown", tecla);
      devolver?.focus();
    };
  }, [abierto, alCerrar, devolver]);

  if (!abierto) return null;

  function elegirAtajo(atajo: (typeof ATAJOS)[number]) {
    if ("faq" in atajo && atajo.faq) {
      setConsulta("");
      setAbierta(atajo.faq);
      return;
    }
    if (atajo.id === "faq") {
      setConsulta("");
      setAbierta(null);
      return;
    }
    alCerrar();
  }

  return (
    <div className="hyto-capa hyto-capa-ayuda" onMouseDown={alCerrar}>
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titulo}
        className="hyto-ayuda"
        onMouseDown={(evento) => evento.stopPropagation()}
      >
        <header className="hyto-ayuda-cabeza">
          <Mile estado="cara-feliz" tamano={40} />
          <div className="min-w-0 flex-1">
            <h2 id={titulo}>{t("ayuda.titulo")}</h2>
            <p className="hyto-ayuda-intro">{t("ayuda.intro")}</p>
            <PresentacionMile />
          </div>
          <button type="button" className="hyto-ayuda-cerrar" onClick={alCerrar} aria-label={t("ayuda.cerrar")}>
            ×
          </button>
        </header>
        <label className="hyto-ayuda-buscar">
          <span className="sr-only">{t("ayuda.buscar")}</span>
          <input
            ref={campo}
            type="search"
            value={consulta}
            placeholder={t("ayuda.placeholder")}
            onChange={(evento) => {
              setConsulta(evento.target.value);
              setAbierta(null);
            }}
          />
        </label>
        <div className="hyto-ayuda-atajos" role="group" aria-label={t("ayuda.atajos")}>
          {ATAJOS.map((atajo) =>
            "href" in atajo && atajo.href ? (
              <Link key={atajo.id} href={atajo.href} className="hyto-ayuda-atajo" onClick={() => elegirAtajo(atajo)}>
                {t(CLAVE_ATAJO[atajo.id])}
              </Link>
            ) : (
              <button key={atajo.id} type="button" className="hyto-ayuda-atajo" onClick={() => elegirAtajo(atajo)}>
                {t(CLAVE_ATAJO[atajo.id])}
              </button>
            ),
          )}
        </div>
        {elegida ? (
          <article className="hyto-ayuda-respuesta" aria-live="polite">
            <h3>{elegida.pregunta}</h3>
            <p>{elegida.respuesta}</p>
            <button type="button" className="hyto-btn-line" onClick={() => setAbierta(null)}>
              {t("ayuda.preguntas")}
            </button>
          </article>
        ) : (
          <ul className="hyto-ayuda-lista">
            {visibles.length === 0 ? <li className="hyto-ayuda-vacio">{t("ayuda.vacio")}</li> : null}
            {visibles.map((item) => (
              <li key={item.id}>
                <button type="button" onClick={() => setAbierta(item.id)}>
                  {item.pregunta}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
