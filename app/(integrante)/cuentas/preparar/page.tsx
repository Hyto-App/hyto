import { tituloDe } from "@/lib/ui/titulo";
import { CuentasDemo } from "@/components/integrante/CuentasDemo";
import { exigirPagina } from "@/lib/sesion/puerta";

export const generateMetadata = tituloDe("titulos.setupUsdc");

export default async function PaginaPrepararCuentas() {
  await exigirPagina();
  return <CuentasDemo />;
}
