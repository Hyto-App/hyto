import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ListaComunidades } from "@/components/comunidades/Pantallas";
import { comunidadesActivas } from "@/lib/comunidades/bandera";
import { exigirPagina } from "@/lib/sesion/puerta";

export const metadata: Metadata = { title: "Communities" };

export default async function PaginaComunidades() {
  if (!comunidadesActivas()) notFound();
  await exigirPagina("/comunidades");
  return <ListaComunidades />;
}
