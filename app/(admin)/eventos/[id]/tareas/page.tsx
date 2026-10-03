import type { Metadata } from "next";
import { CabeceraEvento } from "@/components/admin/CabeceraEvento";
import { TareasEvento } from "@/components/admin/TareasEvento";
import { almacenNeon } from "@/lib/db/neon";
import { exigirOrganizadorEvento, exigirPagina } from "@/lib/sesion/puerta";
import { notFound } from "next/navigation";

export const metadata: Metadata = { title: "Assign tasks" };

export default async function PaginaTareasEvento({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await exigirPagina();
  await exigirOrganizadorEvento(id);
  const almacen = await almacenNeon();
  const proyecto = almacen ? await almacen.leerProyecto(id) : null;
  if (!proyecto || !almacen) notFound();
  const usuarios = await almacen.listarUsuarios();
  const miembros = (await almacen.listarMiembros(id))
    .filter((miembro) => miembro.estado === "active")
    .map((miembro) => ({
      usuarioId: miembro.usuarioId,
      email: usuarios.find((usuario) => usuario.id === miembro.usuarioId)?.email ?? miembro.usuarioId,
    }));
  const tareas = (await almacen.listarTareas())
    .filter((tarea) => tarea.proyectoId === id)
    .map((tarea) => ({
      id: tarea.id,
      titulo: tarea.titulo,
      tipo: tarea.tipo,
      monto: tarea.monto,
      tope: tarea.tope,
      estado: tarea.estado,
      miembroId: tarea.miembroId,
      prioridad: tarea.prioridad,
      dificultad: tarea.dificultad,
    }));
  return (
    <>
      <CabeceraEvento id={proyecto.id} nombre={proyecto.nombre} rol="organizer" pestana="tasks" />
      <TareasEvento tareas={tareas} miembros={miembros} />
    </>
  );
}
