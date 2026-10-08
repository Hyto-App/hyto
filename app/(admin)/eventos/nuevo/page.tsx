import { tituloDe } from "@/lib/ui/titulo";
import { CrearProyecto } from "@/components/admin/CrearProyecto";
import { almacenNeon } from "@/lib/db/neon";
import { saldoCreacion } from "@/lib/escrow/saldo";
import { organizacionesActivas } from "@/lib/organizaciones/bandera";
import { exigirPagina } from "@/lib/sesion/puerta";

export const generateMetadata = tituloDe("titulos.newEvent");

async function organizacionesDelCreador(usuarioId: string): Promise<{ id: string; nombre: string }[]> {
  // With the flag off this makes no query, so the page reads exactly what it reads today.
  if (!organizacionesActivas()) return [];
  const almacen = await almacenNeon();
  if (!almacen) return [];
  const lista: { id: string; nombre: string }[] = [];
  for (const admin of await almacen.adminsDeUsuario(usuarioId)) {
    const organizacion = await almacen.leerOrganizacion(admin.organizacionId);
    if (organizacion) lista.push({ id: organizacion.id, nombre: organizacion.nombre });
  }
  return lista.sort((a, b) => a.nombre.localeCompare(b.nombre));
}

export default async function PaginaEventoNuevo() {
  const sesion = await exigirPagina();
  const saldo = await saldoCreacion(sesion.wallet);
  return <CrearProyecto saldo={saldo} organizaciones={await organizacionesDelCreador(sesion.usuarioId)} />;
}
