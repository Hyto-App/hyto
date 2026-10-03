import type { Metadata } from "next";
import { ListaEventos } from "@/components/admin/ListaEventos";
import { exigirPagina } from "@/lib/sesion/puerta";

export const metadata: Metadata = { title: "Events" };

export default async function PaginaEventos() {
  await exigirPagina();
  return <ListaEventos />;
}
