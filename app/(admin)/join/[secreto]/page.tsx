import { Unirse } from "@/components/admin/Unirse";
import { exigirPagina } from "@/lib/sesion/puerta";

export default async function PaginaJoinSecreto({ params }: { params: Promise<{ secreto: string }> }) {
  const { secreto } = await params;
  await exigirPagina();
  return <Unirse secretoInicial={decodeURIComponent(secreto)} />;
}
