"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useClaro, useTexto } from "@/components/ui/Idioma";
import { leerPerfilCuenta } from "@/lib/cuenta/reglas";
import { AvisoCampo, propsError, useEnfocarError, type ErrorCampo } from "@/lib/ui/error-campo";

type Perfil = {
  tipo: "empresa" | "voluntario";
  nombre?: string;
  actividad?: string;
  descripcion?: string;
  fotoUrl?: string | null;
};

export function TipoCuenta({ siguiente }: { siguiente?: string }) {
  const t = useTexto();
  const claro = useClaro();
  const router = useRouter();
  const [tipo, setTipo] = useState<"empresa" | "voluntario" | "">("");
  const [nombre, setNombre] = useState("");
  const [actividad, setActividad] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [fotoUrl, setFotoUrl] = useState("");
  const [aviso, setAviso] = useState<string | null>(null);
  const [falla, setFalla] = useState<ErrorCampo | null>(null);
  const [listo, setListo] = useState(false);
  useEnfocarError(falla);

  function idDe(avisoTexto: string): string | null {
    if (avisoTexto === "Choose an account type.") return "tipo-cuenta-empresa";
    if (avisoTexto === "Enter the community name.") return "empresa-nombre";
    if (avisoTexto === "Say what the community does.") return "empresa-actividad";
    if (avisoTexto === "Enter a short description.") return "empresa-descripcion";
    if (avisoTexto === "The photo has to be an https URL.") return "empresa-foto";
    return null;
  }

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
    const leido = leerPerfilCuenta(tipo === "empresa" ? { tipo, nombre, actividad, descripcion, fotoUrl } : { tipo: tipo || "voluntario" });
    if ("aviso" in leido) {
      const id = idDe(leido.aviso);
      if (id) setFalla({ id, mensaje: claro(leido.aviso) });
      else setAviso(claro(leido.aviso));
      return;
    }
    if (!tipo) {
      setFalla({ id: "tipo-cuenta-empresa", mensaje: t("tipoCuenta.faltaTipo") });
      return;
    }
    setFalla(null);
    const respuesta = await fetch("/api/cuenta/tipo", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(
        tipo === "empresa" ? { tipo, nombre, actividad, descripcion, fotoUrl } : { tipo: "voluntario" },
      ),
    });
    const cuerpo = (await respuesta.json().catch(() => null)) as { aviso?: string } | null;
    if (!respuesta.ok) {
      const mensaje = cuerpo?.aviso ?? "";
      const id = idDe(mensaje);
      if (id) setFalla({ id, mensaje: claro(mensaje) });
      else setAviso(mensaje ? claro(mensaje) : t("tipoCuenta.noGuarda"));
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
          <input
            id="tipo-cuenta-empresa"
            type="radio"
            name="tipo-cuenta"
            value="empresa"
            checked={tipo === "empresa"}
            onChange={() => {
              setTipo("empresa");
              if (falla?.id === "tipo-cuenta-empresa") setFalla(null);
            }}
            {...propsError(falla, "tipo-cuenta-empresa")}
          />
          {t("tipoCuenta.empresa")}
        </label>
        <AvisoCampo id="tipo-cuenta-empresa-error" mensaje={falla?.id === "tipo-cuenta-empresa" ? falla.mensaje : null} />
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" name="tipo-cuenta" value="voluntario" checked={tipo === "voluntario"} onChange={() => setTipo("voluntario")} />
          {t("tipoCuenta.voluntario")}
        </label>
      </fieldset>
      {tipo === "empresa" ? (
        <div className="grid gap-3">
          <label className="block text-sm" htmlFor="empresa-nombre">
            {t("tipoCuenta.nombre")}
            <input
              id="empresa-nombre"
              className="hyto-input mt-2 w-full"
              value={nombre}
              onChange={(evento) => {
                setNombre(evento.target.value);
                if (falla?.id === "empresa-nombre") setFalla(null);
              }}
              {...propsError(falla, "empresa-nombre")}
            />
            <AvisoCampo id="empresa-nombre-error" mensaje={falla?.id === "empresa-nombre" ? falla.mensaje : null} />
          </label>
          <label className="block text-sm" htmlFor="empresa-actividad">
            {t("tipoCuenta.actividad")}
            <input
              id="empresa-actividad"
              className="hyto-input mt-2 w-full"
              value={actividad}
              onChange={(evento) => {
                setActividad(evento.target.value);
                if (falla?.id === "empresa-actividad") setFalla(null);
              }}
              {...propsError(falla, "empresa-actividad")}
            />
            <AvisoCampo id="empresa-actividad-error" mensaje={falla?.id === "empresa-actividad" ? falla.mensaje : null} />
          </label>
          <label className="block text-sm" htmlFor="empresa-descripcion">
            {t("tipoCuenta.descripcion")}
            <textarea
              id="empresa-descripcion"
              className="hyto-input mt-2 w-full"
              rows={4}
              value={descripcion}
              onChange={(evento) => {
                setDescripcion(evento.target.value);
                if (falla?.id === "empresa-descripcion") setFalla(null);
              }}
              {...propsError(falla, "empresa-descripcion")}
            />
            <AvisoCampo id="empresa-descripcion-error" mensaje={falla?.id === "empresa-descripcion" ? falla.mensaje : null} />
          </label>
          <label className="block text-sm" htmlFor="empresa-foto">
            {t("tipoCuenta.foto")}
            <input
              id="empresa-foto"
              className="hyto-input mt-2 w-full"
              value={fotoUrl}
              onChange={(evento) => {
                setFotoUrl(evento.target.value);
                if (falla?.id === "empresa-foto") setFalla(null);
              }}
              {...propsError(falla, "empresa-foto")}
            />
            <AvisoCampo id="empresa-foto-error" mensaje={falla?.id === "empresa-foto" ? falla.mensaje : null} />
          </label>
        </div>
      ) : null}
      {aviso ? <p className="text-sm">{aviso}</p> : null}
      {listo && !siguiente ? <p className="text-sm">{t("tipoCuenta.guardado")}</p> : null}
      <button type="submit" className="hyto-btn" disabled={!tipo}>
        {t("tipoCuenta.guardar")}
      </button>
    </form>
  );
}
