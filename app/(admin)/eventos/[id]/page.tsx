import type { Metadata } from "next";
import { Bandeja } from "@/components/admin/Bandeja";
import { CabeceraEvento } from "@/components/admin/CabeceraEvento";
import { TareasMiembro } from "@/components/admin/TareasMiembro";
import { tareasVisibles } from "@/lib/api/alcance";
import { almacenNeon } from "@/lib/db/neon";
import { exigirEvento, exigirPagina, visorDeSesion } from "@/lib/sesion/puerta";
import { notFound } from "next/navigation";

export const metadata: Metadata = { title: "Event" };

export default async function PaginaEvento({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sesion = await exigirPagina();
  await exigirEvento(id);
  const almacen = await almacenNeon();
  const proyecto = almacen ? await almacen.leerProyecto(id) : null;
  if (!proyecto || !almacen) notFound();
  const miembros = await almacen.listarMiembros(id);
  const propio = miembros.find((miembro) => miembro.usuarioId === sesion.usuarioId && miembro.estado === "active");
  const rol = propio?.rol ?? "volunteer";
  if (rol === "organizer") {
    const usuarios = await almacen.listarUsuarios();
    const personas = miembros
      .filter((miembro) => miembro.estado === "active")
      .map((miembro) => ({
        usuarioId: miembro.usuarioId,
        email: usuarios.find((usuario) => usuario.id === miembro.usuarioId)?.email ?? miembro.usuarioId,
      }));
    return (
      <>
        <CabeceraEvento id={proyecto.id} nombre={proyecto.nombre} rol="organizer" pestana="inbox" />
        <Bandeja proyectoId={proyecto.id} miembros={personas} />
      </>
    );
  }
  const tareas = (await tareasVisibles(almacen, visorDeSesion(sesion))).filter((tarea) => tarea.proyectoId === id);
  return (
    <>
      <CabeceraEvento id={proyecto.id} nombre={proyecto.nombre} rol={rol} pestana="inbox" />
      <TareasMiembro
        tareas={tareas.map((tarea) => ({
          id: tarea.id,
          titulo: tarea.titulo,
          estado: tarea.estado,
          tipo: tarea.tipo,
          monto: tarea.monto,
          tope: tarea.tope,
        }))}
      />
    </>
  );
}
