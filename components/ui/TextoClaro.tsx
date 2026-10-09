"use client";

import Link from "next/link";
import { useClaro, useTexto } from "@/components/ui/Idioma";
import { trozosDeMensaje } from "@/lib/ui/enlacesMensaje";

export const RUTA_PREPARAR_COBRO = "/configuracion#preparar-cobro";
export const RUTA_AYUDA = "/ayuda";

/** Renders a dictionary sentence that may point at Settings or Help. */
export function TextoRico({ mensaje }: { mensaje: string }) {
  const t = useTexto();
  const trozos = trozosDeMensaje(mensaje);
  return (
    <>
      {trozos.map((trozo, indice) => {
        if (trozo.tipo === "texto") return <span key={indice}>{trozo.valor}</span>;
        if (trozo.tipo === "configuracion") {
          return (
            <Link key={indice} href={RUTA_PREPARAR_COBRO} className="underline underline-offset-4">
              {t("nav.settings")}
            </Link>
          );
        }
        return (
          <Link key={indice} href={RUTA_AYUDA} className="underline underline-offset-4">
            {t("errores.escribanos")}
          </Link>
        );
      })}
    </>
  );
}

/** Same as `useClaro`, with the Settings and Help marks turned into links. */
export function TextoClaro({ mensaje }: { mensaje: string }) {
  const claro = useClaro();
  return <TextoRico mensaje={claro(mensaje)} />;
}
