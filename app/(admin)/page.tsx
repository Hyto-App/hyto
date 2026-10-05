import type { Metadata } from "next";
import { Entrar } from "@/components/admin/Entrar";
import { demoHabilitado } from "@/lib/sesion/demo";
import { leerSesionActual } from "@/lib/sesion/vista";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: { absolute: "Hyto · Sign in" } };

export default async function PaginaInicio() {
  const sesion = await leerSesionActual();
  if (sesion) redirect("/mis-tareas");
  return <Entrar abrirLogin demoHabilitado={demoHabilitado()} />;
}
