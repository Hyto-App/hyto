import { tituloDe } from "@/lib/ui/titulo";
import { CabeceraEvento } from "@/components/admin/CabeceraEvento";
import { TareasEvento } from "@/components/admin/TareasEvento";
import { avisoBloqueo } from "@/lib/api/editar-tarea";
import { evidenciaVigente } from "@/lib/api/etapa";
import { rechazoPublico } from "@/lib/api/tareas";
import { almacenNeon } from "@/lib/db/neon";
import { esCuenta } from "@/lib/escrow/cuerpos";
import { montoDeTarea } from "@/lib/escrow/desplegar";
import { saldoCreacion } from "@/lib/escrow/saldo";
import { personaVisible } from "@/lib/perfil/vista";
import { perfilPublicoActivo } from "@/lib/perfil/bandera";
import { sugeridosDeEvento } from "@/lib/api/perfil-publico";
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
  const miembros = await Promise.all(
    (await almacen.listarMiembros(id))
      .filter((miembro) => miembro.estado === "active")
      .map(async (miembro) => ({
        ...personaVisible(usuarios.find((usuario) => usuario.id === miembro.usuarioId), miembro.usuarioId),
        cuentaCobro: esCuenta((await almacen.walletDeUsuario(miembro.usuarioId)) ?? ""),
      })),
  );
  const tareas = await Promise.all(
    (await almacen.listarTareas())
      .filter((fila) => fila.proyectoId === id)
      .map(async (tarea) => {
        const ultima = await almacen.ultimaEvidencia(tarea.id);
        const evidencia = evidenciaVigente(tarea, ultima, rechazoPublico(tarea) !== null);
        const tieneFoto = Boolean(evidencia);
        // Same payout-account rule as the lock itself (lib/api/firma.ts): the task's own G… or the assigned person's sign-in.
        const cuentaCobro =
          esCuenta(tarea.walletCobro) || (tarea.miembroId.trim() ? esCuenta((await almacen.walletDeUsuario(tarea.miembroId)) ?? "") : false);
        const montoLote = montoDeTarea(tarea, ultima);
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
          cuentaCobro,
          contrato: tarea.contratoEscrow?.trim() || null,
          montoLote: montoLote === null ? (tarea.tipo === "reembolso" ? null : tarea.monto) : String(montoLote),
          topeLote: tarea.tipo === "reembolso" ? (tarea.tope ?? tarea.monto) : tarea.monto,
        };
      }),
  );
  const sugeridos = perfilPublicoActivo() ? await sugeridosDeEvento(almacen, sesion.usuarioId, id) : undefined;
  return (
    <>
      <CabeceraEvento id={proyecto.id} nombre={proyecto.nombre} rol="organizer" pestana="tasks" sugeridos={sugeridos} />
      <TareasEvento tareas={tareas} miembros={miembros} saldo={await saldoP} wallet={sesion.wallet || null} proyectoId={sugeridos ? proyecto.id : undefined} sugeridos={sugeridos} />
    </>
  );
}
