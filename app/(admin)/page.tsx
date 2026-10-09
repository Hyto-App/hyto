import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { Landing } from "@/components/admin/Landing";
import { demoHabilitado } from "@/lib/sesion/demo";
import { faltaTipoCuenta } from "@/lib/api/tipo-cuenta";
import { tipoCuentaActivo } from "@/lib/cuenta/bandera";
import { almacenNeon } from "@/lib/db/neon";
import { destinoInicio } from "@/lib/sesion/destino";
import { sesionEsDemo } from "@/lib/sesion/demo";
import { eventosOrganizados } from "@/lib/sesion/organiza";
import { leerSesionActual } from "@/lib/sesion/vista";
import { ESLOGAN } from "@/components/ui/marca/trazos";
import { DESCRIPCION_PAGINA } from "@/lib/ui/discurso";
import { texto } from "@/lib/ui/diccionario";
import { COOKIE_IDIOMA, idiomaDe, idiomaDeNavegador } from "@/lib/ui/idioma";
import { redirect } from "next/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const jar = await cookies();
  const guardado = jar.get(COOKIE_IDIOMA)?.value;
  const idioma = guardado ? idiomaDe(guardado) : idiomaDeNavegador((await headers()).get("accept-language"));
  const marca = `Hyto · ${ESLOGAN}`;
  return {
    title: { absolute: texto(idioma, "entrar.tituloPestana") },
    description: DESCRIPCION_PAGINA,
    openGraph: {
      title: marca,
      description: DESCRIPCION_PAGINA,
      images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: marca }],
    },
    twitter: {
      card: "summary_large_image",
      title: marca,
      description: DESCRIPCION_PAGINA,
      images: ["/twitter-image"],
    },
  };
}

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
  return <Landing demoHabilitado={demoHabilitado()} />;
}
