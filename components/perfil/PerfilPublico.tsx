"use client";

import Link from "next/link";
import { useState } from "react";
import { EnlaceExplorador } from "@/components/ui/EnlaceExplorador";
import { useIdioma, useTexto } from "@/components/ui/Idioma";
import type { VistaPerfil } from "@/lib/api/perfil-publico";
import { formatearMonto } from "@/lib/integrante/formato";
import type { Idioma } from "@/lib/ui/idioma";

const VISIBLES = 3;

function locale(idioma: Idioma): string {
  return idioma === "es" ? "es-CR" : "en-US";
}

/** Costa Rica writes «set» for September. */
function mesTico(texto: string, idioma: Idioma): string {
  return idioma === "es" ? texto.replace(/\bsept?\b/gi, "set") : texto;
}

/** «10 oct», «Oct 10». No trailing dot. */
export function fechaCorta(iso: string | null, idioma: Idioma): string {
  if (!iso) return "";
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return "";
  const corto = new Intl.DateTimeFormat(locale(idioma), { day: "numeric", month: "short", timeZone: "America/Costa_Rica" })
    .format(fecha)
    .replace(/\./g, "");
  return mesTico(corto, idioma);
}

/** «oct 2026», «Oct 2026». */
export function mesAno(iso: string | null, idioma: Idioma): string {
  if (!iso) return "";
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return "";
  const texto = new Intl.DateTimeFormat(locale(idioma), { month: "short", year: "numeric", timeZone: "America/Costa_Rica" })
    .format(fecha)
    .replace(/\./g, "")
    .replace(/\s+de\s+/, " ");
  return mesTico(texto, idioma);
}

export function NoDisponible() {
  const t = useTexto();
  return (
    <div className="pf-pagina">
      <div className="pf-col">
        <BarraPerfil />
        <div className="pf-vacio" style={{ marginTop: 40 }} role="status">
          <strong>{t("perfilPublico.noDisponible")}</strong>
          {t("perfilPublico.noDisponibleDetalle")}
        </div>
      </div>
    </div>
  );
}

function BarraPerfil() {
  const t = useTexto();
  return (
    <div className="pf-top">
      <button
        type="button"
        className="pf-volver"
        onClick={() => {
          if (window.history.length > 1) window.history.back();
          else window.location.assign("/");
        }}
      >
        ‹ {t("perfilPublico.volver")}
      </button>
      <Link href="/" className="pf-logo" aria-label="Hyto">
        hyto
      </Link>
      <span aria-hidden="true" />
    </div>
  );
}

export function PerfilPublico({ vista }: { vista: VistaPerfil }) {
  const t = useTexto();
  const idioma = useIdioma();
  const [todas, setTodas] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const nombre = vista.nombre ?? t("perfilPublico.sinNombre");
  const inicialesVisibles = vista.iniciales || "H";
  const { cifras } = vista;
  const lista = todas ? cifras.historial : cifras.historial.slice(0, VISIBLES);
  const desde = mesAno(vista.desde, idioma);

  async function compartir() {
    const url = window.location.href.split("#")[0].split("?")[0];
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title: nombre, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Cancelled share sheet: nothing to do.
    }
  }

  return (
    <div className="pf-pagina">
      <main className="pf-col" aria-labelledby="pf-nombre">
        <BarraPerfil />
        <div className="pf-av" aria-hidden="true">
          {inicialesVisibles}
        </div>
        <h1 id="pf-nombre" className="pf-nombre">
          {nombre}
        </h1>
        {desde ? <p className="pf-sub">{t("perfilPublico.desde", { fecha: desde })}</p> : null}
        {vista.bio ? <p className="pf-bio">{vista.bio}</p> : null}
        {vista.propio && !vista.privacidad.publico ? (
          <p className="pf-aviso" role="status">
            {t("perfilPublico.privadoAviso")}
          </p>
        ) : null}

        <dl className="pf-stats">
          <div className="pf-st">
            <dt className="sr-only">{t("perfilPublico.tareasHechas")}</dt>
            <dd>
              <b>{cifras.tareasHechas}</b>
              <span aria-hidden="true">{t("perfilPublico.tareasHechas")}</span>
            </dd>
          </div>
          <div className="pf-st">
            <dt className="sr-only">{t("perfilPublico.eventos")}</dt>
            <dd>
              <b>{cifras.eventos}</b>
              <span aria-hidden="true">{t("perfilPublico.eventos")}</span>
            </dd>
          </div>
          <div className="pf-st">
            <dt className="sr-only">{t("perfilPublico.aprobadasSinCambios")}</dt>
            <dd>
              <b>{cifras.aprobadasSinCambios === null ? t("perfilPublico.sinDato") : `${cifras.aprobadasSinCambios}%`}</b>
              <span className="pf-largo" aria-hidden="true">
                {t("perfilPublico.aprobadasSinCambios")}
              </span>
              <span className="pf-corto" aria-hidden="true">
                {t("perfilPublico.aprobadas")}
              </span>
            </dd>
          </div>
        </dl>

        <h2 className="pf-h3">{t("perfilPublico.historial")}</h2>
        {cifras.historial.length === 0 ? (
          <div className="pf-vacio">
            <strong>{t("perfilPublico.vacioTitulo")}</strong>
            {t(vista.propio ? "perfilPublico.vacio" : "perfilPublico.vacioOtro")}
          </div>
        ) : (
          <>
            <ul className="pf-lista" id="pf-historial">
              {lista.map((item) => {
                const fecha = fechaCorta(item.fecha, idioma);
                const partes = [item.evento, fecha].filter(Boolean).join(" · ");
                return (
                  <li key={item.tareaId} className="pf-it">
                    <div className="pf-fila">
                      <span className="pf-t">{item.titulo}</span>
                      <span className="pf-ok">{t("perfilPublico.pagada")}</span>
                    </div>
                    <div className="pf-fila">
                      <span className="pf-m">
                        {partes}
                        {" · "}
                        {item.monto !== null ? (
                          formatearMonto(item.monto, idioma)
                        ) : (
                          <span className="pf-oculto">{t("perfilPublico.montoOculto")}</span>
                        )}
                      </span>
                      {item.enlace ? (
                        <EnlaceExplorador href={item.enlace} className="pf-enlace">
                          {t("perfilPublico.verEnStellar")} ↗
                        </EnlaceExplorador>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
            {cifras.historial.length > VISIBLES ? (
              <button type="button" className="pf-mas" aria-expanded={todas} aria-controls="pf-historial" onClick={() => setTodas((actual) => !actual)}>
                {todas ? t("perfilPublico.verMenos") : t("perfilPublico.verTodas", { total: cifras.historial.length })}
              </button>
            ) : null}
          </>
        )}
        <p className="pf-regla">{t("perfilPublico.reglaCifras")}</p>
        {vista.privacidad.publico ? (
          <button type="button" className="pf-share" onClick={() => void compartir()}>
            {t("perfilPublico.compartir")}
          </button>
        ) : null}
        {copiado ? (
          <p role="status" className="pf-sub" style={{ marginTop: 8 }}>
            {t("perfilPublico.copiado")}
          </p>
        ) : null}
      </main>
    </div>
  );
}
