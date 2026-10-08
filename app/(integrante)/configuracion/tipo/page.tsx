import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TipoCuenta } from "@/components/cuenta/TipoCuenta";
import { Texto } from "@/components/ui/Idioma";
import { tipoCuentaActivo } from "@/lib/cuenta/bandera";
import { exigirPagina } from "@/lib/sesion/puerta";

export const metadata: Metadata = { title: "Account type" };

export default async function PaginaTipoCuenta() {
  if (!tipoCuentaActivo()) notFound();
  await exigirPagina("/configuracion/tipo", { omitirTipo: true });
  return (
    <main className="hyto-page mx-auto max-w-3xl">
      <Texto as="h1" clave="tipoCuenta.titulo" className="hyto-title" />
      <TipoCuenta siguiente="/" />
    </main>
  );
}
