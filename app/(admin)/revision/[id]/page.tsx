import { Revision } from "@/components/admin/Revision";
import { exigirTarea } from "@/lib/sesion/puerta";

export default async function PaginaRevision({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await exigirTarea(id);
  return <Revision tareaId={id} />;
}
