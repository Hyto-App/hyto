import { Evento } from "@/components/admin/Evento";
import { almacenNeon } from "@/lib/db/neon";
import { exigirEvento } from "@/lib/sesion/puerta";
import { notFound } from "next/navigation";

export default async function PaginaEvento({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await exigirEvento(id);
  const almacen = await almacenNeon();
  const proyecto = almacen ? await almacen.leerProyecto(id) : null;
  if (!proyecto) notFound();
  return <Evento id={proyecto.id} nombre={proyecto.nombre} />;
}
