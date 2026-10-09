"use client";

import { useState } from "react";
import { ActividadTarea } from "@/components/integrante/ActividadTarea";
import { Checklist } from "@/components/integrante/evidencia/Checklist";
import { LineaRevision } from "@/components/integrante/evidencia/LineaRevision";
import { BotonPrincipal } from "@/components/integrante/BotonPrincipal";
import { Icono } from "@/components/ui/Marca";
import { MileAnimada } from "@/components/ui/MileAnimada";
import { useIdioma, useTexto } from "@/components/ui/Idioma";
import { cuandoVence } from "@/lib/integrante/vence";
import { formatearHora, montoDeTarea, vistaMonto } from "@/lib/integrante/formato";
import { puntosDeCondicion } from "@/lib/integrante/puntos";
import { iniciales, plazoVencido, puntosFallidos } from "@/lib/integrante/revision";
import { nombreParaMostrar } from "@/lib/sesion/nombre";
import { textoVisible } from "@/lib/ui/etiquetas";
import type { Tarea } from "@/lib/integrante/tipos";

/**
 * Send-back screen (spec §7.3). The attempt cap is not decided.
 * TODO(intentos): retry until venceEn. Do not show "N attempts left" until that is decided.
 */
export function PantallaRechazada({
  tarea,
  evento,
  onReintentar,
  onArchivo,
}: {
  tarea: Tarea;
  evento: string | null;
  onReintentar: () => void;
  onArchivo?: () => void;
}) {
  const t = useTexto();
  const idioma = useIdioma();
  const titulo = textoVisible(tarea.titulo, idioma);
  const puntos = puntosDeCondicion(tarea.condicion);
  const fallidos = puntosFallidos(tarea, puntos.length);
  const primero = fallidos.map((indice) => puntos[indice]).find((punto) => punto);
  const hayPuntosBien = fallidos.length > 0 && puntos.some((_, indice) => !fallidos.includes(indice));
  const cerrado = plazoVencido(tarea.venceEn);
  const cuando = tarea.venceEn && !cerrado ? cuandoVence(tarea.venceEn, new Date(), idioma) : null;
  const nombre = nombreParaMostrar(tarea.organizador?.nombre, evento || tarea.evento) || "";
  const nota = tarea.rechazo?.nota ?? null;
  const reembolso = tarea.tipo === "reembolso";
  const hora = horaDe(tarea.enviadaEn ?? tarea.rechazo?.en, idioma);

  return (
    <main className="hyto-page hyto-tarea hyto-rechazada">
      <header className="hyto-tarea-cab">
        <div>
          <p className="hyto-eyebrow">{t("tareas.badgeNewPhoto")}</p>
          <h1 className="hyto-tarea-titulo">{titulo}</h1>
          {evento ? <p className="hyto-tarea-meta">{textoVisible(evento, idioma)}</p> : null}
        </div>
        <span className="hyto-chip-monto">{vistaMonto(tarea, idioma).linea}</span>
      </header>

      <div className="hyto-tarea-cols">
        <div className="hyto-rechazo-foto">
          <FotoEnviada id={tarea.ultimaEvidenciaId ?? null} hora={hora} />
          {nota && nombre ? <NotaOrganizador nombre={nombre} nota={nota} /> : nota ? <NotaOrganizador nombre="" nota={nota} /> : null}
        </div>

        <div className="hyto-tarea-col">
          <section className={`hyto-tarjeta hyto-mile-rechazo${cerrado ? " is-cerrada" : ""}`}>
            <div className="hyto-solo-movil">
              <MileAnimada estado="rechazado" tamano={140} />
            </div>
            <div className="hyto-solo-escritorio">
              <MileAnimada estado="rechazado" tamano={180} />
            </div>
            <div>
              <span className="hyto-badge hyto-badge-pend">{t("tareas.badgeNewPhoto")}</span>
              <h2>
                {cerrado
                  ? t("evidencia.deadlineClosed")
                  : primero
                    ? t("evidencia.missingPoint", { point: primero })
                    : nombre
                      ? t("evidencia.organizerAskedName", { name: nombre })
                      : t("evidencia.organizerAsked")}
              </h2>
              <p>{cerrado ? t("evidencia.deadlineTalk") : hayPuntosBien ? `${t("evidencia.retakeFrame")} ${t("evidencia.restFine")}` : t("evidencia.retakeFrame")}</p>
            </div>
          </section>

          <LineaRevision tarea={tarea} revisionCerrada monto={vistaMonto(tarea, idioma).pago || montoDeTarea(tarea, idioma)} />
          <ActividadTarea tarea={tarea} />

          <Checklist condicion={tarea.condicion} fallidos={fallidos.length > 0 ? fallidos : null} titulo={t("evidencia.howPhoto")} />

          <div className="hyto-actions">
            {reembolso && !cerrado && onArchivo ? (
              <BotonPrincipal type="button" className="hyto-btn-grande hyto-solo-escritorio" onClick={onArchivo}>
                {t("tareas.chooseAnotherFile")}
              </BotonPrincipal>
            ) : null}
            <BotonPrincipal
              type="button"
              className={`hyto-btn-grande${reembolso && !cerrado ? " hyto-solo-movil" : ""}`}
              disabled={cerrado}
              onClick={onReintentar}
            >
              <Icono nombre="camera" tamano={18} />
              {t("tareas.takeAnotherPhoto")}
            </BotonPrincipal>
            {reembolso && onArchivo && !cerrado ? (
              <button type="button" className="hyto-btn-line hyto-solo-movil" onClick={onArchivo}>
                {t("evidencia.chooseFile")}
              </button>
            ) : null}
            {reembolso && !cerrado ? (
              <button type="button" className="hyto-btn-line hyto-solo-escritorio" onClick={onReintentar}>
                {t("evidencia.useCameraShort")}
              </button>
            ) : null}
            {cuando ? <p className="hyto-pista">{t("evidencia.sendUntil", { when: cuando })}</p> : null}
          </div>
        </div>
      </div>
    </main>
  );
}

function NotaOrganizador({ nombre, nota }: { nombre: string; nota: string }) {
  const t = useTexto();
  return (
    <article className="hyto-tarjeta hyto-nota-org">
      <span className="hyto-nota-org-iniciales" aria-hidden="true">
        {iniciales(nombre || "?")}
      </span>
      <div>
        {nombre ? <small>{t("evidencia.organizerRole", { name: nombre })}</small> : null}
        <p>“{nota}”</p>
      </div>
    </article>
  );
}

function FotoEnviada({ id, hora }: { id: string | null; hora: string | null }) {
  const t = useTexto();
  const [rota, setRota] = useState(false);
  return (
    <div className="hyto-visor">
      {id && !rota ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`/api/evidencias/${encodeURIComponent(id)}/foto`} alt={t("evidencia.alt")} onError={() => setRota(true)} />
      ) : (
        <div className="hyto-visor-vacio">
          <p>{t("evidencia.photoSent")}</p>
        </div>
      )}
      <span className="hyto-visor-pill">{hora ? t("evidencia.photoSentAt", { time: hora }) : t("evidencia.photoSent")}</span>
    </div>
  );
}

function horaDe(iso: string | null | undefined, idioma: "en" | "es"): string | null {
  if (!iso) return null;
  return formatearHora(iso, idioma);
}
