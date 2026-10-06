"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PastillaVeredicto } from "@/components/admin/PastillaVeredicto";
import { BadgeTarea } from "@/components/integrante/EstadoTarea";
import { useModoDemo } from "@/components/sesion/InsigniaDemo";
import { EstadoVacio } from "@/components/ui/EstadoVacio";
import { useClaro, useIdioma, useTexto } from "@/components/ui/Idioma";
import { Icono } from "@/components/ui/Marca";
import { Mile } from "@/components/ui/Mile";
import { MileAnimada } from "@/components/ui/MileAnimada";
import { Skeleton } from "@/components/ui/Skeleton";
import { agruparPorEvento, idsMejorPagadas, ordenarPorPago, type OrdenTareas } from "@/lib/integrante/orden-pago";
import { puntosDeCondicion } from "@/lib/integrante/puntos";
import { listarTareas } from "@/lib/integrante/rutas";
import type { EstadoTarea, Tarea } from "@/lib/integrante/tipos";
import { cuandoVence } from "@/lib/integrante/vence";
import { etiquetaDificultad, etiquetaPrioridad, etiquetaTipo, textoVisible } from "@/lib/ui/etiquetas";

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

function suma(tareas: Tarea[], estado: EstadoTarea): number {
  return tareas.filter((tarea) => tarea.estado === estado).reduce((total, tarea) => total + (Number(tarea.tope ?? tarea.monto) || 0), 0);
}

function cifra(valor: number): string {
  return valor.toLocaleString("en-US", { minimumFractionDigits: Number.isInteger(valor) ? 0 : 2, maximumFractionDigits: 2 });
}

function Monto({ tarea }: { tarea: Tarea }) {
  const t = useTexto();
  const valor = cifra(Number(tarea.tope ?? tarea.monto) || 0);
  return (
    <span className="hyto-monto">
      {tarea.tipo === "reembolso" ? t("tareas.upTo", { monto: valor }) : valor}
      <small>USDC</small>
    </span>
  );
}

function Metricas({ ganado, revision, pendientes, className = "" }: { ganado: number; revision: number; pendientes: number; className?: string }) {
  const t = useTexto();
  return (
    <div className={`hyto-metricas ${className}`.trim()}>
      <div className="hyto-metrica-ganado">
        <b>{cifra(ganado)}</b>
        <span>{t("tareas.earnedUsdc", { amount: "USDC" })}</span>
      </div>
      <div>
        <b>{cifra(revision)}</b>
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

  useEffect(() => {
    let activo = true;
    setLista(false);
    setError(null);
    listarTareas({ miembroId: "" }, { muestra: demo }).then((resultado) => {
      if (!activo) return;
      setTareas(resultado.tareas);
      setEjemplo(resultado.ejemplo);
      setError(resultado.error);
      setLista(true);
    });
    void fetch("/api/proyectos")
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
    };
  }, [demo, intento]);

  const visibles = filtro === "all" ? tareas : tareas.filter((tarea) => tarea.estado === filtro);
  const cuenta = (estado: EstadoTarea) => tareas.filter((tarea) => tarea.estado === estado).length;
  const mejores = idsMejorPagadas(tareas);
  const porEvento = agruparPorEvento(ordenarPorPago(visibles, orden), orden === "defecto" ? "unir" : "seguir");
  const pendientes = cuenta("pendiente");
  const ganado = suma(tareas, "pagado");
  const enRevision = suma(tareas, "en revisión");
  const idAbierta = porEvento.flatMap((grupo) => grupo.tareas).find((tarea) => tarea.estado === "pendiente")?.id ?? null;
  const eventosDeTareas = new Set(tareas.map((tarea) => tarea.proyectoId));
  const nombreDelEvento = (proyectoId: string) => textoVisible(nombres[proyectoId], idioma) || t("comunes.event");
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
          <h1 className="hyto-h1">{t("tareas.title")}</h1>
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
                <MileAnimada estado="saludo" tamano={124} tocable />
                <div className="min-w-0">
                  <h2>{saludo}</h2>
                  <p>
                    {pendientes > 0 ? (
                      pendientes === 1 ? (
                        t("tareas.youHaveOne")
                      ) : (
                        t("tareas.youHave", { n: pendientes })
                      )
                    ) : (
                      t("tareas.allDone")
                    )}
                  </p>
                </div>
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
                            <p className="mt-2">
                              <span className="hyto-pill hyto-pill-ok">
                                <i className="hyto-dot" aria-hidden="true" />
                                {t("tareas.bestPaid")}
                              </span>
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
                              </div>
                            ) : (
                              <p className="hyto-nota-mile hyto-nota-mile-rev">
                                <Mile estado="cara-neutra" tamano={28} />
                                <span>{t("tareas.mileReviewing")}</span>
                              </p>
                            )
                          ) : null}
                          {tarea.estado === "pagado" ? (
                            <p className="hyto-nota-mile hyto-nota-mile-ok">
                              <Mile estado="cara-feliz" tamano={28} />
                              <span>{t("tareas.paidNote", { amount: `${cifra(Number(tarea.tope ?? tarea.monto) || 0)} USDC` })}</span>
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
                            <Link href={`/tareas/${tarea.id}`} className="hyto-btn-line">
                              {t("tareas.view")}
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
            <MileAnimada estado="saludo" tamano={180} tocable />
            <h2 className="text-lg font-semibold">{saludo}</h2>
            <p className="text-sm text-[var(--suave)]">{pendientes > 0 ? (pendientes === 1 ? t("tareas.youHaveOne") : t("tareas.youHave", { n: pendientes })) : t("tareas.allDone")}</p>
            <ComoFunciona />
          </aside>
        </div>
      ) : null}

      {ejemplo ? <p className="mt-6 text-sm text-[var(--suave)]">{t("comunes.sample")}</p> : null}
    </main>
  );
}
