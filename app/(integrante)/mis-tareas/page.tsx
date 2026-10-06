import type { Metadata } from "next";
import { MisTareas } from "@/components/integrante/MisTareas";
import { leerPerfil } from "@/lib/sesion/perfil";
import { exigirPagina } from "@/lib/sesion/puerta";

export const metadata: Metadata = { title: "Tasks" };

export default async function PaginaMisTareas() {
  const sesion = await exigirPagina();
  const perfil = await leerPerfil(sesion);
  return <MisTareas nombre={perfil.nombre} />;
}
