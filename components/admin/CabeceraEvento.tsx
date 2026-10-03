"use client";

import Link from "next/link";
import { useState } from "react";
import { useClaro, useTexto } from "@/components/ui/Idioma";

export function CabeceraEvento({
  id,
  nombre,
  rol,
  pestana,
}: {
  id: string;
  nombre: string;
  rol: "organizer" | "team" | "volunteer";
  pestana: "inbox" | "tasks" | "report";
}) {
  const [abierto, setAbierto] = useState(false);
  const [secreto, setSecreto] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [copiado, setCopiado] = useState(false);
  const t = useTexto();
  const claro = useClaro();
  const organiza = rol === "organizer";

  async function invitar(tipo: "code" | "direct") {
    setAviso(null);
    setCopiado(false);
    const respuesta = await fetch(`/api/eventos/${encodeURIComponent(id)}/invitaciones`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(tipo === "code" ? { tipo: "code", rol: "volunteer" } : { tipo: "direct", email, rol: "volunteer" }),
    });
    const cuerpo = (await respuesta.json().catch(() => null)) as { secreto?: string; aviso?: string } | null;
    if (!respuesta.ok || !cuerpo?.secreto) {
      setAviso(cuerpo?.aviso ?? "Could not create the invite.");
      return;
    }
    setSecreto(tipo === "code" ? cuerpo.secreto : `${window.location.origin}/join/${cuerpo.secreto}`);
    setAbierto(true);
  }

  async function copiar() {
    if (!secreto) return;
    const enlace = secreto.startsWith("HYTO-") ? `${window.location.origin}/join/${encodeURIComponent(secreto)}` : secreto;
    await navigator.clipboard.writeText(enlace);
    setCopiado(true);
    window.setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <div className="hyto-page pb-0">
      <p className="hyto-crumb">
        <Link href="/eventos">{t("eventos.title")}</Link>
        <span aria-hidden="true">/</span>
        <span>{nombre}</span>
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="hyto-title">{nombre}</h1>
        {organiza ? (
          <button id="invitar" type="button" className="hyto-btn is-inline px-6" onClick={() => setAbierto((actual) => !actual)}>
            {t("eventos.invite")}
          </button>
        ) : null}
      </div>
      {organiza && abierto ? (
        <div className="hyto-card mt-4 grid gap-3 p-5" role="region" aria-label={t("eventos.inviteRegion")}>
          <button type="button" className="hyto-btn-line" onClick={() => void invitar("code")}>
            {t("eventos.createCode")}
          </button>
          <label className="sr-only" htmlFor="invite-email">
            {t("eventos.email")}
          </label>
          <input id="invite-email" className="hyto-input" value={email} placeholder={t("eventos.email")} onChange={(evento) => setEmail(evento.target.value)} />
          <button type="button" className="hyto-btn-line" onClick={() => void invitar("direct")}>
            {t("eventos.inviteEmail")}
          </button>
          {secreto ? <p className="break-all font-mono text-2xl font-semibold tracking-wide">{secreto}</p> : null}
          {secreto ? (
            <button type="button" className="hyto-btn-line" onClick={() => void copiar()}>
              {t("eventos.copyLink")}
            </button>
          ) : null}
          {copiado ? (
            <p role="status" className="text-sm">
              {t("eventos.copied")}
            </p>
          ) : null}
          {aviso ? (
            <p role="alert" className="text-sm text-[var(--peligro)]">
              {claro(aviso)}
            </p>
          ) : null}
        </div>
      ) : null}
      {organiza ? (
        <div className="hyto-tabs mt-6 flex flex-wrap" role="tablist" aria-label={t("eventos.tablist")}>
          <Link href={`/eventos/${id}`} role="tab" aria-selected={pestana === "inbox"} aria-current={pestana === "inbox" ? "page" : undefined}>
            {t("eventos.inbox")}
          </Link>
          <Link
            href={`/eventos/${id}/tareas`}
            role="tab"
            aria-selected={pestana === "tasks"}
            aria-current={pestana === "tasks" ? "page" : undefined}
          >
            {t("eventos.tasks")}
          </Link>
          <Link
            href={`/eventos/${id}/informe`}
            role="tab"
            aria-selected={pestana === "report"}
            aria-current={pestana === "report" ? "page" : undefined}
          >
            {t("eventos.report")}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
