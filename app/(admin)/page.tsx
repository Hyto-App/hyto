import type { Metadata } from "next";
import { Landing } from "@/components/admin/Landing";
import { discurso } from "@/lib/ui/discurso";
import { demoHabilitado } from "@/lib/sesion/demo";
import { leerSesionActual } from "@/lib/sesion/vista";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: { absolute: "Hyto · Prove your worth. Get paid." },
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
  if (sesion) redirect("/eventos");
  return <Landing demoHabilitado={demoHabilitado()} />;
}
