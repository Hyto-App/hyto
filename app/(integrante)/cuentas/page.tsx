import type { Metadata } from "next";
import { RedirigirConfiguracion } from "@/components/integrante/RedirigirConfiguracion";
import { exigirPagina } from "@/lib/sesion/puerta";

export const metadata: Metadata = { title: "Settings" };

/** Old account URL. The query and the hash move with the browser to Settings. */
export default async function PaginaCuentas() {
  await exigirPagina();
  return <RedirigirConfiguracion />;
}
