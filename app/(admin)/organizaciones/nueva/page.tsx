import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FormularioOrganizacion } from "@/components/organizaciones/Pantallas";
import { organizacionesActivas } from "@/lib/organizaciones/bandera";
import { exigirPagina } from "@/lib/sesion/puerta";

export const metadata: Metadata = { title: "New organization" };

export default async function PaginaNuevaOrganizacion() {
  if (!organizacionesActivas()) notFound();
  await exigirPagina("/organizaciones/nueva");
  return <FormularioOrganizacion />;
}
