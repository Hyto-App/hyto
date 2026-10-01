import { ListaEventos } from "@/components/admin/ListaEventos";
import { exigirPagina } from "@/lib/sesion/puerta";

export default async function PaginaEventos() {
  await exigirPagina();
  return <ListaEventos />;
}
