import type { Metadata } from "next";
import { Revision } from "@/components/admin/Revision";
import { exigirOrganizadorDeTarea } from "@/lib/sesion/puerta";

export const metadata: Metadata = { title: "Review evidence" };

export default async function PaginaRevision({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tarea = await exigirOrganizadorDeTarea(id);
  return <Revision tareaId={id} eventoId={tarea.proyectoId} />;
}
