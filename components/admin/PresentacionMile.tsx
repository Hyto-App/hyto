"use client";

import { useEffect, useState } from "react";
import { useTexto } from "@/components/ui/Idioma";
import { tomarPresentacionMile } from "@/lib/ui/mile-presentacion";

/** "Mile (our AI reviewer)", the first time this browser meets Mile. */
export function PresentacionMile() {
  const t = useTexto();
  const [mostrar, setMostrar] = useState(false);

  useEffect(() => {
    if (tomarPresentacionMile()) setMostrar(true);
  }, []);

  if (!mostrar) return null;
  return <p className="hyto-mile-presentacion text-sm leading-6 text-[var(--suave)]">{t("mile.presentacion")}</p>;
}
