import { Unirse } from "@/components/eventos/Unirse";

export default async function PaginaUnirse({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const params = await searchParams;
  return <Unirse codigoInicial={typeof params.code === "string" ? params.code : ""} />;
}
