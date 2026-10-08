import { tituloDe } from "@/lib/ui/titulo";
import { MisTareas } from "@/components/integrante/MisTareas";
import { leerPerfil } from "@/lib/sesion/perfil";
import { exigirPagina } from "@/lib/sesion/puerta";

export const generateMetadata = tituloDe("titulos.tasks");

export default async function PaginaMisTareas() {
  const sesion = await exigirPagina();
  const perfil = await leerPerfil(sesion);
  return <MisTareas nombre={perfil.nombre} />;
}
