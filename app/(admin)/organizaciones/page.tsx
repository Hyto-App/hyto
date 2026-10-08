import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ListaOrganizaciones } from "@/components/organizaciones/Pantallas";
import { organizacionesActivas } from "@/lib/organizaciones/bandera";
import { exigirPagina } from "@/lib/sesion/puerta";

export const metadata: Metadata = { title: "Organizations" };

export default async function PaginaOrganizaciones() {
  if (!organizacionesActivas()) notFound();
  await exigirPagina("/organizaciones");
  return <ListaOrganizaciones />;
}
