"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function AceptarInvitacion({ secreto }: { secreto: string }) {
  const router = useRouter();
  const [aviso, setAviso] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function aceptar() {
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
        setAviso(cuerpo?.aviso ?? "Could not accept the invite.");
        return;
      }
      router.push("/mis-tareas");
    } catch {
      setAviso("Could not accept the invite.");
    } finally {
      setOcupado(false);
    }
  }

  return (
    <main className="hyto-page">
      <p className="hyto-crumb">
        <Link href="/">My events</Link>
      </p>
      <h1 className="hyto-title mt-4">Accept invite</h1>
      <p className="hyto-sub">This link is for the email on the invite.</p>
      <button type="button" className="hyto-btn mt-6" disabled={ocupado} onClick={() => void aceptar()}>
        {ocupado ? "Joining…" : "Accept invite"}
      </button>
      {aviso ? <p className="mt-4 text-sm text-[var(--suave)]">{aviso}</p> : null}
    </main>
  );
}
