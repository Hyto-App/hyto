"use client";

import Link from "next/link";
import { Fragment, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTexto } from "@/components/ui/Idioma";
import { Mile } from "@/components/ui/Mile";
import { usePathname } from "next/navigation";
import {
  ATAJOS,
  buscarPreguntas,
  inicioPara,
  partesRespuesta,
  preguntasPara,
  siguientesPara,
  tiemposPartes,
  type IdPregunta,
  type PreguntaVisible,
  type Publico,
} from "@/lib/ui/ayuda";
import { teclaDialogo } from "@/lib/ui/dialogo";
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

function publicoDeRuta(ruta: string | null): Publico {
  if (!ruta) return "todos";
  if (ruta.startsWith("/mis-tareas") || ruta.startsWith("/tareas/")) return "voluntario";
  if (ruta.startsWith("/eventos") || ruta.startsWith("/revision/") || ruta.startsWith("/informe")) return "organizador";
  return "todos";
}

type Turno ={ clave: number; id: IdPregunta };

function movimientoReducido(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Fixed answers told as a short chat. Search only filters the questions. */
export function AyudaMile({ abierto, alCerrar, devolver }: Props) {
  const t = useTexto();
  // No stored role: the shortcuts follow the view. Funding screens ask the organizer's questions, task screens the volunteer's.
  const publico = publicoDeRuta(usePathname());
  const panel = useRef<HTMLDivElement>(null);
  const campo = useRef<HTMLInputElement>(null);
  const charla = useRef<HTMLDivElement>(null);
  const fin = useRef<HTMLDivElement>(null);
  const siguiente = useRef(0);
  const titulo = useId();
  const [consulta, setConsulta] = useState("");
  const [todas, setTodas] = useState(false);
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [mostradas, setMostradas] = useState(0);
  const [reducido, setReducido] = useState(true);

  const preguntas = useMemo<PreguntaVisible[]>(
    () =>
      preguntasPara(publico).map((id) => ({
        id,
        pregunta: t(`ayuda.${id}Q`),
        respuesta: t(`ayuda.${id}A`),
      })),
    [t, publico],
  );
  const porId = useMemo(() => new Map(preguntas.map((item) => [item.id, item])), [preguntas]);
  const ultimo = turnos.at(-1) ?? null;
  const partesUltimo = ultimo ? partesRespuesta(porId.get(ultimo.id)?.respuesta ?? "") : [];
  const escribiendo = ultimo !== null && mostradas < partesUltimo.length;

  const buscada = consulta.trim() !== "";
  const chips: PreguntaVisible[] = buscada
    ? buscarPreguntas(preguntas, consulta)
    : todas
      ? preguntas
      : escribiendo
        ? []
        : (ultimo ? siguientesPara(ultimo.id, publico, turnos.map((turno) => turno.id)) : inicioPara(publico)).flatMap((id) => porId.get(id) ?? []);

  useEffect(() => {
    if (!abierto) return;
    setConsulta("");
    setTodas(false);
    setTurnos([]);
    setMostradas(0);
    setReducido(movimientoReducido());
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

  // One bubble at a time, each after "Mile is typing". Reduced motion already showed them all.
  const claveUltimo = ultimo?.clave ?? null;
  const cantidad = partesUltimo.length;
  useEffect(() => {
    if (claveUltimo === null || reducido) return;
    const relojes = tiemposPartes(cantidad, false).map((ms, indice) => window.setTimeout(() => setMostradas(indice + 1), ms));
    return () => relojes.forEach((reloj) => window.clearTimeout(reloj));
  }, [claveUltimo, cantidad, reducido]);

  useEffect(() => {
    if (turnos.length === 0) return;
    fin.current?.scrollIntoView?.({ block: "nearest", behavior: reducido ? "auto" : "smooth" });
  }, [turnos.length, mostradas, reducido]);

  // While searching, only the matching questions show, from the top of the panel.
  useEffect(() => {
    if (buscada && panel.current) panel.current.scrollTop = 0;
  }, [buscada, consulta]);

  if (!abierto || typeof document === "undefined") return null;

  function preguntar(id: IdPregunta) {
    const quieto = movimientoReducido();
    const clave = siguiente.current++;
    setReducido(quieto);
    setConsulta("");
    setTodas(false);
    setTurnos((antes) => [...antes, { clave, id }]);
    setMostradas(quieto ? partesRespuesta(porId.get(id)?.respuesta ?? "").length : 0);
    // The chip that was tapped goes away while Mile types: keep focus inside the dialog.
    charla.current?.focus({ preventScroll: true });
  }

  function elegirAtajo(atajo: (typeof ATAJOS)[number]) {
    if ("faq" in atajo && atajo.faq) {
      preguntar(atajo.faq);
      return;
    }
    if (atajo.id === "faq") {
      setConsulta("");
      setTurnos([]);
      setMostradas(0);
      setTodas(true);
      return;
    }
    alCerrar();
  }

  const listaChips =
    chips.length > 0 ? (
      <div className="hyto-ayuda-chips" role="group" aria-label={ultimo && !buscada && !todas ? t("ayuda.siguientes") : t("ayuda.preguntas")}>
        {chips.map((item) => (
          <button key={item.id} type="button" className="hyto-ayuda-chip" onClick={() => preguntar(item.id)}>
            {item.pregunta}
          </button>
        ))}
      </div>
    ) : buscada ? (
      <p className="hyto-ayuda-vacio">{t("ayuda.vacio")}</p>
    ) : null;

  return createPortal(
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
          <Mile estado={escribiendo ? "leyendo" : "reposo"} tamano={40} />
          <h2 id={titulo}>{t("ayuda.titulo")}</h2>
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
            onChange={(evento) => setConsulta(evento.target.value)}
          />
        </label>
        {/* Search results go right under the field. The shortcuts and the conversation step aside until the field is empty. */}
        {buscada ? listaChips : null}
        <div className="hyto-ayuda-atajos" hidden={buscada} role="group" aria-label={t("ayuda.atajos")}>
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
        <div ref={charla} className="hyto-ayuda-charla" hidden={buscada} role="log" aria-live="polite" aria-label={t("ayuda.titulo")} tabIndex={-1}>
          <div className="hyto-ayuda-fila is-mile">
            <div className="hyto-ayuda-burbujas">
              <p className="hyto-ayuda-burbuja">{t("ayuda.saludo")}</p>
            </div>
          </div>
          {turnos.map((turno) => {
            const item = porId.get(turno.id);
            if (!item) return null;
            const actual = turno === ultimo;
            const partes = partesRespuesta(item.respuesta);
            const vistas = actual ? partes.slice(0, mostradas) : partes;
            return (
              <Fragment key={turno.clave}>
                <div className="hyto-ayuda-fila is-persona">
                  <p className="hyto-ayuda-burbuja is-persona">
                    <span className="sr-only">{t("ayuda.usted")}: </span>
                    {item.pregunta}
                  </p>
                </div>
                <div className="hyto-ayuda-fila is-mile">
                  <div className="hyto-ayuda-burbujas">
                    {vistas.map((parte, indice) => (
                      <p key={indice} className="hyto-ayuda-burbuja">
                        {indice === 0 ? <span className="sr-only">{t("ayuda.mile")}: </span> : null}
                        {parte}
                      </p>
                    ))}
                    {actual && escribiendo ? (
                      <div className="hyto-ayuda-escribiendo" aria-hidden="true">
                        <span className="hyto-ayuda-burbuja hyto-ayuda-puntos">
                          <i />
                          <i />
                          <i />
                        </span>
                        <span>{t("ayuda.escribiendo")}</span>
                      </div>
                    ) : null}
                  </div>
                </div>
              </Fragment>
            );
          })}
          <div ref={fin} />
        </div>
        {buscada ? null : listaChips}
      </div>
    </div>,
    document.body,
  );
}
