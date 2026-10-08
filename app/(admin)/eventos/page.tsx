import { tituloDe } from "@/lib/ui/titulo";
import { ListaEventos } from "@/components/admin/ListaEventos";
import { exigirPagina } from "@/lib/sesion/puerta";

export const generateMetadata = tituloDe("titulos.events");

export default async function PaginaEventos() {
  await exigirPagina();
  return <ListaEventos />;
}
