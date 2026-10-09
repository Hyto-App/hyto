import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PaginaComunidad } from "@/components/comunidades/Pantallas";
import { comunidadesActivas } from "@/lib/comunidades/bandera";
import { exigirPagina } from "@/lib/sesion/puerta";
import { tablonActivo } from "@/lib/tablon/bandera";

export const metadata: Metadata = { title: "Community", robots: { index: false, follow: false } };

export default async function PaginaDeComunidad({ params }: { params: Promise<{ id: string }> }) {
  if (!comunidadesActivas()) notFound();
  const { id } = await params;
  await exigirPagina(`/comunidades/${id}`);
  return <PaginaComunidad id={id} mostrarTablon={tablonActivo()} />;
}
