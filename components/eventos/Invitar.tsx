"use client";

import { useState } from "react";
import { useModoDemo } from "@/components/sesion/InsigniaDemo";

type Hecha = {
  tipo: "direct" | "code";
  secreto: string;
  enlace: string;
  expiraEn: string | null;
};

export function Invitar() {
  const demo = useModoDemo();
  const [proyectoId, setProyectoId] = useState<string | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [tipo, setTipo] = useState<"code" | "direct">("code");
  const [rol, setRol] = useState<"volunteer" | "team">("volunteer");
  const [email, setEmail] = useState("");
  const [maxUsos, setMaxUsos] = useState("50");
  const [aviso, setAviso] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [hecha, setHecha] = useState<Hecha | null>(null);

  if (demo) return null;

  async function abrir() {
    setAbierto((actual) => !actual);
    if (proyectoId) return;
    try {
      const respuesta = await fetch("/api/proyectos");
      if (!respuesta.ok) return;
      const cuerpo = (await respuesta.json()) as { proyecto?: { id?: string } };
      if (cuerpo.proyecto?.id) setProyectoId(cuerpo.proyecto.id);
    } catch {
      setAviso("Could not load this event.");
    }
  }

  async function crear() {
    if (!proyectoId) {
      setAviso("Could not load this event.");
      return;
    }
    setAviso(null);
    setOcupado(true);
    try {
      const respuesta = await fetch(`/api/proyectos/${proyectoId}/invitaciones`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          tipo,
          rol,
          email: tipo === "direct" ? email : undefined,
          maxUsos: tipo === "code" ? Number(maxUsos) : 1,
        }),
      });
      const cuerpo = (await respuesta.json().catch(() => null)) as
        | { aviso?: string; secreto?: string; enlace?: string; expiraEn?: string | null; tipo?: "direct" | "code" }
        | null;
      if (!respuesta.ok || !cuerpo?.secreto || !cuerpo.enlace) {
        setAviso(cuerpo?.aviso ?? "Could not create the invite.");
        return;
      }
      setHecha({ tipo: cuerpo.tipo ?? tipo, secreto: cuerpo.secreto, enlace: cuerpo.enlace, expiraEn: cuerpo.expiraEn ?? null });
    } catch {
      setAviso("Could not create the invite.");
    } finally {
      setOcupado(false);
    }
  }

  async function copiar(texto: string) {
    try {
      await navigator.clipboard.writeText(texto);
      setAviso("Copied.");
    } catch {
      setAviso(texto);
    }
  }

  return (
    <div>
      <button type="button" className="hyto-btn-line" onClick={() => void abrir()}>
        Invite
      </button>
      {abierto ? (
        <div className="hyto-card mt-3 grid max-w-md gap-3 p-4">
          <div className="flex gap-2">
            <button type="button" className={tipo === "code" ? "font-semibold" : "text-[var(--suave)]"} onClick={() => setTipo("code")}>
              Code
            </button>
            <button type="button" className={tipo === "direct" ? "font-semibold" : "text-[var(--suave)]"} onClick={() => setTipo("direct")}>
              Direct email
            </button>
          </div>
          <label className="text-sm text-[var(--suave)]" htmlFor="rol-invite">
            They join as
          </label>
          <select id="rol-invite" className="hyto-input" value={rol} onChange={(evento) => setRol(evento.target.value === "team" ? "team" : "volunteer")}>
            <option value="volunteer">Volunteer</option>
            <option value="team">Team</option>
          </select>
          {tipo === "direct" ? (
            <input className="hyto-input" type="email" value={email} placeholder="Email" onChange={(evento) => setEmail(evento.target.value)} />
          ) : (
            <label className="grid gap-1 text-sm text-[var(--suave)]">
              Uses
              <input className="hyto-input" inputMode="numeric" value={maxUsos} onChange={(evento) => setMaxUsos(evento.target.value)} />
            </label>
          )}
          <button type="button" className="hyto-btn" disabled={ocupado} onClick={() => void crear()}>
            {ocupado ? "Creating…" : "Create invite"}
          </button>
          {hecha ? (
            <div className="grid gap-2 text-sm">
              <p className="font-mono">{hecha.secreto}</p>
              <p className="break-all text-[var(--suave)]">{hecha.enlace}</p>
              {hecha.expiraEn ? <p className="text-[var(--suave)]">Expires {hecha.expiraEn.slice(0, 10)}.</p> : null}
              <button type="button" className="hyto-btn-line" onClick={() => void copiar(hecha.tipo === "code" ? hecha.secreto : hecha.enlace)}>
                Copy
              </button>
            </div>
          ) : null}
          {aviso ? <p className="text-sm text-[var(--suave)]">{aviso}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
