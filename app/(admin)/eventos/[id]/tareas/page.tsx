import { tituloDe } from "@/lib/ui/titulo";
import { CabeceraEvento } from "@/components/admin/CabeceraEvento";
import { TareasEvento } from "@/components/admin/TareasEvento";
import { avisoBloqueo } from "@/lib/api/editar-tarea";
import { almacenNeon } from "@/lib/db/neon";
import { saldoCreacion } from "@/lib/escrow/saldo";
import { correoSegun, veCorreosDelEvento } from "@/lib/organizaciones/contactos";
import { personaVisible } from "@/lib/perfil/vista";
import { exigirOrganizadorEvento, exigirPagina } from "@/lib/sesion/puerta";
import { notFound } from "next/navigation";

export const generateMetadata = tituloDe("titulos.assign");

export default async function PaginaTareasEvento({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sesion = await exigirPagina();
  const saldoP = saldoCreacion(sesion.wallet);
  await exigirOrganizadorEvento(id);
  const almacen = await almacenNeon();
  const proyecto = almacen ? await almacen.leerProyecto(id) : null;
  if (!proyecto || !almacen) notFound();
  const usuarios = await almacen.listarUsuarios();
  const veCorreos = await veCorreosDelEvento(almacen, proyecto, sesion.usuarioId);
  const miembros = (await almacen.listarMiembros(id))
    .filter((miembro) => miembro.estado === "active")
    .map((miembro) => personaVisible(usuarios.find((usuario) => usuario.id === miembro.usuarioId), miembro.usuarioId))
    .map((persona) => ({ ...persona, email: persona.usuarioId === sesion.usuarioId ? persona.email : correoSegun(persona.email, veCorreos) }));
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
          montoConfirmado: evidencia?.montoConfirmado ?? null,
          montoRevisado: evidencia?.monto ?? null,
        };
      }),
  );
  return (
    <>
      <CabeceraEvento id={proyecto.id} nombre={proyecto.nombre} rol="organizer" pestana="tasks" enOrganizacion={Boolean(proyecto.organizacionId)} />
      <TareasEvento tareas={tareas} miembros={miembros} saldo={await saldoP} />
    </>
  );
}
