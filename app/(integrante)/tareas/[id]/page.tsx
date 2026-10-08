import { tituloDe } from "@/lib/ui/titulo";
import { SubirEvidencia } from "@/components/integrante/SubirEvidencia";
import { leerPerfil } from "@/lib/sesion/perfil";
import { exigirPagina, exigirTarea } from "@/lib/sesion/puerta";

export const generateMetadata = tituloDe("titulos.task");

export default async function PaginaEvidencia({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await exigirTarea(id);
  const perfil = await leerPerfil(await exigirPagina());
  return <SubirEvidencia tareaId={id} nombre={perfil.nombre} />;
}
