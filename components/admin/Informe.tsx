"use client";

import { useEffect, useState } from "react";
import { Numeros } from "@/components/admin/Numeros";
import { AccionesRevisionFallida } from "@/components/admin/RevisionFallida";
import { useVistaAdmin } from "@/components/admin/usarVista";
import { EtiquetasNota } from "@/components/admin/EtiquetasNota";
import { PastillaVeredicto } from "@/components/admin/PastillaVeredicto";
import { PastillaEstado } from "@/components/integrante/EstadoTarea";
import { conTarea } from "@/lib/admin/parche";
import { detalleMonto, enlaceCredencial, enlacePago, etiquetaOrigen } from "@/lib/admin/vista";
import type { VistaAdmin } from "@/lib/admin/tipos";
import { formatearMonto } from "@/lib/integrante/formato";
import { EnlaceExplorador } from "@/components/ui/EnlaceExplorador";
import { useIdioma, useTexto } from "@/components/ui/Idioma";
import { TextoClaro } from "@/components/ui/TextoClaro";
import { etiquetaTipo, textoVisible } from "@/lib/ui/etiquetas";
import { iniciales } from "@/components/ui/Marca";

export function Informe({ proyectoId }: { proyectoId?: string } = {}) {
  const t = useTexto();
  const idioma = useIdioma();
  const estado = useVistaAdmin(proyectoId);
  const cargada = estado.vista;
  const [parche, setParche] = useState<VistaAdmin | null>(null);
  const vista = parche ?? cargada;

  useEffect(() => {
    setParche(null);
  }, [cargada]);

  if (estado.error) {
    return (
      <main className="hyto-page">
        <p role="alert"><TextoClaro mensaje={estado.error} /></p>
        <button type="button" className="hyto-btn mt-4 max-w-xs" onClick={estado.reintentar}>
          {t("comunes.tryAgain")}
        </button>
      </main>
    );
  }

  if (!vista) {
    return (
      <main className="hyto-page" aria-busy="true">
        <div className="hyto-skel">
          <i />
          <span>
            <i />
            <i />
          </span>
        </div>
      </main>
    );
  }

  const presupuesto = Number(vista.resumen.presupuesto) || 0;
  const pagado = Number(vista.resumen.pagado) || 0;
  const ancho = presupuesto > 0 ? Math.min(100, (pagado / presupuesto) * 100) : 0;

  return (
    <main className="hyto-page">
      <header className="hyto-page-head">
        <div>
          <p className="text-sm text-[var(--suave)] print:text-black">Hyto</p>
          <h1 className="hyto-title mt-2">{t("eventos.report")}</h1>
          <p className="mt-2 text-lg">{textoVisible(vista.nombre, idioma)}</p>
          <p className="hyto-sub">{t("eventos.reportLead")}</p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="hyto-btn is-inline px-6 print:hidden"
        >
          {t("eventos.print")}
        </button>
      </header>

      <section>
        <h2 className="text-lg font-semibold tracking-tight">{t("eventos.against")}</h2>
        <div className="mt-4">
          <Numeros resumen={vista.resumen} />
        </div>
        <div className="mt-4">
          <div className="hyto-bar" aria-hidden="true">
            <span style={{ width: `${ancho}%` }} />
          </div>
          <p className="mt-2 text-sm text-[var(--suave)]">
            {t(vista.personas.length === 1 ? "eventos.paidLine" : "eventos.paidLineMany", {
              paid: formatearMonto(vista.resumen.pagado, idioma),
              pending: formatearMonto(vista.resumen.pendiente, idioma),
              n: vista.personas.length,
            })}
          </p>
        </div>
      </section>

      <section className="mt-10 space-y-8">
        <h2 className="text-lg font-semibold tracking-tight">{t("eventos.detail")}</h2>
        {vista.personas.length === 0 ? <p className="text-[var(--suave)]">{t("eventos.noTasks")}</p> : null}
        {vista.personas.map((persona) => (
          <article key={persona.miembroId || persona.miembro}>
            <div className="flex items-center gap-3">
              <span className="hyto-avatar">{iniciales(textoVisible(persona.miembro, idioma))}</span>
              <h3 className="text-base font-semibold">{textoVisible(persona.miembro, idioma)}</h3>
            </div>
            <div className="mt-3 space-y-3">
              {persona.tareas.map((tarea) => {
                const pago = enlacePago(tarea.hashPago);
                const credencial = enlaceCredencial(tarea.credencialUrl);
                const detalle = detalleMonto(tarea);
                const cifra = detalle.hasta ? t("eventos.upTo", { amount: formatearMonto(detalle.cifra, idioma) }) : formatearMonto(detalle.cifra, idioma);
                const origen = etiquetaOrigen(tarea.origen, idioma);
                const lleno = tarea.estado === "pagado" ? 100 : 0;
                return (
                  <div key={tarea.id} className="hyto-card p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm text-[var(--suave)]">{etiquetaTipo(tarea.tipo, idioma)}</p>
                        <p className="mt-1 text-lg font-semibold tracking-tight">{textoVisible(tarea.titulo, idioma)}</p>
                      </div>
                      <span className="flex flex-wrap items-center justify-end gap-2">
                        {tarea.veredicto ? <PastillaVeredicto veredicto={tarea.veredicto} nota={tarea.nota} /> : null}
                        <PastillaEstado estado={tarea.estado} />
                      </span>
                    </div>
                    <p className="hyto-amount mt-4 text-xl">{cifra}</p>
                    <div className="hyto-bar mt-3" aria-hidden="true">
                      <span style={{ width: `${lleno}%` }} />
                    </div>
                    {detalle.tope && detalle.tope !== detalle.cifra ? (
                      <p className="mt-1 text-sm text-[var(--suave)]">{t("eventos.limit", { amount: formatearMonto(detalle.tope, idioma) })}</p>
                    ) : null}
                    {origen ? <p className="mt-3 text-sm text-[var(--suave)]">{origen}</p> : null}
                    <EtiquetasNota etiquetas={tarea.etiquetas} />
                    {tarea.origen === "error" && tarea.frase ? (
                      <p role="alert" className="mt-3 text-sm leading-6">
                        {textoVisible(tarea.frase, idioma)}
                      </p>
                    ) : tarea.frase ? (
                      <p className="mt-3 text-sm leading-6 text-[var(--suave)]">{textoVisible(tarea.frase, idioma)}</p>
                    ) : null}
                    {tarea.origen === "error" && tarea.estado !== "pagado" && !vista.ejemplo ? (
                      <AccionesRevisionFallida
                        tareaId={tarea.id}
                        onDetalle={(detalle) => {
                          setParche((actual) => {
                            const base = actual ?? cargada;
                            return base ? conTarea(base, detalle.tarea) : base;
                          });
                        }}
                      />
                    ) : null}
                    {pago || credencial ? (
                      <div className="mt-4 flex flex-wrap gap-3">
                        {pago ? (
                          <EnlaceExplorador href={pago} className="hyto-btn-line is-inline px-5">
                            {t("pago.viewChain")}
                          </EnlaceExplorador>
                        ) : null}
                        {credencial ? (
                          <a href={credencial} className="hyto-btn-line is-inline px-5">
                            {t("eventos.credential")}
                          </a>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </article>
        ))}
      </section>

      {vista.ejemplo ? (
        <p className="mt-8 text-sm leading-6 text-[var(--suave)] print:hidden">
          {t("eventos.sampleReport")}
        </p>
      ) : null}
    </main>
  );
}

