import { tituloDe } from "@/lib/ui/titulo";
import { Unirse } from "@/components/admin/Unirse";
import { exigirPagina } from "@/lib/sesion/puerta";

export const generateMetadata = tituloDe("titulos.joinEvent");

export default async function PaginaJoin() {
  await exigirPagina("/join");
  return <Unirse />;
}
