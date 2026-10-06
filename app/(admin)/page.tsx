import type { Metadata } from "next";
import { Entrar } from "@/components/admin/Entrar";
import { demoHabilitado } from "@/lib/sesion/demo";
import { leerSesionActual } from "@/lib/sesion/vista";
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

export default async function PaginaInicio() {
  const sesion = await leerSesionActual();
  if (sesion) redirect("/mis-tareas");
  return <Entrar abrirLogin demoHabilitado={demoHabilitado()} />;
}
