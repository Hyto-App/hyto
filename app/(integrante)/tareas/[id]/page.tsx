import { SubirEvidencia } from "@/components/integrante/SubirEvidencia";
import { exigirTarea } from "@/lib/sesion/puerta";

export default async function PaginaEvidencia({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await exigirTarea(id);
  return <SubirEvidencia tareaId={id} />;
}
