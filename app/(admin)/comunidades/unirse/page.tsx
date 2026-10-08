import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { UnirseCodigo } from "@/components/comunidades/Pantallas";
import { comunidadesActivas } from "@/lib/comunidades/bandera";
import { exigirPagina } from "@/lib/sesion/puerta";

export const metadata: Metadata = { title: "Join a community" };

export default async function PaginaUnirseComunidad() {
  if (!comunidadesActivas()) notFound();
  await exigirPagina("/comunidades/unirse");
  return <UnirseCodigo />;
}
