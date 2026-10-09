import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { Entrar } from "@/components/admin/Entrar";
import { JsonLd } from "@/components/ui/JsonLd";
import { demoHabilitado } from "@/lib/sesion/demo";
import { faltaTipoCuenta } from "@/lib/api/tipo-cuenta";
import { tipoCuentaActivo } from "@/lib/cuenta/bandera";
import { almacenNeon } from "@/lib/db/neon";
import { destinoInicio } from "@/lib/sesion/destino";
import { sesionEsDemo } from "@/lib/sesion/demo";
import { eventosOrganizados } from "@/lib/sesion/organiza";
import { leerSesionActual } from "@/lib/sesion/vista";
import { texto } from "@/lib/ui/diccionario";
import { COOKIE_IDIOMA, idiomaDe, idiomaDeNavegador } from "@/lib/ui/idioma";
import {
  descripcionSeo,
  jsonLdFaqPage,
  jsonLdOrganization,
  jsonLdSoftwareApplication,
  metaPublica,
} from "@/lib/ui/seo";
import { redirect } from "next/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const jar = await cookies();
  const guardado = jar.get(COOKIE_IDIOMA)?.value;
  const idioma = guardado ? idiomaDe(guardado) : idiomaDeNavegador((await headers()).get("accept-language"));
  return metaPublica({
    idioma,
    title: texto(idioma, "entrar.tituloPestana"),
    description: descripcionSeo(idioma),
    path: "/",
    absoluteTitle: true,
  });
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
  const jar = await cookies();
  const guardado = jar.get(COOKIE_IDIOMA)?.value;
  const idioma = guardado ? idiomaDe(guardado) : idiomaDeNavegador((await headers()).get("accept-language"));
  return (
    <>
      <JsonLd datos={jsonLdOrganization()} />
      <JsonLd datos={jsonLdSoftwareApplication(idioma)} />
      <JsonLd datos={jsonLdFaqPage(idioma)} />
      <Entrar abrirLogin tituloDocumento demoHabilitado={demoHabilitado()} />
    </>
  );
}
