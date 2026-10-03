import type { Metadata } from "next";
import { MisTareas } from "@/components/integrante/MisTareas";
import { exigirPagina } from "@/lib/sesion/puerta";

export const metadata: Metadata = { title: "Tasks" };

export default async function PaginaMisTareas() {
  await exigirPagina();
  return <MisTareas />;
}
