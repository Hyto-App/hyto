"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { Mile } from "@/components/ui/Mile";
import { useTexto } from "@/components/ui/Idioma";
import { gestoVisto, marcarGesto } from "@/lib/ui/gesto";

const DURACION_MS = 350;

/**
 * Peak: Mile's drawn "la tengo" state, the amount in front, the cap behind it.
 * The gesture is the 8px settle. If the person is not looking, or comes back, it stays settled.
 */
export function MomentoLaTengo({
  tareaId,
  monto,
  tope,
  children,
}: {
  tareaId: string;
  monto: string;
  tope: string | null;
  children: ReactNode;
}) {
  const t = useTexto();
  const clave = `hyto-la-tengo:${tareaId}`;
  const [asentado, setAsentado] = useState(true);

  useEffect(() => {
    if (document.hidden || gestoVisto(clave)) {
      marcarGesto(clave);
      return;
    }
    setAsentado(false);
    const fin = window.setTimeout(() => {
      marcarGesto(clave);
      setAsentado(true);
    }, DURACION_MS);
    const alCambiar = () => {
      if (!document.hidden) return;
      marcarGesto(clave);
      setAsentado(true);
    };
    document.addEventListener("visibilitychange", alCambiar);
    return () => {
      window.clearTimeout(fin);
      document.removeEventListener("visibilitychange", alCambiar);
    };
  }, [clave]);

  return (
    <main className={`hyto-page hyto-tarea hyto-enviada hyto-la-tengo${asentado ? " hyto-asentado" : ""}`}>
      <Mile estado="la-tengo" tamano={140} />
      <h1 className="hyto-tarea-titulo">{t("evidencia.evidenceReady")}</h1>
      {monto ? <p className="hyto-la-tengo-monto">{monto}</p> : null}
      {tope ? <p className="hyto-la-tengo-tope">{tope}</p> : null}
      <p className="hyto-la-tengo-frase">{t("evidencia.mileRecommends")}</p>
      <details className="hyto-ver-mas">
        <summary>{t("evidencia.seeMore")}</summary>
        <div className="hyto-ver-mas-cuerpo">{children}</div>
      </details>
      <div className="hyto-enviada-acciones">
        <Link href="/mis-tareas" className="hyto-btn hyto-btn-grande">
          {t("evidencia.backToTasks")}
        </Link>
      </div>
    </main>
  );
}
