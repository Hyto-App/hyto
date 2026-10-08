import type { Metadata } from "next";
import { Entrar } from "@/components/admin/Entrar";
import { demoHabilitado } from "@/lib/sesion/demo";
import { faltaTipoCuenta } from "@/lib/api/tipo-cuenta";
import { tipoCuentaActivo } from "@/lib/cuenta/bandera";
import { almacenNeon } from "@/lib/db/neon";
import { destinoInicio } from "@/lib/sesion/destino";
import { sesionEsDemo } from "@/lib/sesion/demo";
import { eventosOrganizados } from "@/lib/sesion/organiza";
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
  if (sesion) {
    const organiza = (await eventosOrganizados(sesion.usuarioId)).length > 0;
    const destino = destinoInicio(sesion, organiza);
    if (tipoCuentaActivo() && !sesionEsDemo(sesion)) {
      const almacen = await almacenNeon();
      if (almacen && (await faltaTipoCuenta(almacen, sesion.usuarioId))) redirect("/configuracion/tipo");
    }
    redirect(destino);
  }
  return <Entrar abrirLogin demoHabilitado={demoHabilitado()} />;
}
