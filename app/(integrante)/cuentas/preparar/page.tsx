import type { Metadata } from "next";
import { CuentasDemo } from "@/components/integrante/CuentasDemo";
import { exigirPagina } from "@/lib/sesion/puerta";

export const metadata: Metadata = { title: "Set up USDC" };

export default async function PaginaPrepararCuentas() {
  await exigirPagina();
  return <CuentasDemo />;
}
