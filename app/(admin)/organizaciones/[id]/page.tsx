import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PaginaOrganizacion } from "@/components/organizaciones/Pantallas";
import { organizacionesActivas } from "@/lib/organizaciones/bandera";
import { exigirPagina } from "@/lib/sesion/puerta";

export const metadata: Metadata = { title: "Organization" };

export default async function PaginaDeOrganizacion({ params }: { params: Promise<{ id: string }> }) {
  if (!organizacionesActivas()) notFound();
  const { id } = await params;
  const sesion = await exigirPagina(`/organizaciones/${id}`);
  return <PaginaOrganizacion id={id} usuarioId={sesion.usuarioId} />;
}
