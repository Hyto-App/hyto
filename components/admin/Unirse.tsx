"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BotonPrincipal } from "@/components/integrante/BotonPrincipal";
import { useClaro, useTexto } from "@/components/ui/Idioma";
import { AvisoCampo, propsError, useEnfocarError, type ErrorCampo } from "@/lib/ui/error-campo";

export function Unirse({ secretoInicial = "" }: { secretoInicial?: string }) {
  const t = useTexto();
  const claro = useClaro();
  const router = useRouter();
  const [secreto, setSecreto] = useState(secretoInicial);
  const [falla, setFalla] = useState<ErrorCampo | null>(null);
  const [ocupado, setOcupado] = useState(false);
  useEnfocarError(falla);

  async function enviar() {
    const codigo = secreto.trim();
    if (!codigo) {
      setFalla({ id: "codigo-join", mensaje: t("eventos.codeMissing") });
      return;
    }
    setOcupado(true);
    setFalla(null);
    try {
      const respuesta = await fetch("/api/join", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ secreto: codigo }),
      });
      const cuerpo = (await respuesta.json().catch(() => null)) as { proyectoId?: string; aviso?: string } | null;
      if (!respuesta.ok || !cuerpo?.proyectoId) {
        setFalla({ id: "codigo-join", mensaje: claro(cuerpo?.aviso ?? "That code is not valid.") });
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
      <input
        id="codigo-join"
        className="hyto-input mt-2"
        value={secreto}
        placeholder="HYTO-XXXX"
        autoComplete="off"
        spellCheck={false}
        onChange={(evento) => {
          setSecreto(evento.target.value);
          if (falla) setFalla(null);
        }}
        {...propsError(falla, "codigo-join", "codigo-join-ayuda")}
      />
      <p id="codigo-join-ayuda" className="mt-2 text-sm text-[var(--suave)]">
        {t("eventos.codeHelp")}
      </p>
      <AvisoCampo id="codigo-join-error" mensaje={falla?.mensaje ?? null} />
      <div className="mt-4">
        <BotonPrincipal type="button" disabled={ocupado} onClick={() => void enviar()}>
          {t("eventos.join")}
        </BotonPrincipal>
      </div>
    </main>
  );
}
