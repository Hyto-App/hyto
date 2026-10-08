import { redirect } from "next/navigation";
import { tituloDe } from "@/lib/ui/titulo";
import { SubirEvidencia } from "@/components/integrante/SubirEvidencia";
import { rutaDeTarea } from "@/lib/sesion/destino";
import { leerPerfil } from "@/lib/sesion/perfil";
import { exigirPagina, exigirTarea } from "@/lib/sesion/puerta";

export const generateMetadata = tituloDe("titulos.task");

export default async function PaginaEvidencia({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tarea = await exigirTarea(id);
  const sesion = await exigirPagina();
  const ruta = rutaDeTarea(tarea.id, tarea.miembroId, sesion.usuarioId);
  if (!ruta.startsWith("/tareas/")) redirect(ruta);
  const perfil = await leerPerfil(sesion);
  return <SubirEvidencia tareaId={id} nombre={perfil.nombre} />;
}
