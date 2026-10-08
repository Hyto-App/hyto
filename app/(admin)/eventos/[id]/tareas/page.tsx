import { tituloDe } from "@/lib/ui/titulo";
import { CabeceraEvento } from "@/components/admin/CabeceraEvento";
import { TareasEvento } from "@/components/admin/TareasEvento";
import { avisoBloqueo } from "@/lib/api/editar-tarea";
import { sincronizarCobroParaReserva } from "@/lib/api/asignar";
import { escrowV2Activo } from "@/lib/escrow/bandera";
import { almacenNeon } from "@/lib/db/neon";
import { personaVisible } from "@/lib/perfil/vista";
import { exigirOrganizadorEvento, exigirPagina } from "@/lib/sesion/puerta";
import { notFound } from "next/navigation";

export const generateMetadata = tituloDe("titulos.assign");

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
  const filas = (await almacen.listarTareas()).filter((fila) => fila.proyectoId === id);
  if (escrowV2Activo()) await sincronizarCobroParaReserva(almacen, filas);
  const tareas = await Promise.all(
    filas.map(async (tarea) => {
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
          walletCobro: tarea.walletCobro,
          contratoEscrow: tarea.contratoEscrow,
        };
      }),
  );
  return (
    <>
      <CabeceraEvento id={proyecto.id} nombre={proyecto.nombre} rol="organizer" pestana="tasks" />
      <TareasEvento tareas={tareas} miembros={miembros} proteger={escrowV2Activo()} />
    </>
  );
}
