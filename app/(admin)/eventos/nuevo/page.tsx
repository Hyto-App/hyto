import type { Metadata } from "next";
import { CrearProyecto } from "@/components/admin/CrearProyecto";
import { exigirPagina } from "@/lib/sesion/puerta";

export const metadata: Metadata = { title: "New event" };

export default async function PaginaEventoNuevo() {
  await exigirPagina();
  return <CrearProyecto />;
}
