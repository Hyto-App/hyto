"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTexto } from "@/components/ui/Idioma";

type Perfil = {
  tipo: "empresa" | "voluntario";
  nombre?: string;
  actividad?: string;
  descripcion?: string;
  fotoUrl?: string | null;
};

export function TipoCuenta({ siguiente }: { siguiente?: string }) {
  const t = useTexto();
  const router = useRouter();
  const [tipo, setTipo] = useState<"empresa" | "voluntario" | "">("");
  const [nombre, setNombre] = useState("");
  const [actividad, setActividad] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [fotoUrl, setFotoUrl] = useState("");
  const [aviso, setAviso] = useState<string | null>(null);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    void fetch("/api/cuenta/tipo", { cache: "no-store" })
      .then(async (respuesta) => {
        if (!respuesta.ok) return;
        const cuerpo = (await respuesta.json()) as { perfil: Perfil | null };
        if (!cuerpo.perfil) return;
        setTipo(cuerpo.perfil.tipo);
        setNombre(cuerpo.perfil.nombre ?? "");
        setActividad(cuerpo.perfil.actividad ?? "");
        setDescripcion(cuerpo.perfil.descripcion ?? "");
        setFotoUrl(cuerpo.perfil.fotoUrl ?? "");
      })
      .catch(() => undefined);
  }, []);

  async function guardar(evento: React.FormEvent) {
    evento.preventDefault();
    setAviso(null);
    const respuesta = await fetch("/api/cuenta/tipo", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(
        tipo === "empresa" ? { tipo, nombre, actividad, descripcion, fotoUrl } : { tipo: "voluntario" },
      ),
    });
    const cuerpo = (await respuesta.json().catch(() => null)) as { aviso?: string } | null;
    if (!respuesta.ok) {
      setAviso(cuerpo?.aviso ?? t("tipoCuenta.noGuarda"));
      return;
    }
    setListo(true);
    if (siguiente) router.push(siguiente);
  }

  return (
    <form className="hyto-card mt-6 grid gap-4" onSubmit={(evento) => void guardar(evento)}>
      <div>
        <h2 className="text-lg font-medium">{t("tipoCuenta.titulo")}</h2>
        <p className="mt-1 text-sm text-[var(--suave)]">{t("tipoCuenta.subtitulo")}</p>
      </div>
      <fieldset className="grid gap-2">
        <legend className="text-sm">{t("tipoCuenta.elegir")}</legend>
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" name="tipo-cuenta" value="empresa" checked={tipo === "empresa"} onChange={() => setTipo("empresa")} />
          {t("tipoCuenta.empresa")}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" name="tipo-cuenta" value="voluntario" checked={tipo === "voluntario"} onChange={() => setTipo("voluntario")} />
          {t("tipoCuenta.voluntario")}
        </label>
      </fieldset>
      {tipo === "empresa" ? (
        <div className="grid gap-3">
          <label className="block text-sm" htmlFor="empresa-nombre">
            {t("tipoCuenta.nombre")}
            <input id="empresa-nombre" className="hyto-input mt-2 w-full" value={nombre} onChange={(evento) => setNombre(evento.target.value)} />
          </label>
          <label className="block text-sm" htmlFor="empresa-actividad">
            {t("tipoCuenta.actividad")}
            <input id="empresa-actividad" className="hyto-input mt-2 w-full" value={actividad} onChange={(evento) => setActividad(evento.target.value)} />
          </label>
          <label className="block text-sm" htmlFor="empresa-descripcion">
            {t("tipoCuenta.descripcion")}
            <textarea id="empresa-descripcion" className="hyto-input mt-2 w-full" rows={4} value={descripcion} onChange={(evento) => setDescripcion(evento.target.value)} />
          </label>
          <label className="block text-sm" htmlFor="empresa-foto">
            {t("tipoCuenta.foto")}
            <input id="empresa-foto" className="hyto-input mt-2 w-full" value={fotoUrl} onChange={(evento) => setFotoUrl(evento.target.value)} />
          </label>
        </div>
      ) : null}
      {aviso ? (
        <p className="text-sm" role="alert">
          {aviso}
        </p>
      ) : null}
      {listo && !siguiente ? <p className="text-sm">{t("tipoCuenta.guardado")}</p> : null}
      <button type="submit" className="hyto-btn" disabled={!tipo}>
        {t("tipoCuenta.guardar")}
      </button>
    </form>
  );
}
