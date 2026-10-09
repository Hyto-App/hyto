import { tituloDe } from "@/lib/ui/titulo";
import { Revision } from "@/components/admin/Revision";
import { saldoCreacion } from "@/lib/escrow/saldo";
import { exigirOrganizadorDeTarea, exigirPagina } from "@/lib/sesion/puerta";

export const generateMetadata = tituloDe("titulos.review");

export default async function PaginaRevision({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sesion = await exigirPagina();
  const saldoP = saldoCreacion(sesion.wallet);
  const tarea = await exigirOrganizadorDeTarea(id);
  const saldo = await saldoP;
  return <Revision tareaId={id} eventoId={tarea.proyectoId} saldo={saldo} />;
}
