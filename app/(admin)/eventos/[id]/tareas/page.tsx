import { tituloDe } from "@/lib/ui/titulo";
import { CabeceraEvento } from "@/components/admin/CabeceraEvento";
import { TareasEvento } from "@/components/admin/TareasEvento";
import { avisoBloqueo } from "@/lib/api/editar-tarea";
import { almacenNeon } from "@/lib/db/neon";
import { personaVisible } from "@/lib/perfil/vista";
import { exigirOrganizadorEvento, exigirPagina } from "@/lib/sesion/puerta";
import { notFound } from "next/navigation";

export const generateMetadata = tituloDe("titulos.tasks");

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
    .map((miembro) => personaVisible(usuarios.find((usuario) => usuario.id === miembro.usuarioId), miembro.usuarioId));
  const tareas = await Promise.all(
    (await almacen.listarTareas())
      .filter((fila) => fila.proyectoId === id)
      .map(async (tarea) => {
        const evidencia = await almacen.ultimaEvidencia(tarea.id);
        const tieneFoto = Boolean(evidencia);
        return {
          id: tarea.id,
          titulo: tarea.titulo,
          tipo: tarea.tipo,
          monto: tarea.monto,
          tope: tarea.tope,
          condicion: tarea.condicion,
          estado: tarea.estado,
          miembroId: tarea.miembroId,
          prioridad: tarea.prioridad,
          dificultad: tarea.dificultad,
          bloqueo: avisoBloqueo(tarea, tieneFoto),
          tieneFoto,
        };
      }),
  );
  return (
    <>
      <CabeceraEvento id={proyecto.id} nombre={proyecto.nombre} rol="organizer" pestana="tasks" />
      <TareasEvento tareas={tareas} miembros={miembros} />
    </>
  );
}
