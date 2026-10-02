import { Landing } from "@/components/admin/Landing";
import { demoHabilitado } from "@/lib/sesion/demo";
import { leerSesionActual } from "@/lib/sesion/vista";
import { redirect } from "next/navigation";

export default async function PaginaInicio() {
  const sesion = await leerSesionActual();
  if (sesion) redirect("/eventos");
  return <Landing demoHabilitado={demoHabilitado()} />;
}
