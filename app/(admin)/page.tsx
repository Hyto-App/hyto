import type { Metadata } from "next";
import { Entrar } from "@/components/admin/Entrar";
import { demoHabilitado } from "@/lib/sesion/demo";
import { urlSignin } from "@/lib/sesion/retorno";
import { leerSesionConEstado } from "@/lib/sesion/vista";
import { discurso } from "@/lib/ui/discurso";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: { absolute: "Hyto · Sign in" },
  description: discurso.subheadline,
  openGraph: {
    description: discurso.subheadline,
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Hyto · Prove your worth. Get paid." }],
  },
  twitter: {
    card: "summary_large_image",
    description: discurso.subheadline,
    images: ["/twitter-image"],
  },
};

export default async function PaginaInicio({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { sesion, error } = await leerSesionConEstado();
  if (sesion) redirect("/mis-tareas");
  if (error) {
    const params = await searchParams;
    if (params.error !== error) redirect(urlSignin(typeof params.next === "string" ? params.next : null, error));
  }
  return <Entrar abrirLogin demoHabilitado={demoHabilitado()} />;
}
