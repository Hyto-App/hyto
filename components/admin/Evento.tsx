"use client";

import Link from "next/link";
import { useState } from "react";
import { Bandeja } from "@/components/admin/Bandeja";
import { Informe } from "@/components/admin/Informe";

export function Evento({ id, nombre }: { id: string; nombre: string }) {
  const [tab, setTab] = useState<"inbox" | "report">("inbox");
  const [secreto, setSecreto] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [email, setEmail] = useState("");

  async function invitar(tipo: "code" | "direct") {
    setAviso(null);
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
  }

  return (
    <div>
      <div className="hyto-page pb-0">
        <p className="hyto-crumb">
          <Link href="/eventos">My events</Link>
          <span aria-hidden="true">/</span>
          <span>{nombre}</span>
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="hyto-tabs" role="tablist" aria-label="Event">
            <button type="button" role="tab" aria-selected={tab === "inbox"} onClick={() => setTab("inbox")}>
              Inbox
            </button>
            <button type="button" role="tab" aria-selected={tab === "report"} onClick={() => setTab("report")}>
              Report
            </button>
          </div>
          <details className="text-sm">
            <summary className="cursor-pointer font-medium">Invite</summary>
            <div className="mt-3 grid gap-2">
              <button type="button" className="hyto-btn-line" onClick={() => void invitar("code")}>
                Create a code
              </button>
              <label className="sr-only" htmlFor="invite-email">
                Email
              </label>
              <input id="invite-email" className="hyto-input" value={email} placeholder="Email" onChange={(evento) => setEmail(evento.target.value)} />
              <button type="button" className="hyto-btn-line" onClick={() => void invitar("direct")}>
                Invite by email
              </button>
              {secreto ? (
                <p className="break-all font-mono text-xs">
                  {secreto}
                  <button
                    type="button"
                    className="ml-2 underline"
                    onClick={() => void navigator.clipboard.writeText(secreto)}
                  >
                    Copy
                  </button>
                </p>
              ) : null}
              {aviso ? (
                <p role="alert" className="text-[var(--peligro)]">
                  {aviso}
                </p>
              ) : null}
            </div>
          </details>
        </div>
      </div>
      {tab === "inbox" ? <Bandeja proyectoId={id} /> : <Informe proyectoId={id} />}
    </div>
  );
}
