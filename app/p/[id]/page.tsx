import type { Metadata } from "next";
import { cookies } from "next/headers";
import { NoDisponible, PerfilPublico } from "@/components/perfil/PerfilPublico";
import { leerVistaPerfil } from "@/lib/api/perfil-publico";
import { almacenNeon } from "@/lib/db/neon";
import { leerSesionActual } from "@/lib/sesion/vista";
import { texto } from "@/lib/ui/diccionario";
import { COOKIE_IDIOMA, idiomaDe } from "@/lib/ui/idioma";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const jar = await cookies();
  // No name in the title or the preview: phase 1 has no share card.
  return { title: texto(idiomaDe(jar.get(COOKIE_IDIOMA)?.value), "perfilPublico.tituloPagina"), robots: { index: false, follow: false } };
}

/** Public profile. A private profile, an unknown id and the switch off all look the same. */
export default async function PaginaPerfil({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const almacen = await almacenNeon();
  if (!almacen) return <NoDisponible />;
  const sesion = await leerSesionActual().catch(() => null);
  const resultado = await leerVistaPerfil(almacen, decodeURIComponent(id), sesion?.usuarioId ?? null);
  if (resultado.estado !== "ok") return <NoDisponible />;
  return <PerfilPublico vista={resultado.vista} />;
}
