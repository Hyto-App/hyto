import { MisTareas } from "@/components/integrante/MisTareas";
import { exigirPagina } from "@/lib/sesion/puerta";

export default async function PaginaMisTareas() {
  await exigirPagina();
  return <MisTareas />;
}
