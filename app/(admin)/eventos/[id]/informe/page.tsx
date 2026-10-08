import { tituloDe } from "@/lib/ui/titulo";
import { CabeceraEvento } from "@/components/admin/CabeceraEvento";
import { Informe } from "@/components/admin/Informe";
import { almacenNeon } from "@/lib/db/neon";
import { exigirOrganizadorEvento } from "@/lib/sesion/puerta";
import { notFound } from "next/navigation";

export const generateMetadata = tituloDe("titulos.report");

export default async function PaginaInformeEvento({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await exigirOrganizadorEvento(id);
  const almacen = await almacenNeon();
  const proyecto = almacen ? await almacen.leerProyecto(id) : null;
  if (!proyecto) notFound();
  return (
    <>
      <CabeceraEvento id={proyecto.id} nombre={proyecto.nombre} rol="organizer" pestana="report" />
      <Informe proyectoId={id} />
    </>
  );
}
