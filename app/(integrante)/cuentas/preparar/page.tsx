import { CuentasDemo } from "@/components/integrante/CuentasDemo";
import { exigirPagina } from "@/lib/sesion/puerta";

export default async function PaginaPrepararCuentas() {
  await exigirPagina();
  return <CuentasDemo />;
}
