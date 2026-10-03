import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "New event" };

export default function PaginaProyectoNuevo() {
  redirect("/eventos/nuevo");
}
