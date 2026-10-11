import { tituloDe } from "@/lib/ui/titulo";
import { CrearProyecto } from "@/components/admin/CrearProyecto";
import { sugeridosParaNuevo } from "@/lib/api/perfil-publico";
import { almacenNeon } from "@/lib/db/neon";
import { saldoCreacion } from "@/lib/escrow/saldo";
import { perfilPublicoActivo } from "@/lib/perfil/bandera";
import type { Sugerido } from "@/lib/perfil/sugeridos";
import { sesionEsDemo } from "@/lib/sesion/demo";
import { exigirPagina } from "@/lib/sesion/puerta";

export const generateMetadata = tituloDe("titulos.newEvent");

async function sugeridosDe(usuarioId: string): Promise<Sugerido[]> {
  if (!perfilPublicoActivo()) return [];
  try {
    const almacen = await almacenNeon();
    return almacen ? await sugeridosParaNuevo(almacen, usuarioId) : [];
  } catch {
    return [];
  }
}

export default async function PaginaEventoNuevo() {
  const sesion = await exigirPagina();
  const [saldo, sugeridos] = await Promise.all([
    saldoCreacion(sesion.wallet),
    sesionEsDemo(sesion) ? Promise.resolve([]) : sugeridosDe(sesion.usuarioId),
  ]);
  return <CrearProyecto saldo={saldo} sugeridos={sugeridos} conFecha />;
}
