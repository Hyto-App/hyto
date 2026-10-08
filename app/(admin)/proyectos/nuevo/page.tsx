import { tituloDe } from "@/lib/ui/titulo";
import { redirect } from "next/navigation";

export const generateMetadata = tituloDe("titulos.newEvent");

export default function PaginaProyectoNuevo() {
  redirect("/eventos/nuevo");
}
