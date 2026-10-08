"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { IndicadorActualizado } from "@/components/admin/IndicadorActualizado";
import { Numeros } from "@/components/admin/Numeros";
import { EtiquetasNota, MotivoNota } from "@/components/admin/EtiquetasNota";
import { PastillaVeredicto } from "@/components/admin/PastillaVeredicto";
import { PresentacionMile } from "@/components/admin/PresentacionMile";
import { ResumenMile } from "@/components/admin/ResumenMile";
import { BotonReintentarRevision, ReintentoFondo } from "@/components/admin/RevisionFallida";
import { useNovedadesEvento } from "@/components/admin/usarNovedades";
import { AvisoSesion } from "@/components/sesion/AvisoSesion";
import { volverAlEjemplo } from "@/lib/admin/memoria";
import { fusionarVista } from "@/lib/admin/novedades";
import { cargarDetalleOrganizador, type DetalleRevision } from "@/lib/admin/remoto";
import { vistaAdmin } from "@/lib/admin/vista";
import { montoDeTarea } from "@/lib/integrante/formato";
import { etiquetaTipo, etiquetaVeredicto, textoVisible } from "@/lib/ui/etiquetas";
import { useVistaAdmin } from "@/components/admin/usarVista";
import { FichaVoluntario } from "@/components/perfil/Ficha";
import { useClaro, useIdioma, useTexto } from "@/components/ui/Idioma";
import type { FichaVoluntario as Ficha } from "@/lib/perfil/reglas";
import { iniciales } from "@/components/ui/Marca";
import type { Veredicto, VistaAdmin } from "@/lib/admin/tipos";

const PROTECCION_REINTENTO_MS = 8_000;

type Filtro = "all" | Veredicto;

export function Bandeja({
  proyectoId,
  miembros = [],
}: {
  proyectoId?: string;
  miembros?: { usuarioId: string; email: string; ficha?: Ficha }[];
}) {
  const t = useTexto();
  const claro = useClaro();
  const idioma = useIdioma();
  const estado = useVistaAdmin(proyectoId);
  const base = estado.vista;
  const [elegida, setElegida] = useState<VistaAdmin | null>(null);
  const [viva, setViva] = useState<VistaAdmin | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<Filtro>("all");
  const [selId, setSelId] = useState<string | null>(null);
  const vista = elegida ?? viva ?? base;
  const vistaRef = useRef(vista);
  vistaRef.current = vista;
  const elegidaRef = useRef(elegida);
  elegidaRef.current = elegida;
  const vivaRef = useRef(viva);
  vivaRef.current = viva;
  const generacion = useRef(0);
  const aplicadoEn = useRef(new Map<string, number>());

  useEffect(() => {
    generacion.current += 1;
    setViva((actual) => (actual === null ? actual : null));
  }, [base]);

  const aplicar = useCallback((detalle: DetalleRevision) => {
    aplicadoEn.current.set(detalle.tarea.id, Date.now());
    const marca = generacion.current;
    const origen = elegidaRef.current ? null : (vivaRef.current ?? vistaRef.current);
    if (!origen || origen.ejemplo) return;
    const fusion = fusionarVista(origen, [detalle.tarea]);
    if (generacion.current !== marca || elegidaRef.current) return;
    if (fusion !== origen) setViva(fusion);
  }, []);

  const { reciente, sesionVencida } = useNovedadesEvento({
    proyectoId: proyectoId && vista && !vista.ejemplo && !elegida ? proyectoId : undefined,
    tareas: (vista?.tareas ?? []).map((tarea) => ({
      id: tarea.id,
      estado: tarea.estado,
      veredicto: tarea.veredicto,
      origen: tarea.origen,
    })),
    exigirFoto: false,
    alCambiar: async (ids) => {
      const marca = generacion.current;
      const actual = elegidaRef.current ? null : (vivaRef.current ?? vistaRef.current);
      if (!actual || actual.ejemplo) return { ok: false, avisar: false };
      const detalles = await Promise.all(ids.map((id) => cargarDetalleOrganizador(id)));
      if (generacion.current !== marca || elegidaRef.current) return { ok: false, avisar: false };
      if (detalles.some((detalle) => !detalle)) return { ok: false, avisar: false };
      const ahora = Date.now();
      let protegida = false;
      const llegadas = detalles.flatMap((detalle) => {
        if (!detalle) return [];
        const cuando = aplicadoEn.current.get(detalle.tarea.id) ?? 0;
        if (cuando > 0 && ahora - cuando < PROTECCION_REINTENTO_MS) {
          protegida = true;
          return [];
        }
        return [detalle.tarea];
      });
      const baseVista = vivaRef.current ?? vistaRef.current ?? actual;
      const fusion = fusionarVista(baseVista, llegadas);
      if (fusion !== baseVista) setViva(fusion);
      if (protegida) return { ok: false, avisar: false };
      return { ok: true, avisar: fusion !== actual };
    },
  });

  function usarEjemplo() {
    const guardado = volverAlEjemplo();
    setAviso(guardado.aviso);
    if (guardado.aviso) return;
    setElegida(vistaAdmin(guardado.memoria));
    setSelId(null);
  }

  if (estado.error) {
    return (
      <main className="hyto-page">
        <p role="alert">{claro(estado.error)}</p>
        <button type="button" className="hyto-btn mt-4 max-w-xs" onClick={estado.reintentar}>
          {t("comunes.tryAgain")}
        </button>
      </main>
    );
  }

  if (!vista) {
    return (
      <main className="hyto-page" aria-busy="true">
        <p className="hyto-sub">{t("comunes.loading")}</p>
        <div className="mt-4 grid gap-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="hyto-skel">
              <i />
              <span>
                <i />
                <i />
              </span>
            </div>
          ))}
        </div>
      </main>
    );
  }

  const visibles = filtro === "all" ? vista.bandeja : vista.bandeja.filter((tarea) => tarea.veredicto === filtro);
  const seleccion = visibles.find((tarea) => tarea.id === selId) ?? visibles[0] ?? null;
  const fallidas = vista.ejemplo ? [] : vista.bandeja.filter((item) => item.origen === "error" && item.estado !== "pagado");
  const filtros: { id: Filtro; etiqueta: string }[] = [
    { id: "all", etiqueta: t("comunes.all") },
    { id: "cumplió", etiqueta: etiquetaVeredicto("cumplió", idioma) },
    { id: "parcial", etiqueta: etiquetaVeredicto("parcial", idioma) },
    { id: "insuficiente", etiqueta: etiquetaVeredicto("insuficiente", idioma) },
  ];

  return (
    <main className="hyto-page">
      {sesionVencida ? <AvisoSesion /> : null}
      {fallidas.map((item) => (
        <ReintentoFondo key={item.id} tareaId={item.id} onDetalle={aplicar} />
      ))}
      {proyectoId ? null : (
        <header className="hyto-page-head">
          <div>
            <p className="text-sm font-semibold">{vista.nombre}</p>
            <h1 className="hyto-title mt-2">{t("bandeja.inbox")}</h1>
            <p className="hyto-sub">
              {vista.bandeja.length === 0
                ? t("bandeja.none")
                : t(vista.bandeja.length === 1 ? "bandeja.oneWaiting" : "bandeja.manyWaiting", { n: vista.bandeja.length })}
            </p>
            {vista.propio ? (
              <button type="button" onClick={usarEjemplo} className="mt-3 text-sm text-[var(--suave)]">
                {t("bandeja.backExample")}
              </button>
            ) : null}
          </div>
        </header>
      )}

      <Numeros resumen={vista.resumen} />

      <section className="mt-8">
        <IndicadorActualizado activo={Boolean(proyectoId && !vista.ejemplo)} visible={reciente} />
        <div className="hyto-tabs mt-4 flex" role="tablist" aria-label={t("bandeja.filter")}>
          {filtros.map((item) => (
            <button key={item.id} type="button" role="tab" aria-selected={filtro === item.id} onClick={() => setFiltro(item.id)}>
              {item.etiqueta}
            </button>
          ))}
        </div>

        {vista.bandeja.length === 0 ? (
          <div className="hyto-card mt-4 px-6 py-10 text-center">
            <p className="text-lg font-semibold">{t("bandeja.nothingApprove")}</p>
            <p className="mt-2 text-[var(--suave)]">{t("bandeja.whenPhoto")}</p>
            {proyectoId ? (
              <button type="button" className="hyto-btn mx-auto mt-6 max-w-xs" onClick={() => document.getElementById("invitar")?.click()}>
                {t("bandeja.invite")}
              </button>
            ) : (
              <Link href="/eventos/nuevo" className="hyto-btn mx-auto mt-6 max-w-xs">
                {t("bandeja.create")}
              </Link>
            )}
          </div>
        ) : (
          <div className="hyto-inbox">
            <div className="grid gap-2">
              {visibles.length === 0 ? <p className="text-sm text-[var(--suave)]">{t("bandeja.nothingView")}</p> : null}
              {visibles.map((tarea) => {
                const activo = seleccion?.id === tarea.id;
                return (
                  <button
                    key={tarea.id}
                    type="button"
                    onClick={() => setSelId(tarea.id)}
                    className={`hyto-row ${activo ? "is-on bg-[var(--papel)]" : "hover:bg-[var(--papel)]"}`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="hyto-avatar">{iniciales(textoVisible(tarea.miembro, idioma))}</span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-start justify-between gap-3">
                          <span className="block font-semibold">{textoVisible(tarea.miembro, idioma)}</span>
                          <span className="hyto-amount text-sm">{montoDeTarea(tarea, idioma)}</span>
                        </span>
                        <span className="mt-1 block text-sm text-[var(--suave)]">{textoVisible(tarea.titulo, idioma)}</span>
                        <span className="mt-2 flex items-center justify-between gap-2">
                          <span className="text-xs text-[var(--suave)]">{etiquetaTipo(tarea.tipo, idioma)}</span>
                          {tarea.veredicto ? <PastillaVeredicto veredicto={tarea.veredicto} nota={tarea.nota} /> : null}
                        </span>
                        <EtiquetasNota etiquetas={tarea.etiquetas} compacto />
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {seleccion ? (
              <article className="hyto-card overflow-hidden">
                <div className="p-5">
                  <p className="text-sm text-[var(--suave)]">{etiquetaTipo(seleccion.tipo, idioma)} · {textoVisible(seleccion.miembro, idioma)}</p>
                  <h3 className="mt-1 text-2xl font-semibold tracking-tight">{textoVisible(seleccion.titulo, idioma)}</h3>
                  <p className="hyto-amount mt-2 text-xl">{montoDeTarea(seleccion, idioma)}</p>
                  {seleccion.frase ? <ResumenMile frase={seleccion.frase} lectura={seleccion.lectura} /> : null}
                  {seleccion.origen === "error" && seleccion.estado !== "pagado" && !vista.ejemplo ? (
                    <BotonReintentarRevision tareaId={seleccion.id} onDetalle={aplicar} />
                  ) : null}
                  {proyectoId && miembros.length > 0 ? (
                    <label className="mt-4 block text-sm" htmlFor={`asignar-${seleccion.id}`}>
                      {t("bandeja.assign")}
                      <select
                        id={`asignar-${seleccion.id}`}
                        className="hyto-input mt-2"
                        value={seleccion.miembroId}
                        onChange={(evento) => {
                          const usuarioId = evento.target.value;
                          void fetch(`/api/tareas/${encodeURIComponent(seleccion.id)}/asignar`, {
                            method: "POST",
                            headers: { "content-type": "application/json" },
                            body: JSON.stringify({ usuarioId }),
                          }).then(() => estado.reintentar());
                        }}
                      >
                        <option value="">{t("comunes.unassigned")}</option>
                        {miembros.map((persona) => (
                          <option key={persona.usuarioId} value={persona.usuarioId}>
                            {persona.email}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                  {seleccion ? <FichaVoluntario ficha={miembros.find((persona) => persona.usuarioId === seleccion.miembroId)?.ficha ?? { experiencia: null, etiquetas: [] }} /> : null}
                  <Link href={`/revision/${seleccion.id}`} className="hyto-btn mt-5">
                    {t("bandeja.review")}
                  </Link>
                </div>
              </article>
            ) : (
              <div />
            )}

            {seleccion ? (
              <aside className="hyto-panel">
                <p className="text-sm text-[var(--suave)]">{t("bandeja.recommendation")}</p>
                {seleccion.veredicto ? <PresentacionMile /> : null}
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  {seleccion.veredicto ? (
                    <>
                      <PastillaVeredicto veredicto={seleccion.veredicto} nota={seleccion.nota} />
                      <MotivoNota etiquetas={seleccion.etiquetas} />
                    </>
                  ) : (
                    <p className="text-sm text-[var(--suave)]">{t("bandeja.noRecommendation")}</p>
                  )}
                </div>
                <EtiquetasNota etiquetas={seleccion.etiquetas} ocultarMotivo />
                {seleccion.condicion ? (
                  <>
                    <p className="mt-5 text-sm font-medium">{t("bandeja.photoMust")}</p>
                    <p className="mt-2 text-sm leading-6 text-[var(--suave)]">{textoVisible(seleccion.condicion, idioma)}</p>
                  </>
                ) : null}
                {seleccion.intentosAnteriores && seleccion.intentosAnteriores.length > 0 ? (
                  <details className="mt-5 text-sm">
                    <summary className="cursor-pointer font-medium">
                      {t("bandeja.earlierAttempts", { n: seleccion.intentosAnteriores.length })}
                    </summary>
                    <ol className="mt-3 grid gap-3">
                      {seleccion.intentosAnteriores.map((intento) => (
                        <li key={intento.numero}>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[var(--suave)]">{t("bandeja.attemptN", { n: intento.numero })}</span>
                            {intento.veredicto ? <PastillaVeredicto veredicto={intento.veredicto} nota={intento.nota} /> : null}
                          </div>
                          {intento.frase ? (
                            <ResumenMile frase={intento.frase} />
                          ) : (
                            <p className="mt-1 leading-6 text-[var(--suave)]">{t("bandeja.attemptNoNote")}</p>
                          )}
                        </li>
                      ))}
                    </ol>
                  </details>
                ) : null}
                <p className="mt-6 text-sm leading-6 text-[var(--suave)]">{t("bandeja.mileSuggests")}</p>
                <Link href={`/revision/${seleccion.id}`} className="hyto-btn-line mt-4">
                  {t("bandeja.openReview")}
                </Link>
              </aside>
            ) : (
              <div />
            )}
          </div>
        )}
      </section>

      {aviso ? <p className="mt-8 text-sm leading-6 text-[var(--suave)]">{claro(aviso)}</p> : null}

      {vista.ejemplo ? <p className="mt-8 text-sm leading-6 text-[var(--suave)]">{t("bandeja.sample")}</p> : null}
    </main>
  );
}
