import { tituloDe } from "@/lib/ui/titulo";
import { Unirse } from "@/components/admin/Unirse";
import { exigirPagina } from "@/lib/sesion/puerta";

export const generateMetadata = tituloDe("titulos.joinEvent");

export default async function PaginaJoinSecreto({ params }: { params: Promise<{ secreto: string }> }) {
  const { secreto } = await params;
  await exigirPagina(`/join/${encodeURIComponent(secreto)}`);
  return <Unirse secretoInicial={decodeURIComponent(secreto)} />;
}
