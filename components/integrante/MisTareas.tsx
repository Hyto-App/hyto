"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PastillaEstado } from "@/components/integrante/EstadoTarea";
import { useModoDemo } from "@/components/sesion/InsigniaDemo";
import { useClaro, useIdioma, useTexto } from "@/components/ui/Idioma";
import { formatearMonto, montoDeTarea } from "@/lib/integrante/formato";
import { etiquetaEstado, etiquetaTipo, textoVisible } from "@/lib/ui/etiquetas";
import { listarTareas } from "@/lib/integrante/rutas";
import type { EstadoTarea, Tarea } from "@/lib/integrante/tipos";

type Filtro = "all" | EstadoTarea;

function suma(tareas: Tarea[], estado: EstadoTarea): number {
  return tareas.filter((tarea) => tarea.estado === estado).reduce((total, tarea) => total + (Number(tarea.tope ?? tarea.monto) || 0), 0);
}

export function MisTareas() {
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
  const porEvento = new Map<string, Tarea[]>();
  for (const tarea of visibles) {
    const clave = tarea.proyectoId || "event";
    porEvento.set(clave, [...(porEvento.get(clave) ?? []), tarea]);
  }
  const pendientes = cuenta("pendiente");
  const filtros: { id: Filtro; etiqueta: string }[] = [
    { id: "all", etiqueta: t("comunes.all") },
    { id: "pendiente", etiqueta: etiquetaEstado("pendiente", idioma) },
    { id: "en revisión", etiqueta: etiquetaEstado("en revisión", idioma) },
    { id: "pagado", etiqueta: etiquetaEstado("pagado", idioma) },
  ];

  return (
    <main className="hyto-page">
      <header className="hyto-page-head">
        <div>
          <h1 className="hyto-title">{t("tareas.title")}</h1>
        </div>
        {lista && tareas.length > 0 ? (
          <div className="hyto-kpis w-full sm:max-w-md">
            <article>
              <p className="text-sm text-[var(--suave)]">{t("tareas.earned")}</p>
              <p className="hyto-amount mt-2 text-xl text-[var(--acento-texto)]">{formatearMonto(String(suma(tareas, "pagado")))}</p>
            </article>
            <article>
              <p className="text-sm text-[var(--suave)]">{t("tareas.inReview")}</p>
              <p className="hyto-amount mt-2 text-xl">{formatearMonto(String(suma(tareas, "en revisión")))}</p>
            </article>
            <article>
              <p className="text-sm text-[var(--suave)]">{t("tareas.toDo")}</p>
              <p className="hyto-amount mt-2 text-xl">
                {pendientes} {pendientes === 1 ? t("tareas.one") : t("tareas.many")}
              </p>
            </article>
          </div>
        ) : null}
      </header>

      {!lista ? (
        <p className="text-[var(--suave)]" aria-live="polite">
          {t("tareas.loading")}
        </p>
      ) : null}

      {lista && error ? (
        <div className="hyto-card px-6 py-10">
          <p role="alert" className="text-lg font-semibold">
            {error ? claro(error) : null}
          </p>
          <button type="button" className="hyto-btn mt-6 max-w-xs" onClick={() => setIntento((actual) => actual + 1)}>
            {t("comunes.tryAgain")}
          </button>
        </div>
      ) : null}

      {lista && !error && tareas.length === 0 ? (
        <div className="hyto-card px-6 py-10">
          <p className="text-lg font-semibold">{t("tareas.emptyTitle")}</p>
          <p className="mt-2 text-sm leading-6 text-[var(--suave)]">{t("tareas.emptyBody")}</p>
          <Link href="/join" className="hyto-btn mt-6 max-w-xs">
            {t("tareas.join")}
          </Link>
        </div>
      ) : null}

      {lista && tareas.length > 0 ? (
        <>
          <div className="hyto-chips flex lg:hidden" role="tablist" aria-label={t("tareas.filter")}>
            {filtros.map((item) => (
              <button key={item.id} type="button" role="tab" aria-selected={filtro === item.id} onClick={() => setFiltro(item.id)}>
                {item.etiqueta} {item.id === "all" ? tareas.length : cuenta(item.id)}
              </button>
            ))}
          </div>
          <div className="hyto-tabs hidden lg:flex" role="tablist" aria-label={t("tareas.filter")}>
            {filtros.map((item) => (
              <button key={item.id} type="button" role="tab" aria-selected={filtro === item.id} onClick={() => setFiltro(item.id)}>
                {item.etiqueta} {item.id === "all" ? tareas.length : cuenta(item.id)}
              </button>
            ))}
          </div>
          <div className="grid gap-8">
            {[...porEvento.entries()].map(([proyectoId, grupo]) => (
              <section key={proyectoId}>
                <h2 className="text-sm font-semibold text-[var(--suave)]">{textoVisible(nombres[proyectoId], idioma) || t("comunes.event")}</h2>
                <div className="mt-3 grid gap-3">
                  {grupo.map((tarea) => (
                    <article key={tarea.id} className="hyto-card p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm text-[var(--suave)]">{etiquetaTipo(tarea.tipo, idioma)}</p>
                          <h3 className="mt-1 text-xl font-semibold tracking-tight">{textoVisible(tarea.titulo, idioma)}</h3>
                        </div>
                        <p className="hyto-amount text-lg">{montoDeTarea(tarea)}</p>
                      </div>
                      <div className="mt-4">
                        <PastillaEstado estado={tarea.estado} />
                      </div>
                      {tarea.estado === "pendiente" ? (
                        <Link href={`/tareas/${tarea.id}`} className="hyto-btn mt-4">
                          {t("tareas.openCamera")}
                        </Link>
                      ) : (
                        <Link href={`/tareas/${tarea.id}`} className="hyto-btn-line mt-4">
                          {t("tareas.view")}
                        </Link>
                      )}
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </>
      ) : null}

      {ejemplo ? <p className="mt-6 text-sm text-[var(--suave)]">{t("comunes.sample")}</p> : null}
    </main>
  );
}
