import { Unirse } from "@/components/admin/Unirse";
import { exigirPagina } from "@/lib/sesion/puerta";

export default async function PaginaJoin() {
  await exigirPagina();
  return <Unirse />;
}
