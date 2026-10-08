"use client";

import { useEffect, useState } from "react";
import { useTexto } from "@/components/ui/Idioma";
import type { EtiquetaVoluntario } from "@/lib/perfil/reglas";
import { claveEtiqueta, etiquetasVisibles } from "./Ficha";

export function EditorPerfil() {
  const t = useTexto();
  const [experiencia, setExperiencia] = useState("");
  const [elegidas, setElegidas] = useState<EtiquetaVoluntario[]>([]);
  const [aviso, setAviso] = useState<string | null>(null);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    void fetch("/api/cuenta/perfil", { cache: "no-store" })
      .then(async (respuesta) => {
        if (!respuesta.ok) return;
        const cuerpo = (await respuesta.json()) as { perfil?: { experiencia: string | null; etiquetas: EtiquetaVoluntario[] } };
        setExperiencia(cuerpo.perfil?.experiencia ?? "");
        setElegidas(cuerpo.perfil?.etiquetas ?? []);
      })
      .catch(() => undefined);
  }, []);

  function cambiar(etiqueta: EtiquetaVoluntario, marcado: boolean) {
    setElegidas((actuales) => {
      if (!marcado) return actuales.filter((item) => item !== etiqueta);
      if (actuales.includes(etiqueta) || actuales.length >= 5) return actuales;
      return [...actuales, etiqueta];
    });
  }

  async function guardar(evento: React.FormEvent) {
    evento.preventDefault();
    setAviso(null);
    setListo(false);
    const respuesta = await fetch("/api/cuenta/perfil", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ experiencia, etiquetas: elegidas }),
    });
    const cuerpo = (await respuesta.json().catch(() => null)) as { aviso?: string } | null;
    if (!respuesta.ok) {
      setAviso(cuerpo?.aviso ?? t("perfil.noGuarda"));
      return;
    }
    setListo(true);
  }

  return (
    <form className="hyto-card mt-6 grid gap-4" onSubmit={(evento) => void guardar(evento)}>
      <div>
        <h2 className="text-lg font-medium">{t("perfil.titulo")}</h2>
        <p className="mt-1 text-sm text-[var(--suave)]">{t("perfil.subtitulo")}</p>
      </div>
      <label className="block text-sm" htmlFor="experiencia-propia">
        {t("perfil.experiencia")}
        <textarea id="experiencia-propia" className="hyto-input mt-2 w-full" rows={3} value={experiencia} onChange={(evento) => setExperiencia(evento.target.value)} />
      </label>
      <fieldset className="grid gap-2">
        <legend className="text-sm">{t("perfil.etiquetas")}</legend>
        {etiquetasVisibles().map((etiqueta) => {
          const marcada = elegidas.includes(etiqueta);
          return (
            <label key={etiqueta} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="etiqueta"
                value={etiqueta}
                checked={marcada}
                disabled={!marcada && elegidas.length >= 5}
                onChange={(evento) => cambiar(etiqueta, evento.target.checked)}
              />
              {t(claveEtiqueta(etiqueta))}
            </label>
          );
        })}
      </fieldset>
      {aviso ? <p className="text-sm">{aviso}</p> : null}
      {listo ? <p className="text-sm">{t("perfil.guardado")}</p> : null}
      <button type="submit" className="hyto-btn">
        {t("perfil.guardar")}
      </button>
    </form>
  );
}
