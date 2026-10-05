import type { Metadata } from "next";
import { Unirse } from "@/components/admin/Unirse";
import { exigirPagina } from "@/lib/sesion/puerta";

export const metadata: Metadata = { title: "Join an event" };

export default async function PaginaJoinSecreto({ params }: { params: Promise<{ secreto: string }> }) {
  const { secreto } = await params;
  await exigirPagina(`/join/${encodeURIComponent(secreto)}`);
  return <Unirse secretoInicial={decodeURIComponent(secreto)} />;
}
