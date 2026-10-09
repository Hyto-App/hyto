import { tituloDe } from "@/lib/ui/titulo";
import { CrearProyecto } from "@/components/admin/CrearProyecto";
import { saldoCreacion } from "@/lib/escrow/saldo";
import { exigirPagina } from "@/lib/sesion/puerta";

export const generateMetadata = tituloDe("titulos.newEvent");

export default async function PaginaEventoNuevo() {
  const sesion = await exigirPagina();
  const saldo = await saldoCreacion(sesion.wallet);
  return <CrearProyecto saldo={saldo} />;
}
