"use client";

import Link from "next/link";
import { useId } from "react";
import { useTexto } from "@/components/ui/Idioma";

type Props = {
  acepta: boolean;
  alCambiar: (valor: boolean) => void;
  aviso?: string;
};

/** Clear acceptance of the Terms and the Privacy Policy. Links do not toggle the box. */
export function AceptoLegal({ acepta, alCambiar, aviso }: Props) {
  const t = useTexto();
  const id = useId();
  return (
    <div className="hyto-legal-acepto">
      <input
        id={id}
        name="acepto-legal"
        type="checkbox"
        checked={acepta}
        onChange={(evento) => alCambiar(evento.target.checked)}
      />
      <div>
        <p className="hyto-legal-linea">
          <label htmlFor={id}>{t("legal.acceptBefore")}</label> <Link href="/terms">{t("legal.terms")}</Link>{" "}
          {t("legal.and")} <Link href="/privacy">{t("legal.privacy")}</Link>
        </p>
        {aviso ? <p className="hyto-legal-nota">{aviso}</p> : null}
      </div>
    </div>
  );
}
