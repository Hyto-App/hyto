"use client";

import { useEffect, useId, useState } from "react";
import { useTexto } from "@/components/ui/Idioma";
import { TextoRico } from "@/components/ui/TextoClaro";
import { enlacePasskey, enlacePasskeyVisible } from "@/lib/integrante/enlacePasskey";

type Copia = "nada" | "copiado" | "fallo";

type Props = {
  /** Runs the step that failed again. Without it, step 4 asks to run that step again. */
  alReintentar?: () => void;
  reintentando?: boolean;
  className?: string;
  /** `cuenta`: shown on Account when this browser cannot add a passkey because it has no key. */
  variante?: "firma" | "cuenta";
};

/**
 * Shown when this browser does not hold the Cavos account key and no passkey is on file
 * (`needs-device-approval`). Walks the person through adding a passkey in the browser where they
 * signed up, then back here to restore the key with it.
 */
export function GuiaPasskey({ alReintentar, reintentando = false, className, variante = "firma" }: Props) {
  const t = useTexto();
  const id = useId();
  const [enlace, setEnlace] = useState<string | null>(null);
  const [visible, setVisible] = useState("hyto.vercel.app/account");
  const [puedeCompartir, setPuedeCompartir] = useState(false);
  const [copia, setCopia] = useState<Copia>("nada");

  useEffect(() => {
    setEnlace(enlacePasskey(window.location.origin));
    setVisible(enlacePasskeyVisible(window.location.host));
    setPuedeCompartir(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  async function copiar() {
    if (!enlace) return;
    try {
      await navigator.clipboard.writeText(enlace);
      setCopia("copiado");
    } catch {
      setCopia("fallo");
    }
  }

  async function compartir() {
    if (!enlace) return;
    try {
      await navigator.share({ title: t("guiaPasskey.compartirTitulo"), text: t("guiaPasskey.compartirTexto"), url: enlace });
    } catch {
      // Closing the share sheet is not an error worth showing; Copy link is right there.
    }
  }

  const pasos = [
    { titulo: t("guiaPasskey.paso1Titulo"), texto: t("guiaPasskey.paso1"), enlace: true },
    { titulo: t("guiaPasskey.paso2Titulo"), texto: t("guiaPasskey.paso2") },
    { titulo: t("guiaPasskey.paso3Titulo"), texto: t("guiaPasskey.paso3") },
    {
      titulo: t("guiaPasskey.paso4Titulo"),
      texto:
        variante === "cuenta"
          ? t("guiaPasskey.paso4Cuenta")
          : alReintentar
            ? t("guiaPasskey.paso4")
            : t("guiaPasskey.paso4SinBoton"),
    },
  ];

  return (
    <section className={`hyto-guia ${className ?? ""}`.trim()} aria-labelledby={`${id}-titulo`} data-guia={variante}>
      <p id={`${id}-titulo`} className="hyto-guia-titulo">
        {t("guiaPasskey.titulo")}
      </p>
      <p className="hyto-guia-intro">
        <TextoRico mensaje={variante === "cuenta" ? t("guiaPasskey.introCuenta") : t("guiaPasskey.intro")} />
      </p>
      <ol className="hyto-guia-pasos">
        {pasos.map((paso, indice) => (
          <li key={paso.titulo} className="hyto-guia-paso">
            <span className="hyto-guia-num" aria-hidden="true">
              {indice + 1}
            </span>
            <div className="min-w-0">
              <p className="hyto-guia-paso-titulo">{paso.titulo}</p>
              <p className="hyto-guia-paso-texto">
                <TextoRico mensaje={paso.texto} />
              </p>
              {paso.enlace ? (
                <>
                  {/* Plain text on purpose: the link is for the other computer, not this phone. */}
                  <p className="hyto-guia-enlace" translate="no">
                    {visible}
                  </p>
                  <div className="hyto-guia-acciones">
                    <button type="button" className="hyto-btn-line is-inline px-4" disabled={!enlace} onClick={() => void copiar()}>
                      {t("guiaPasskey.copiar")}
                    </button>
                    {puedeCompartir ? (
                      <button type="button" className="hyto-btn-line is-inline px-4" disabled={!enlace} onClick={() => void compartir()}>
                        {t("guiaPasskey.compartir")}
                      </button>
                    ) : null}
                  </div>
                  <p className="hyto-guia-copia" role="status" aria-live="polite">
                    {copia === "copiado" ? t("guiaPasskey.copiado") : copia === "fallo" ? t("guiaPasskey.copiaFallo") : null}
                  </p>
                </>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
      {alReintentar ? (
        <button
          type="button"
          className="hyto-btn mt-4 max-w-sm"
          disabled={reintentando}
          aria-busy={reintentando}
          onClick={alReintentar}
        >
          {reintentando ? t("guiaPasskey.reintentando") : t("comunes.tryAgain")}
        </button>
      ) : null}
      <details className="hyto-guia-ayuda">
        <summary>{t("guiaPasskey.ayudaTitulo")}</summary>
        <p>{t("guiaPasskey.ayuda1")}</p>
        <p>
          <TextoRico mensaje={t("guiaPasskey.ayuda2")} />
        </p>
      </details>
    </section>
  );
}
