import { tituloDe } from "@/lib/ui/titulo";
import { CrearProyecto } from "@/components/admin/CrearProyecto";
import { exigirPagina } from "@/lib/sesion/puerta";

export const generateMetadata = tituloDe("titulos.newEvent");

export default async function PaginaEventoNuevo() {
  await exigirPagina();
  return <CrearProyecto />;
}
