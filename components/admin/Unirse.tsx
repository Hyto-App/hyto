"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BotonPrincipal } from "@/components/integrante/BotonPrincipal";
import { useClaro, useTexto } from "@/components/ui/Idioma";

export function Unirse({ secretoInicial = "" }: { secretoInicial?: string }) {
  const t = useTexto();
  const claro = useClaro();
  const router = useRouter();
  const [secreto, setSecreto] = useState(secretoInicial);
  const [aviso, setAviso] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function enviar() {
    setOcupado(true);
    setAviso(null);
    try {
      const respuesta = await fetch("/api/join", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ secreto }),
      });
      const cuerpo = (await respuesta.json().catch(() => null)) as { proyectoId?: string; aviso?: string } | null;
      if (!respuesta.ok || !cuerpo?.proyectoId) {
        setAviso(cuerpo?.aviso ?? "That code is not valid.");
        return;
      }
      router.push(`/eventos/${cuerpo.proyectoId}`);
    } finally {
      setOcupado(false);
    }
  }

  return (
    <main className="hyto-page mx-auto max-w-lg">
      <h1 className="hyto-title">{t("eventos.joinTitle")}</h1>
      <label className="mt-6 block text-sm text-[var(--suave)]" htmlFor="codigo-join">
        {t("eventos.code")}
      </label>
      <input id="codigo-join" className="hyto-input mt-2" value={secreto} onChange={(evento) => setSecreto(evento.target.value)} />
      <div className="mt-4">
        <BotonPrincipal type="button" disabled={ocupado || !secreto.trim()} onClick={() => void enviar()}>
          {t("eventos.join")}
        </BotonPrincipal>
      </div>
      {aviso ? (
        <p role="alert" className="mt-4 text-sm text-[var(--peligro)]">
          {claro(aviso)}
        </p>
      ) : null}
    </main>
  );
}
