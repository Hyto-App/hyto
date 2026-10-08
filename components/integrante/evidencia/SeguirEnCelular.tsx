"use client";

import { useEffect, useState } from "react";
import { useTexto } from "@/components/ui/Idioma";
import { enlaceDeEstaTarea } from "@/lib/integrante/sinCamara";
import { renderSVG } from "uqr";

/** SVG from the encoder only. The task URL is not written into the markup as HTML. */
export function svgDeEnlace(enlace: string): string | null {
  const svg = renderSVG(enlace, {
    ecc: "M",
    border: 2,
    pixelSize: 6,
    blackColor: "#08090C",
    whiteColor: "#ffffff",
  });
  if (!svg.startsWith("<svg") || svg.includes("<script")) return null;
  return svg;
}

/** Desktop without a camera: the photo is still taken now, on the phone, for this same task. */
export function SeguirEnCelular({ tareaId }: { tareaId: string }) {
  const t = useTexto();
  const [enlace, setEnlace] = useState("");
  const [svg, setSvg] = useState<string | null>(null);

  useEffect(() => {
    const siguiente = enlaceDeEstaTarea(window.location.origin, tareaId);
    setEnlace(siguiente);
    setSvg(svgDeEnlace(siguiente));
  }, [tareaId]);

  return (
    <section className="hyto-sin-camara" aria-labelledby="hyto-sin-camara-titulo">
      <h2 id="hyto-sin-camara-titulo">{t("evidencia.noCameraLead")}</h2>
      <p>{t("evidencia.noCameraBody")}</p>
      {svg ? (
        <div className="hyto-qr" role="img" aria-label={t("evidencia.noCameraQr")} dangerouslySetInnerHTML={{ __html: svg }} />
      ) : null}
      {enlace ? (
        <>
          <a href={enlace}>{t("evidencia.noCameraLink")}</a>
          <p className="hyto-sin-camara-url">{enlace}</p>
        </>
      ) : null}
    </section>
  );
}
