"use client";

import { Analytics } from "@vercel/analytics/next";
import { filtrarUrlAnalitica } from "@/lib/ui/analitica";

/** Cookieless page analytics. No consent banner. */
export function Analitica() {
  return (
    <Analytics
      beforeSend={(evento) => {
        const url = filtrarUrlAnalitica(evento.url);
        if (!url) return null;
        return { ...evento, url };
      }}
    />
  );
}
