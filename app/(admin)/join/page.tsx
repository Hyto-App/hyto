import type { Metadata } from "next";
import { Unirse } from "@/components/admin/Unirse";
import { exigirPagina } from "@/lib/sesion/puerta";

export const metadata: Metadata = { title: "Join an event" };

export default async function PaginaJoin() {
  await exigirPagina("/join");
  return <Unirse />;
}
