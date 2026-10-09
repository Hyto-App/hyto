"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ReciboPago } from "@/components/integrante/evidencia/ReciboPago";
import { useModoDemo } from "@/components/sesion/InsigniaDemo";
import { useTexto } from "@/components/ui/Idioma";
import { leerMemoria } from "@/lib/integrante/almacen";
import { leerTarea } from "@/lib/integrante/rutas";
import type { Tarea } from "@/lib/integrante/tipos";

export function PantallaRecibo({ tareaId }: { tareaId: string }) {
  const t = useTexto();
  const demo = useModoDemo();
  const [tarea, setTarea] = useState<Tarea | null>(null);
  const [lista, setLista] = useState(true);

  useEffect(() => {
    let viva = true;
    setLista(true);
    const memoria = leerMemoria();
    void leerTarea(tareaId, { miembroId: "" }, { estados: demo ? memoria.estados : undefined, muestra: demo }).then((resultado) => {
      if (!viva) return;
      setLista(false);
      setTarea(resultado.error || !resultado.tarea ? null : resultado.tarea);
    });
    return () => {
      viva = false;
    };
  }, [tareaId, demo]);

  if (lista) {
    return (
      <main className="hyto-page">
        <p className="text-[var(--suave)]">{t("comunes.loading")}</p>
      </main>
    );
  }

  if (!tarea) {
    return (
      <main className="hyto-page hyto-recibo-pagina">
        <h1>{t("evidencia.receiptTitle")}</h1>
        <p className="text-sm leading-6 text-[var(--suave)]">{t("evidencia.receiptLoadFail")}</p>
        <Link href="/mis-tareas" className="hyto-btn-line is-inline px-5">
          {t("evidencia.backToTasks")}
        </Link>
      </main>
    );
  }

  return <ReciboPago tarea={tarea} />;
}
