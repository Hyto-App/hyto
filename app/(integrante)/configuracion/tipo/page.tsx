import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TipoCuenta } from "@/components/cuenta/TipoCuenta";
import { Texto } from "@/components/ui/Idioma";
import { tipoCuentaActivo } from "@/lib/cuenta/bandera";
import { exigirPagina } from "@/lib/sesion/puerta";
import { destinoTrasTipo } from "@/lib/sesion/retorno";

export const metadata: Metadata = { title: "Account type", robots: { index: false, follow: false } };

export default async function PaginaTipoCuenta({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!tipoCuentaActivo()) notFound();
  await exigirPagina("/configuracion/tipo", { omitirTipo: true });
  const crudo = (await searchParams).next;
  const pedido = Array.isArray(crudo) ? crudo[0] : crudo;
  return (
    <main className="hyto-page mx-auto max-w-3xl">
      <Texto as="h1" clave="tipoCuenta.titulo" className="hyto-title" />
      <TipoCuenta siguiente={destinoTrasTipo(pedido)} />
    </main>
  );
}
