"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { EtiquetasNota } from "@/components/admin/EtiquetasNota";
import { PastillaVeredicto } from "@/components/admin/PastillaVeredicto";
import { BadgeTarea } from "@/components/integrante/EstadoTarea";
import { useModoDemo } from "@/components/sesion/InsigniaDemo";
import { EstadoVacio } from "@/components/ui/EstadoVacio";
import { useClaro, useIdioma, useTexto } from "@/components/ui/Idioma";
import { Icono } from "@/components/ui/Marca";
import { Mile } from "@/components/ui/Mile";
import { MileAnimada } from "@/components/ui/MileAnimada";
import { Skeleton } from "@/components/ui/Skeleton";
import { presentarUsdc, recibidoDeCampos, unidadesUsdc } from "@/lib/escrow/recibido";
import { agruparPorEvento, idsMejorPagadas, ordenarPorPago, type OrdenTareas } from "@/lib/integrante/orden-pago";
import { montoUsdc } from "@/lib/integrante/revision";
import { puntosDeCondicion } from "@/lib/integrante/puntos";
import { contarEnRevision } from "@/lib/integrante/contadores";
import { listarTareas } from "@/lib/integrante/rutas";
import { esperaRevision, INTERVALO_SEGUIMIENTO_MS, reintentoEnLista, seguirEnLista } from "@/lib/integrante/seguimiento";
import type { EstadoTarea, Tarea } from "@/lib/integrante/tipos";
import { cuandoVence } from "@/lib/integrante/vence";
import { esMimeDocumental } from "@/lib/evidencia/tipo";
import { etiquetaDificultad, etiquetaPrioridad, etiquetaTipo, textoVisible } from "@/lib/ui/etiquetas";
import { claveSaludo, franjaDe, primerNombre } from "@/lib/ui/saludo";

type Filtro = "all" | EstadoTarea;

function InsigniasClasificacion({ tarea }: { tarea: Tarea }) {
  const idioma = useIdioma();
  const prioridad = etiquetaPrioridad(tarea.prioridad, idioma);
  const dificultad = etiquetaDificultad(tarea.dificultad, idioma);
  if (!prioridad && !dificultad) return null;
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      {prioridad ? (
        <span className="hyto-pill hyto-pill-ok">
          <i className="hyto-dot" aria-hidden="true" />
          {prioridad}
        </span>
      ) : null}
      {dificultad ? (
        <span className="hyto-pill hyto-pill-muted">
          <i className="hyto-dot" aria-hidden="true" />
          {dificultad}
        </span>
      ) : null}
    </div>
  );
}

function totalRecibido(tareas: readonly Tarea[]): string {
  let total = 0n;
  for (const tarea of tareas) {
    if (tarea.estado !== "pagado") continue;
    const plano = recibidoDeCampos(tarea);
    const unidades = plano ? unidadesUsdc(plano) : null;
    if (unidades !== null) total += unidades;
  }
  return presentarUsdc(total);
}

function cifra(valor: number, idioma: "en" | "es"): string {
  return valor.toLocaleString(idioma === "es" ? "es-CR" : "en-US", {
    minimumFractionDigits: Number.isInteger(valor) ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

function Monto({ tarea }: { tarea: Tarea }) {
  const t = useTexto();
  const idioma = useIdioma();
  if (tarea.estado === "pagado") {
    const recibido = montoUsdc(tarea);
    if (!recibido) return null;
    return (
      <span className="hyto-monto">
        {recibido}
        <small>USDC</small>
      </span>
    );
  }
  const valor = cifra(Number(tarea.tope ?? tarea.monto) || 0, idioma);
  return (
    <span className="hyto-monto">
      {tarea.tipo === "reembolso" ? t("tareas.upTo", { monto: valor }) : valor}
      <small>USDC</small>
    </span>
  );
}

function Metricas({ ganado, revision, pendientes, className = "" }: { ganado: string; revision: number; pendientes: number; className?: string }) {
  const t = useTexto();
  return (
    <div className={`hyto-metricas ${className}`.trim()}>
      <div className="hyto-metrica-ganado">
        <b>{ganado}</b>
        <span>{t("tareas.earnedUsdc", { amount: "USDC" })}</span>
      </div>
      <div>
        <b>{revision}</b>
        <span>{t("tareas.inReviewShort")}</span>
      </div>
      <div>
        <b>{pendientes}</b>
        <span>{t("tareas.toDoShort")}</span>
      </div>
    </div>
  );
}

function ComoFunciona() {
  const t = useTexto();
  return (
    <section className="hyto-tarjeta hyto-como" aria-labelledby="como-funciona">
      <h2 id="como-funciona">{t("tareas.howItWorks")}</h2>
      <ol>
        <li>{t("tareas.step1")}</li>
        <li>{t("tareas.step2")}</li>
        <li>{t("tareas.step3")}</li>
      </ol>
    </section>
  );
}

function Saludo({ nombre }: { nombre: string | null }) {
  const t = useTexto();
  const [ahora, setAhora] = useState<Date | null>(null);
  const [quieto, setQuieto] = useState(false);

  useEffect(() => {
    setAhora(new Date());
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const aplicar = () => setQuieto(media.matches);
    aplicar();
    media.addEventListener("change", aplicar);
    return () => media.removeEventListener("change", aplicar);
  }, []);

  const persona = primerNombre(nombre);
  const frase = ahora ? t(claveSaludo(franjaDe(ahora), persona !== null), persona ? { name: persona } : undefined) : t("tareas.title");

  return (
    <div className="hyto-saludo">
      {quieto ? <Mile estado="cara-feliz" tamano={72} /> : <MileAnimada estado="saludo" tamano={72} />}
      <div className="min-w-0">
        <p className="hyto-eyebrow">{t("tareas.title")}</p>
        <h1 className="hyto-h1">{frase}</h1>
      </div>
    </div>
  );
}

function Cargando() {
  const t = useTexto();
  return (
    <div aria-busy="true" aria-live="polite">
      <div className="hyto-tarjeta flex items-center gap-3 p-4">
        <MileAnimada estado="buscando" tamano={56} />
        <p className="text-sm text-[var(--suave)]">{t("tareas.loadingMile")}</p>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <Skeleton alto={64} />
        <Skeleton alto={64} />
        <Skeleton alto={64} />
      </div>
      <Skeleton alto={52} radio={16} className="mt-4" />
      <div className="mt-4 grid gap-3">
        <Skeleton alto={120} radio={20} />
        <Skeleton alto={120} radio={20} />
      </div>
    </div>
  );
}

export function MisTareas({ nombre = null }: { nombre?: string | null }) {
  const demo = useModoDemo();
  const t = useTexto();
  const claro = useClaro();
  const idioma = useIdioma();
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [nombres, setNombres] = useState<Record<string, string>>({});
  const [ejemplo, setEjemplo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lista, setLista] = useState(false);
  const [filtro, setFiltro] = useState<Filtro>("all");
  const [orden, setOrden] = useState<OrdenTareas>("defecto");
  const [menuOrden, setMenuOrden] = useState(false);
  const [intento, setIntento] = useState(0);
  const [reloj, setReloj] = useState(() => Date.now());
  const vistosRef = useRef(new Map<string, number>());

  useEffect(() => {
    let activo = true;
    let esperaCarga = 0;
    setLista(false);
    setError(null);
    const cargar = (vez: number) => {
      listarTareas({ miembroId: "" }, { muestra: demo }).then((resultado) => {
        if (!activo) return;
        if (resultado.error && vez < 2) {
          esperaCarga = window.setTimeout(() => cargar(vez + 1), 400);
          return;
        }
        setTareas(resultado.tareas);
        setEjemplo(resultado.ejemplo);
        setError(resultado.error);
        setLista(true);
      });
    };
    cargar(0);
    const alMostrar = (evento: PageTransitionEvent) => {
      if (evento.persisted) cargar(2);
    };
    window.addEventListener("pageshow", alMostrar);
    void fetch("/api/proyectos", { cache: "no-store" })
      .then(async (respuesta) => (respuesta.ok ? respuesta.json() : null))
      .then((cuerpo: { proyectos?: { id: string; nombre: string }[] } | null) => {
        if (!activo || !cuerpo?.proyectos) return;
        const mapa: Record<string, string> = {};
        for (const evento of cuerpo.proyectos) mapa[evento.id] = evento.nombre;
        setNombres(mapa);
      })
      .catch(() => undefined);
    return () => {
      activo = false;
      window.clearTimeout(esperaCarga);
      window.removeEventListener("pageshow", alMostrar);
    };
  }, [demo, intento]);

  if (lista) {
    for (const tarea of tareas) {
      if (esperaRevision(tarea) && !vistosRef.current.has(tarea.id)) vistosRef.current.set(tarea.id, reloj);
    }
  }
  const haySeguimiento = lista && !ejemplo && !error && seguirEnLista(tareas, reloj, vistosRef.current);

  useEffect(() => {
    if (!haySeguimiento) return;
    let activo = true;
    let volando = false;
    const id = window.setInterval(() => {
      setReloj(Date.now());
      if (volando) return;
      volando = true;
      void listarTareas({ miembroId: "" }, { muestra: demo })
        .then((resultado) => {
          if (!activo || resultado.error || resultado.ejemplo) return;
          setTareas(resultado.tareas);
        })
        .finally(() => {
          volando = false;
        });
    }, INTERVALO_SEGUIMIENTO_MS);
    return () => {
      activo = false;
      window.clearInterval(id);
    };
  }, [haySeguimiento, demo]);

  const visibles = filtro === "all" ? tareas : tareas.filter((tarea) => tarea.estado === filtro);
  const cuenta = (estado: EstadoTarea) => tareas.filter((tarea) => tarea.estado === estado).length;
  const mejores = idsMejorPagadas(tareas);
  const porEvento = agruparPorEvento(ordenarPorPago(visibles, orden), orden === "defecto" ? "unir" : "seguir");
  const pendientes = cuenta("pendiente");
  const ganado = totalRecibido(tareas);
  const enRevision = contarEnRevision(tareas);
  const idAbierta = porEvento.flatMap((grupo) => grupo.tareas).find((tarea) => tarea.estado === "pendiente")?.id ?? null;
  const eventosDeTareas = new Set(tareas.map((tarea) => tarea.proyectoId));
  const nombreDelEvento = (proyectoId: string) => {
    const enTarea = tareas.find((tarea) => tarea.proyectoId === proyectoId)?.evento;
    return textoVisible(nombres[proyectoId] || enTarea, idioma) || t("comunes.event");
  };
  const filtros: { id: Filtro; etiqueta: string; total: number }[] = [
    { id: "all", etiqueta: t("tareas.filterAll"), total: tareas.length },
    { id: "pendiente", etiqueta: t("tareas.filterPending"), total: cuenta("pendiente") },
    { id: "en revisión", etiqueta: t("tareas.filterSent"), total: cuenta("en revisión") },
    { id: "pagado", etiqueta: t("tareas.filterDone"), total: cuenta("pagado") },
  ];
  const ordenes: { id: OrdenTareas; etiqueta: string }[] = [
    { id: "prioridad", etiqueta: t("tareas.sortPriority") },
    { id: "mayor", etiqueta: t("tareas.sortHighest") },
    { id: "defecto", etiqueta: t("tareas.sortDefault") },
  ];
  const vacioDelFiltro =
    filtro === "pendiente"
      ? { titulo: t("tareas.emptyPendingTitle"), accion: t("tareas.emptyPendingAction"), destino: "en revisión" as Filtro }
      : filtro === "en revisión"
        ? { titulo: t("tareas.emptySentTitle"), accion: t("tareas.emptySentAction"), destino: "pendiente" as Filtro }
        : { titulo: t("tareas.emptyDoneTitle"), accion: t("tareas.emptyDoneAction"), destino: "pendiente" as Filtro };
  const saludo = nombre ? t("tareas.hello", { name: nombre }) : t("tareas.helloNoName");
  const subtitulo =
    eventosDeTareas.size === 1 ? (
      <>
        <Icono nombre="calendar" tamano={16} />
        <span>{nombreDelEvento([...eventosDeTareas][0])}</span>
      </>
    ) : eventosDeTareas.size > 1 ? (
      <span>{t("tareas.eventsCount", { n: eventosDeTareas.size })}</span>
    ) : null;

  function elegirFiltro(id: Filtro) {
    setFiltro(id);
    setMenuOrden(false);
  }

  return (
    <main className="hyto-page">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Saludo nombre={nombre} />
          {lista && subtitulo ? <p className="hyto-subtitulo">{subtitulo}</p> : null}
        </div>
        {lista && tareas.length > 0 ? (
          <Metricas ganado={ganado} revision={enRevision} pendientes={pendientes} className="hyto-solo-escritorio-bloque hyto-metricas-escritorio" />
        ) : null}
      </header>

      {!lista ? <Cargando /> : null}

      {lista && error ? (
        <div className="hyto-tarjeta hyto-estado-vacio" role="alert">
          <MileAnimada estado="error-subida" tamano={96} />
          <h2>{claro(error)}</h2>
          <div className="hyto-estado-vacio-acciones">
            <button type="button" className="hyto-btn hyto-btn-grande" onClick={() => setIntento((actual) => actual + 1)}>
              {t("comunes.tryAgain")}
            </button>
          </div>
        </div>
      ) : null}

      {lista && !error && tareas.length === 0 ? (
        <div className="hyto-tarjeta hyto-estado-vacio">
          <MileAnimada estado="vacio" tamano={120} />
          <h2>{t("tareas.emptyTitle")}</h2>
          <p>{t("tareas.emptyBody")}</p>
          <div className="hyto-estado-vacio-acciones">
            <Link href="/join" className="hyto-btn hyto-btn-grande">
              {t("tareas.join")}
            </Link>
            <Link href="/eventos" className="hyto-btn-line">
              {t("tareas.viewEvents")}
            </Link>
          </div>
          <ComoFunciona />
        </div>
      ) : null}

      {lista && tareas.length > 0 ? (
        <div className="hyto-tareas-cols">
          <div className="min-w-0">
            <section className="hyto-tarjeta hyto-tarjeta-heroe hyto-heroe-movil" aria-label={saludo}>
              <div className="hyto-heroe-mile">
                <p>
                  {pendientes > 0 ? (pendientes === 1 ? t("tareas.youHaveOne") : t("tareas.youHave", { n: pendientes })) : t("tareas.allDone")}
                </p>
              </div>
              <div className="px-4 pb-4">
                <Metricas ganado={ganado} revision={enRevision} pendientes={pendientes} />
              </div>
            </section>

            <div className="hyto-segmentado" role="tablist" aria-label={t("tareas.filter")}>
              {filtros.map((item) => (
                <button key={item.id} type="button" role="tab" aria-selected={filtro === item.id} onClick={() => elegirFiltro(item.id)}>
                  <b>{item.total}</b>
                  <span>{item.etiqueta}</span>
                </button>
              ))}
            </div>
            <div className="hyto-tabs mt-2 hidden lg:flex" role="tablist" aria-label={t("tareas.filter")}>
              {filtros.map((item) => (
                <button key={item.id} type="button" role="tab" aria-selected={filtro === item.id} onClick={() => elegirFiltro(item.id)}>
                  {item.etiqueta} {item.total}
                </button>
              ))}
            </div>

            {visibles.length === 0 && filtro !== "all" ? (
              <EstadoVacio titulo={vacioDelFiltro.titulo} accion={{ texto: vacioDelFiltro.accion, onClick: () => elegirFiltro(vacioDelFiltro.destino) }} />
            ) : null}

            <div className="grid gap-6">
              {porEvento.map((grupo, indice) => (
                <section key={`${grupo.proyectoId}-${indice}`}>
                  <div className="hyto-grupo-titulo">
                    {porEvento.length > 1 ? <h2>{nombreDelEvento(grupo.proyectoId)}</h2> : <span />}
                    {indice === 0 ? (
                      <div className="hyto-ordenar">
                        <button type="button" aria-haspopup="menu" aria-expanded={menuOrden} onClick={() => setMenuOrden((abierto) => !abierto)}>
                          {t("tareas.sortMenu")} ▾
                        </button>
                        {menuOrden ? (
                          <div className="hyto-ordenar-lista" role="menu" aria-label={t("tareas.sort")}>
                            {ordenes.map((item) => (
                              <button
                                key={item.id}
                                type="button"
                                role="menuitemradio"
                                aria-checked={orden === item.id}
                                onClick={() => {
                                  setOrden(item.id);
                                  setMenuOrden(false);
                                }}
                              >
                                {item.etiqueta}
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                  <div className="grid gap-3">
                    {grupo.tareas.map((tarea) => {
                      const abierta = tarea.id === idAbierta;
                      const puntos = puntosDeCondicion(tarea.condicion).length;
                      const vence = tarea.venceEn ? cuandoVence(tarea.venceEn, new Date(), idioma) : null;
                      const reintento = reintentoEnLista(tarea, reloj, vistosRef.current.get(tarea.id));
                      const recibido = tarea.estado === "pagado" ? montoUsdc(tarea) : "";
                      const documental = esMimeDocumental(tarea.tipoArchivo);
                      return (
                        <article key={tarea.id} className={`hyto-tarjeta hyto-tarea${abierta ? " hyto-tarjeta-abierta" : ""}`}>
                          <div className="hyto-tarea-fila">
                            <BadgeTarea estado={tarea.estado} rechazada={tarea.estado === "pendiente" && tarea.rechazada === true} />
                            <Monto tarea={tarea} />
                          </div>
                          <h3>{textoVisible(tarea.titulo, idioma)}</h3>
                          <div className="hyto-tarea-meta">
                            <span>{etiquetaTipo(tarea.tipo, idioma)}</span>
                            {vence ? (
                              <span>
                                <Icono nombre="clock" tamano={14} />
                                {t("tareas.due", { when: vence })}
                              </span>
                            ) : null}
                          </div>
                          <InsigniasClasificacion tarea={tarea} />
                          {mejores.has(tarea.id) ? (
                            <p className="mt-2 flex flex-wrap items-center gap-2">
                              <span className="hyto-pill hyto-pill-ok">
                                <i className="hyto-dot" aria-hidden="true" />
                                {t("tareas.bestPaid")}
                              </span>
                              <span className="text-sm text-[var(--suave)]">{t("tareas.bestPaidHelp")}</span>
                            </p>
                          ) : null}
                          {abierta ? (
                            <>
                              <p className="hyto-tarea-condicion">{textoVisible(tarea.condicion, idioma)}</p>
                              <p className="hyto-nota-mile hyto-nota-mile-pend">
                                <Mile estado="cara-neutra" tamano={28} />
                                <span>{puntos > 1 ? t("tareas.mileChecks", { n: puntos }) : t("tareas.mileChecksOne")}</span>
                              </p>
                            </>
                          ) : null}
                          {tarea.estado === "en revisión" ? (
                            typeof tarea.nota === "number" && tarea.veredicto ? (
                              <div className="mt-3">
                                <PastillaVeredicto veredicto={tarea.veredicto} nota={tarea.nota} />
                                <EtiquetasNota etiquetas={tarea.notas} />
                              </div>
                            ) : reintento ? (
                              <p className="hyto-nota-mile hyto-nota-mile-rev" role="status">
                                <Mile estado="cara-neutra" tamano={28} />
                                <span>{t("evidencia.mileCouldntFinish")}</span>
                              </p>
                            ) : (
                              <p className="hyto-nota-mile hyto-nota-mile-rev" role="status">
                                <Mile estado="cara-neutra" tamano={28} />
                                <span>
                                  {t(documental ? "tareas.mileReviewingFile" : "tareas.mileReviewing")}
                                  {". "}
                                  {t("tareas.mileStill")}
                                </span>
                              </p>
                            )
                          ) : null}
                          {recibido ? (
                            <p className="hyto-nota-mile hyto-nota-mile-ok">
                              <Mile estado="cara-feliz" tamano={28} />
                              <span>{t("tareas.paidNote", { amount: `${recibido} USDC` })}</span>
                            </p>
                          ) : null}
                          {tarea.estado === "pendiente" ? (
                            <Link href={`/tareas/${tarea.id}`} className={abierta || tarea.rechazada ? "hyto-btn hyto-btn-grande" : "hyto-btn-line"}>
                              {tarea.rechazada ? (
                                <>
                                  <Icono nombre="camera" tamano={18} />
                                  {tarea.tipo === "reembolso" ? (
                                    <>
                                      <span className="hyto-solo-movil">{t("tareas.takeAnotherPhoto")}</span>
                                      <span className="hyto-solo-escritorio">{t("tareas.chooseAnotherFile")}</span>
                                    </>
                                  ) : (
                                    t("tareas.takeAnotherPhoto")
                                  )}
                                </>
                              ) : abierta ? (
                                <>
                                  <Icono nombre="camera" tamano={18} />
                                  {t("tareas.uploadEvidence")}
                                </>
                              ) : (
                                t("tareas.view")
                              )}
                            </Link>
                          ) : (
                            <Link href={`/tareas/${tarea.id}`} className={reintento ? "hyto-btn hyto-btn-grande" : "hyto-btn-line"}>
                              {reintento ? t("comunes.tryAgain") : t("tareas.view")}
                            </Link>
                          )}
                        </article>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          </div>

          <aside className="hyto-tarjeta hyto-tareas-panel hyto-solo-escritorio-bloque" aria-label={saludo}>
            <p className="text-sm text-[var(--suave)]">{pendientes > 0 ? (pendientes === 1 ? t("tareas.youHaveOne") : t("tareas.youHave", { n: pendientes })) : t("tareas.allDone")}</p>
            <ComoFunciona />
          </aside>
        </div>
      ) : null}

      {ejemplo ? <p className="mt-6 text-sm text-[var(--suave)]">{t("comunes.sample")}</p> : null}
    </main>
  );
}
