import { Revision } from "@/components/admin/Revision";

export default async function PaginaRevision({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Revision tareaId={id} />;
}
