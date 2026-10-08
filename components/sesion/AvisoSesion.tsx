"use client";

import { useEffect, useState } from "react";
import { useTexto } from "@/components/ui/Idioma";
import { urlSignin } from "@/lib/sesion/retorno";

/** Shown when a signed-in screen learns the session is gone. Same sentence as a failed signature. */
export function AvisoSesion() {
  const t = useTexto();
  const [href, setHref] = useState("/?signin=1");

  useEffect(() => {
    setHref(urlSignin(`${window.location.pathname}${window.location.search}`));
  }, []);

  return (
    <p role="alert" className="mt-4 text-sm leading-6 text-[var(--suave)]">
      {t("errores.reingreso")}{" "}
      <a className="font-semibold underline-offset-4 hover:underline" href={href}>
        {t("entrar.signInAgain")}
      </a>
    </p>
  );
}
