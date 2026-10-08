import { PantallaRecibo } from "@/components/integrante/evidencia/PantallaRecibo";
import { exigirTarea } from "@/lib/sesion/puerta";
import { tituloDe } from "@/lib/ui/titulo";

export const generateMetadata = tituloDe("titulos.receipt");

export default async function PaginaRecibo({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await exigirTarea(id);
  return <PantallaRecibo tareaId={id} />;
}
