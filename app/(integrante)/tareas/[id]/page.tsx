import { SubirEvidencia } from "@/components/integrante/SubirEvidencia";

export default async function PaginaEvidencia({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SubirEvidencia tareaId={id} />;
}
