import { Informe } from "@/components/admin/Informe";
import { exigirEvento } from "@/lib/sesion/puerta";

export default async function PaginaInformeEvento({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await exigirEvento(id);
  return <Informe proyectoId={id} />;
}
