"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTexto } from "@/components/ui/Idioma";
import type { Clave } from "@/lib/ui/diccionario";

type Ajustes = { nombre: string; publico: boolean; mostrarMontos: boolean; enlace: string };

/** Account settings for the public profile: name, public or private, show amounts. */
export function AjustesPerfil() {
  const t = useTexto();
  const [ajustes, setAjustes] = useState<Ajustes | null>(null);
  const [nombre, setNombre] = useState("");
  const [aviso, setAviso] = useState<string | null>(null);
  const [listo, setListo] = useState(false);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    void fetch("/api/cuenta/perfil-publico", { cache: "no-store" })
      .then(async (respuesta) => {
        if (!respuesta.ok) return;
        const cuerpo = (await respuesta.json()) as Ajustes;
        setAjustes(cuerpo);
        setNombre(cuerpo.nombre ?? "");
      })
      .catch(() => undefined);
  }, []);

  async function enviar(cambio: Partial<Ajustes>): Promise<boolean> {
    setAviso(null);
    setListo(false);
    setGuardando(true);
    try {
      const respuesta = await fetch("/api/cuenta/perfil-publico", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(cambio),
      });
      const cuerpo = (await respuesta.json().catch(() => null)) as (Ajustes & { clave?: string }) | null;
      if (!respuesta.ok || !cuerpo || "aviso" in cuerpo) {
        setAviso(t(((cuerpo?.clave as Clave | undefined) ?? "perfilPublico.noGuarda") as Clave));
        return false;
      }
      setAjustes(cuerpo);
      setListo(true);
      return true;
    } catch {
      setAviso(t("perfilPublico.noGuarda"));
      return false;
    } finally {
      setGuardando(false);
    }
  }

  function interruptor(campo: "publico" | "mostrarMontos", etiqueta: Clave, ayuda: Clave) {
    const valor = ajustes?.[campo] ?? (campo === "publico");
    const id = `pf-${campo}`;
    return (
      <div className="pf-switch">
        <div className="min-w-0">
          <p id={`${id}-l`} className="text-sm font-medium">
            {t(etiqueta)}
          </p>
          <p id={`${id}-a`} className="mt-1 text-sm text-[var(--suave)]">
            {t(ayuda)}
          </p>
        </div>
        <button
          id={id}
          type="button"
          role="switch"
          aria-checked={valor}
          aria-labelledby={`${id}-l`}
          aria-describedby={`${id}-a`}
          disabled={!ajustes || guardando}
          onClick={() => void enviar({ [campo]: !valor })}
        />
      </div>
    );
  }

  return (
    <section className="hyto-card pf-ajustes mt-6 grid gap-5 p-5" aria-labelledby="pf-ajustes">
      <div>
        <h2 id="pf-ajustes" className="text-lg font-medium">
          {t("perfilPublico.ajustesTitulo")}
        </h2>
        <p className="mt-1 text-sm text-[var(--suave)]">{t("perfilPublico.ajustesSub")}</p>
      </div>
      <form
        className="grid gap-2"
        onSubmit={(evento) => {
          evento.preventDefault();
          void enviar({ nombre });
        }}
      >
        <label className="block text-sm" htmlFor="pf-nombre-propio">
          {t("perfilPublico.nombre")}
        </label>
        <input
          id="pf-nombre-propio"
          className="hyto-input"
          value={nombre}
          maxLength={60}
          autoComplete="name"
          aria-describedby="pf-nombre-ayuda"
          onChange={(evento) => setNombre(evento.target.value)}
        />
        <p id="pf-nombre-ayuda" className="text-xs text-[var(--suave)]">
          {t("perfilPublico.nombreAyuda")}
        </p>
        <button type="submit" className="hyto-btn-line" disabled={!ajustes || guardando || !nombre.trim()}>
          {t("perfilPublico.guardar")}
        </button>
      </form>
      {interruptor("publico", "perfilPublico.publico", "perfilPublico.publicoAyuda")}
      {interruptor("mostrarMontos", "perfilPublico.montos", "perfilPublico.montosAyuda")}
      {aviso ? (
        <p role="alert" className="text-sm text-[var(--peligro)]">
          {aviso}
        </p>
      ) : null}
      {listo ? (
        <p role="status" className="text-sm">
          {t("perfilPublico.guardado")}
        </p>
      ) : null}
      {ajustes ? (
        <Link href={ajustes.enlace} className="hyto-btn">
          {t("perfilPublico.verPerfil")}
        </Link>
      ) : null}
    </section>
  );
}
