import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FormularioComunidad } from "@/components/comunidades/Pantallas";
import { comunidadesActivas } from "@/lib/comunidades/bandera";
import { exigirPagina } from "@/lib/sesion/puerta";

export const metadata: Metadata = { title: "New community", robots: { index: false, follow: false } };

export default async function PaginaNuevaComunidad() {
  if (!comunidadesActivas()) notFound();
  await exigirPagina("/comunidades/nueva");
  return <FormularioComunidad />;
}
