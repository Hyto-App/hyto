import { AceptarInvitacion } from "@/components/eventos/AceptarInvitacion";

export default async function PaginaInvitacion({ params }: { params: Promise<{ secreto: string }> }) {
  const { secreto } = await params;
  return <AceptarInvitacion secreto={secreto} />;
}