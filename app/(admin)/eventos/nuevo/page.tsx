import { CrearProyecto } from "@/components/admin/CrearProyecto";
import { exigirPagina } from "@/lib/sesion/puerta";

export default async function PaginaEventoNuevo() {
  await exigirPagina();
  return <CrearProyecto />;
}
