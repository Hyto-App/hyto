"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function Unirse({ codigoInicial = "" }: { codigoInicial?: string }) {
  const router = useRouter();
  const [codigo, setCodigo] = useState(codigoInicial);
  const [aviso, setAviso] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function entrar() {
    const secreto = codigo.trim();
    if (!secreto) {
      setAviso("Enter an invite code.");
      return;
    }
    setOcupado(true);
    setAviso(null);
    try {
      const respuesta = await fetch("/api/invitaciones/aceptar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ secreto }),
      });
      const cuerpo = (await respuesta.json().catch(() => null)) as { aviso?: string } | null;
      if (!respuesta.ok) {
        setAviso(cuerpo?.aviso ?? "Could not join.");
        return;
      }
      router.push("/mis-tareas");
    } catch {
      setAviso("Could not join.");
    } finally {
      setOcupado(false);
    }
  }

  return (
    <main className="hyto-page">
      <p className="hyto-crumb">
        <Link href="/">My events</Link>
      </p>
      <h1 className="hyto-title mt-4">Join with code</h1>
      <p className="hyto-sub">Enter the code from the organizer.</p>
      <form
        className="mt-6 grid max-w-sm gap-3"
        onSubmit={(evento) => {
          evento.preventDefault();
          void entrar();
        }}
      >
        <label className="sr-only" htmlFor="codigo-evento">
          Code
        </label>
        <input id="codigo-evento" className="hyto-input" value={codigo} onChange={(evento) => setCodigo(evento.target.value)} autoComplete="off" />
        <button type="submit" className="hyto-btn" disabled={ocupado}>
          {ocupado ? "Joining…" : "Join"}
        </button>
        {aviso ? <p className="text-sm text-[var(--suave)]">{aviso}</p> : null}
      </form>
    </main>
  );
}
