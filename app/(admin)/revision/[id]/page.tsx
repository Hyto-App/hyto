import { tituloDe } from "@/lib/ui/titulo";
import { Revision } from "@/components/admin/Revision";
import { escrowV2Activo } from "@/lib/escrow/bandera";
import { exigirOrganizadorDeTarea } from "@/lib/sesion/puerta";

export const generateMetadata = tituloDe("titulos.review");

export default async function PaginaRevision({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tarea = await exigirOrganizadorDeTarea(id);
  return <Revision tareaId={id} eventoId={tarea.proyectoId} proteger={escrowV2Activo()} />;
}
