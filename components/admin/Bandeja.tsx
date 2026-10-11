"use client";

import { pagadoNetoEvento } from "@/lib/admin/pago-neto";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { IndicadorActualizado } from "@/components/admin/IndicadorActualizado";
import { EtiquetasNota, MotivoNota } from "@/components/admin/EtiquetasNota";
import { Icono } from "@/components/admin/IconosProyecto";
import { PastillaVeredicto } from "@/components/admin/PastillaVeredicto";
import { PersonaProyecto } from "@/components/admin/PersonaProyecto";
import { BotonReintentarRevision, ReintentoFondo } from "@/components/admin/RevisionFallida";
import { useNovedadesEvento } from "@/components/admin/usarNovedades";
import { AvisoSesion } from "@/components/sesion/AvisoSesion";
import { volverAlEjemplo } from "@/lib/admin/memoria";
import { fusionarVista } from "@/lib/admin/novedades";
import { chipsEstado, filtrarPorEstado, porcentajePagado, type FiltroEstado } from "@/lib/admin/proyecto-vista";
import { cargarDetalleOrganizador, type DetalleRevision } from "@/lib/admin/remoto";
import { vistaAdmin } from "@/lib/admin/vista";
import { esTipoDocumento } from "@/lib/evidencia/tipo";
import { detalleMontoTarea, formatearMonto, lineaMontoTarea, vistaMonto } from "@/lib/integrante/formato";
import { etiquetaEstado, etiquetaTipo, textoVisible } from "@/lib/ui/etiquetas";
import { useVistaAdmin } from "@/components/admin/usarVista";
import { FichaVoluntario } from "@/components/perfil/Ficha";
import { useClaro, useIdioma, useTexto } from "@/components/ui/Idioma";
import type { FichaVoluntario as Ficha } from "@/lib/perfil/reglas";
import type { Resumen, TareaAdmin, VistaAdmin } from "@/lib/admin/tipos";
import { iniciales } from "@/components/ui/Marca";
import { useNombrePersona } from "@/components/admin/PersonaProyecto";

const PROTECCION_REINTENTO_MS = 8_000;

function esEscritorio(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(min-width: 1024px)").matches;
}

/** «Presupuesto · Pagado · Restante» in one strip, with the paid share as a bar. */
function FranjaPresupuesto({ resumen, pagado }: { resumen: Resumen; pagado: { corto: string; detalle: string | null } }) {
  const t = useTexto();
  const idioma = useIdioma();
  const pct = porcentajePagado(resumen.pagado, resumen.presupuesto);
  const pagadoBruto = formatearMonto(resumen.pagado, idioma);
  const total = formatearMonto(resumen.presupuesto, idioma);
  return (
    <section className="pj-card pj-franja" aria-label={t("numeros.budget")}>
      <div className="pj-stats">
        <div className="pj-stat">
          <small>{t("numeros.budget")}</small>
          <strong>{total}</strong>
        </div>
        <div className="pj-stat">
          <small>{t("numeros.paid")}</small>
          <strong>{pagado.corto}</strong>
          {pagado.detalle ? <span className="pj-stat-det">{pagado.detalle}</span> : null}
        </div>
        <div className="pj-stat is-lima">
          <small>{t("numeros.pending")}</small>
          <strong>{formatearMonto(resumen.pendiente, idioma)}</strong>
        </div>
      </div>
      <div className="pj-barra">
        <div className="pj-barra-l">
          <span>
            <b>{t("proyecto.pagadoPct", { p: pct })}</b>
          </span>
          <span>{t("proyecto.deTotal", { pagado: pagadoBruto, total })}</span>
        </div>
        <div className="pj-pista" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={t("proyecto.pagadoPct", { p: pct })}>
          <i style={{ width: `${pct}%` }} />
        </div>
        <div className="pj-barra-m">
          <span>{t("proyecto.pagadoPct", { p: pct })}</span>
          <span>{t("proyecto.deTotal", { pagado: pagadoBruto, total })}</span>
        </div>
      </div>
    </section>
  );
}

function PastillaEstadoProyecto({ estado }: { estado: string }) {
  const idioma = useIdioma();
  const t = useTexto();
  return (
    <span className="pj-st" data-estado={estado}>
      {estado === "en revisión" ? t("proyecto.porRevisar") : etiquetaEstado(estado, idioma)}
    </span>
  );
}

/** The photo of the selected task, loaded only on desktop where the detail panel shows. */
function useFotoDetalle(tareaId: string | null, activo: boolean): string | null {
  const [fotos, setFotos] = useState<Record<string, string | null>>({});
  useEffect(() => {
    if (!tareaId || !activo || !esEscritorio() || tareaId in fotos) return;
    let viva = true;
    void cargarDetalleOrganizador(tareaId).then((detalle) => {
      if (viva) setFotos((actual) => ({ ...actual, [tareaId]: detalle?.foto ?? null }));
    });
    return () => {
      viva = false;
    };
  }, [tareaId, activo, fotos]);
  return tareaId ? (fotos[tareaId] ?? null) : null;
}

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
  const [filtro, setFiltro] = useState<FiltroEstado>("all");
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

  const chips = chipsEstado(vista.tareas);
  const visibles = filtrarPorEstado(vista.tareas, filtro);
  const porDefecto = visibles.find((tarea) => tarea.estado === "en revisión") ?? visibles[0] ?? null;
  const seleccion = visibles.find((tarea) => tarea.id === selId) ?? (selId === null ? porDefecto : null);
  const fallidas = vista.ejemplo ? [] : vista.bandeja.filter((item) => item.origen === "error" && item.estado !== "pagado");

  return (
    <main className="hyto-page pt-0">
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

      <FranjaPresupuesto resumen={vista.resumen} pagado={pagadoNetoEvento(vista.tareas, idioma)} />

      <IndicadorActualizado activo={Boolean(proyectoId && !vista.ejemplo)} visible={reciente} />

      {vista.tareas.length === 0 ? (
        <div className="pj-card mt-4 px-6 py-10 text-center">
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
        <>
          <div className="pj-chips" role="group" aria-label={t("proyecto.filtros")}>
            {chips.map((chip) => (
              <button
                key={chip.id}
                type="button"
                className="pj-chip"
                aria-pressed={filtro === chip.id}
                onClick={() => {
                  setFiltro(chip.id);
                  setSelId(null);
                }}
              >
                {t(chip.clave)} <i>{chip.n}</i>
              </button>
            ))}
          </div>

          <p className="pj-tap">
            <Icono nombre="hand" tam={14} />
            {t("proyecto.elegir")}
          </p>

          <div className="pj-split">
            <div>
              <div className="pj-col-h hyto-solo-escritorio">
                <span>{t("proyecto.evidencias")}</span>
              </div>
              {visibles.length === 0 ? <p className="text-sm text-[var(--suave)]">{t("bandeja.nothingView")}</p> : null}
              <ul className="pj-lista">
                {visibles.map((tarea) => {
                  const vista = vistaMonto(tarea, idioma);
                  const monto = { linea: tarea.estado === "pagado" ? lineaMontoTarea(tarea, idioma) : (vista.pago ?? vista.linea) };
                  const sinEvidencia = tarea.estado === "pendiente";
                  const nota = sinEvidencia ? (
                    <span>{t("proyecto.sinEvidencia")}</span>
                  ) : tarea.veredicto ? (
                    <PastillaVeredicto veredicto={tarea.veredicto} nota={tarea.nota} />
                  ) : (
                    <span>{etiquetaTipo(tarea.tipo, idioma)}</span>
                  );
                  return (
                    <li key={tarea.id}>
                      <Link
                        href={`/revision/${tarea.id}`}
                        className="pj-item"
                        aria-current={seleccion?.id === tarea.id ? "true" : undefined}
                        onClick={(evento) => {
                          // Desktop shows the detail next to the list; a phone opens the review.
                          if (!esEscritorio()) return;
                          evento.preventDefault();
                          setSelId(tarea.id);
                        }}
                      >
                        <PersonaInicial nombre={tarea.miembro} asignada={Boolean(tarea.miembroId)} />
                        <span className="pj-item-main">
                          <span className="pj-item-t">{textoVisible(tarea.titulo, idioma)}</span>
                          <span className="pj-item-s">
                            <NombreCorto nombre={tarea.miembro} asignada={Boolean(tarea.miembroId)} />
                            <span className="pj-sep" aria-hidden="true" />
                            <span className="pj-solo-m pj-amt-s">{monto.linea}</span>
                            <span className="pj-solo-d">{nota}</span>
                          </span>
                          <EtiquetasNota etiquetas={tarea.etiquetas} compacto />
                          <span className="pj-item-m">
                            <PastillaEstadoProyecto estado={tarea.estado} />
                            {nota}
                          </span>
                        </span>
                        <span className="pj-item-r">
                          <span className="pj-amt">{monto.linea}</span>
                          <PastillaEstadoProyecto estado={tarea.estado} />
                        </span>
                        <span className="pj-chev">
                          <Icono nombre="chevR" />
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
              <p className="pj-nota">
                <Icono nombre="spark" tam={16} />
                <span>{t("proyecto.mileNota")}</span>
              </p>
            </div>

            <DetalleBandeja
              tarea={seleccion}
              ejemplo={vista.ejemplo}
              ficha={miembros.find((persona) => persona.usuarioId === seleccion?.miembroId)?.ficha}
              onDetalle={aplicar}
            />
          </div>
        </>
      )}

      {aviso ? <p className="mt-8 text-sm leading-6 text-[var(--suave)]">{claro(aviso)}</p> : null}

      {vista.ejemplo ? <p className="mt-8 text-sm leading-6 text-[var(--suave)]">{t("bandeja.sample")}</p> : null}
    </main>
  );
}

/** The avatar repeats the name next to it, so screen readers skip it. */
function PersonaInicial({ nombre, asignada }: { nombre: string; asignada: boolean }) {
  const visible = useNombrePersona()(nombre, asignada);
  return (
    <span className={`pj-av${asignada ? "" : " is-vacio"}`} aria-hidden="true">
      {asignada ? iniciales(visible) : "–"}
    </span>
  );
}

function NombreCorto({ nombre, asignada }: { nombre: string; asignada: boolean }) {
  return <span>{useNombrePersona()(nombre, asignada)}</span>;
}

function DetalleBandeja({
  tarea,
  ejemplo,
  ficha,
  onDetalle,
}: {
  tarea: TareaAdmin | null;
  ejemplo: boolean;
  ficha?: Ficha;
  onDetalle: (detalle: DetalleRevision) => void;
}) {
  const t = useTexto();
  const idioma = useIdioma();
  const foto = useFotoDetalle(tarea && tarea.estado !== "pendiente" ? tarea.id : null, !ejemplo);
  if (!tarea) {
    return (
      <aside className="pj-card pj-detalle">
        <p className="pj-detalle-vacio">{t("proyecto.elegir")}</p>
      </aside>
    );
  }
  const monto = {
    linea:
      tarea.estado === "pagado"
        ? lineaMontoTarea(tarea, idioma, (amount) => t("eventos.limit", { amount }))
        : vistaMonto(tarea, idioma).linea,
  };
  const detalleMonto = detalleMontoTarea(tarea, idioma);
  return (
    <aside className="pj-card pj-detalle" aria-label={textoVisible(tarea.titulo, idioma)}>
      <div className="pj-ev">
        {foto && !esTipoDocumento(tarea.tipoArchivo) ? (
          <img src={foto} alt="" />
        ) : (
          <p className="pj-ev-vacia">{tarea.estado === "pendiente" ? t("proyecto.sinEvidencia") : etiquetaTipo(tarea.tipo, idioma)}</p>
        )}
      </div>
      <div className="pj-d-head">
        <div>
          <h2 className="pj-d-t">{textoVisible(tarea.titulo, idioma)}</h2>
          <p className="pj-d-s">{etiquetaTipo(tarea.tipo, idioma)}</p>
        </div>
        <div className="text-right">
          <p className="pj-d-t hyto-amount">{monto.linea}</p>
          {detalleMonto ? <p className="pj-d-s">{detalleMonto}</p> : null}
        </div>
      </div>
      <PersonaProyecto nombre={tarea.miembro} asignada={Boolean(tarea.miembroId)} pill />
      {ficha ? <FichaVoluntario ficha={ficha} /> : null}
      {tarea.condicion ? (
        <div className="pj-req">
          <small>{t("proyecto.debeMostrar")}</small>
          <p>{textoVisible(tarea.condicion, idioma)}</p>
        </div>
      ) : null}
      <div className="pj-mile">
        <span className="pj-mile-l">
          <span className="pj-mm">
            <Icono nombre="spark" tam={14} />
          </span>
          {t("proyecto.recomendacionMile")}
        </span>
        {tarea.veredicto ? (
          <span className="flex flex-wrap items-center gap-2">
            <PastillaVeredicto veredicto={tarea.veredicto} nota={tarea.nota} />
            <MotivoNota etiquetas={tarea.etiquetas} />
          </span>
        ) : (
          <span className="text-sm text-[var(--suave)]">{t("bandeja.noRecommendation")}</span>
        )}
      </div>
      {tarea.frase ? (
        <p className="pj-d-frase" role={tarea.origen === "error" ? "alert" : undefined}>
          {textoVisible(tarea.frase, idioma)}
        </p>
      ) : null}
      {tarea.origen === "error" && tarea.estado !== "pagado" && !ejemplo ? <BotonReintentarRevision tareaId={tarea.id} onDetalle={onDetalle} /> : null}
      {tarea.intentosAnteriores && tarea.intentosAnteriores.length > 0 ? (
        <details className="text-sm">
          <summary className="cursor-pointer font-medium">{t("bandeja.earlierAttempts", { n: tarea.intentosAnteriores.length })}</summary>
          <ol className="mt-3 grid gap-3">
            {tarea.intentosAnteriores.map((intento) => (
              <li key={intento.numero}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[var(--suave)]">{t("bandeja.attemptN", { n: intento.numero })}</span>
                  {intento.veredicto ? <PastillaVeredicto veredicto={intento.veredicto} nota={intento.nota} /> : null}
                </div>
                <p className="mt-1 leading-6 text-[var(--suave)]">{intento.frase ? textoVisible(intento.frase, idioma) : t("bandeja.attemptNoNote")}</p>
              </li>
            ))}
          </ol>
        </details>
      ) : null}
      <Link href={`/revision/${tarea.id}`} className="hyto-btn pj-btn-pri">
        {t("bandeja.openReview")}
        <Icono nombre="chevR" />
      </Link>
    </aside>
  );
}
