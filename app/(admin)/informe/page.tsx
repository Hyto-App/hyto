import type { Metadata } from "next";
import { proyectosVisibles } from "@/lib/api/alcance";
import { almacenNeon } from "@/lib/db/neon";
import { exigirPagina, visorDeSesion } from "@/lib/sesion/puerta";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Report" };

export default async function PaginaInforme() {
  const sesion = await exigirPagina();
  const almacen = await almacenNeon();
  if (!almacen) redirect("/eventos");
  const proyectos = await proyectosVisibles(almacen, visorDeSesion(sesion));
  const primero = proyectos[0];
  if (!primero) redirect("/eventos");
  redirect(`/eventos/${primero.id}/informe`);
}
