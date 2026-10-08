import type { Metadata } from "next";
import { Bandeja } from "@/components/admin/Bandeja";
import { CabeceraEvento } from "@/components/admin/CabeceraEvento";
import { TareasMiembro } from "@/components/admin/TareasMiembro";
import { ContextoEvento } from "@/components/integrante/ContextoEvento";
import { tareasVisibles } from "@/lib/api/alcance";
import { datosPublicosDeEvento } from "@/lib/api/contexto-evento";
import { almacenNeon } from "@/lib/db/neon";
import { personaVisible } from "@/lib/perfil/vista";
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
  if (!propio) notFound();
  const rol = propio.rol;
  if (rol === "organizer") {
    const usuarios = await almacen.listarUsuarios();
    const personas = miembros
      .filter((miembro) => miembro.estado === "active")
      .map((miembro) => personaVisible(usuarios.find((usuario) => usuario.id === miembro.usuarioId), miembro.usuarioId));
    const publicoOrganizador = datosPublicosDeEvento(proyecto);
    return (
      <>
        <CabeceraEvento id={proyecto.id} nombre={proyecto.nombre} rol="organizer" pestana="inbox" />
        <div className="hyto-page pb-0 pt-0">
          <ContextoEvento
            proyectoId={proyecto.id}
            nombre={proyecto.nombre}
            descripcion={publicoOrganizador.descripcion}
            portada={publicoOrganizador.portada}
          />
        </div>
        <Bandeja proyectoId={proyecto.id} miembros={personas} />
      </>
    );
  }
  const tareas = (await tareasVisibles(almacen, visorDeSesion(sesion))).filter((tarea) => tarea.proyectoId === id);
  const publico = datosPublicosDeEvento(proyecto);
  return (
    <>
      <CabeceraEvento id={proyecto.id} nombre={proyecto.nombre} rol={rol} pestana="inbox" />
      <div className="hyto-page pb-0 pt-0">
        <ContextoEvento proyectoId={proyecto.id} nombre={proyecto.nombre} descripcion={publico.descripcion} portada={publico.portada} />
      </div>
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
