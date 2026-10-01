import { motivoInvitacion } from "@/lib/invitaciones/secreto";
import type { Almacen } from "./almacen";
import type {
  EvidenciaFila,
  InvitacionFila,
  MiembroProyecto,
  Proyecto,
  SesionFila,
  TareaFila,
  Usuario,
  VeredictoFila,
} from "./tipos";

export function crearMemoria(): Almacen {
  const usuarios = new Map<string, Usuario>();
  const proyectos = new Map<string, Proyecto>();
  const tareas = new Map<string, TareaFila>();
  const evidencias = new Map<string, EvidenciaFila>();
  const veredictos = new Map<string, VeredictoFila>();
  const sesiones = new Map<string, SesionFila>();
  const miembros = new Map<string, MiembroProyecto>();
  const invitaciones = new Map<string, InvitacionFila>();

  function claveMiembro(proyectoId: string, usuarioId: string): string {
    return `${proyectoId}\0${usuarioId}`;
  }

  return {
    async listarUsuarios() {
      return [...usuarios.values()];
    },
    async usuarioPorEmail(email) {
      const buscado = email.trim().toLowerCase();
      return [...usuarios.values()].find((usuario) => usuario.email === buscado) ?? null;
    },
    async insertarUsuario(usuario) {
      const email = usuario.email.trim().toLowerCase();
      if ([...usuarios.values()].some((actual) => actual.email.trim().toLowerCase() === email)) return;
      usuarios.set(usuario.id, { ...usuario, email });
    },
    async guardarUsuario(usuario) {
      const email = usuario.email.trim().toLowerCase();
      const guardado = { ...usuario, email };
      for (const actual of usuarios.values()) {
        if (actual.email === email && actual.id !== usuario.id) usuarios.delete(actual.id);
      }
      usuarios.set(usuario.id, guardado);
    },
    async leerProyecto(id) {
      return proyectos.get(id) ?? null;
    },
    async listarProyectos() {
      return [...proyectos.values()];
    },
    async ultimoProyecto() {
      return [...proyectos.values()].sort((a, b) => (a.creadoEn < b.creadoEn ? 1 : -1))[0] ?? null;
    },
    async crearProyecto(proyecto, filas) {
      proyectos.set(proyecto.id, proyecto);
      for (const tarea of filas) tareas.set(tarea.id, tarea);
      if (proyecto.organizadorId) {
        miembros.set(claveMiembro(proyecto.id, proyecto.organizadorId), {
          proyectoId: proyecto.id,
          usuarioId: proyecto.organizadorId,
          rol: "organizer",
          estado: "active",
          creadoEn: proyecto.creadoEn,
        });
      }
    },
    async asignarOrganizador(proyectoId, organizadorId) {
      const actual = proyectos.get(proyectoId);
      if (!actual) return;
      proyectos.set(proyectoId, { ...actual, organizadorId });
      const previa = miembros.get(claveMiembro(proyectoId, organizadorId));
      miembros.set(claveMiembro(proyectoId, organizadorId), {
        proyectoId,
        usuarioId: organizadorId,
        rol: "organizer",
        estado: "active",
        creadoEn: previa?.creadoEn ?? new Date().toISOString(),
      });
    },
    async listarTareas() {
      return [...tareas.values()];
    },
    async leerTarea(id) {
      return tareas.get(id) ?? null;
    },
    async actualizarTarea(id, cambio) {
      const actual = tareas.get(id);
      if (!actual) return;
      tareas.set(id, { ...actual, ...cambio });
    },
    async crearEvidencia(evidencia) {
      if (evidencias.has(evidencia.id)) return;
      evidencias.set(evidencia.id, evidencia);
    },
    async leerEvidencia(id) {
      return evidencias.get(id) ?? null;
    },
    async actualizarEvidencia(id, cambio) {
      const actual = evidencias.get(id);
      if (!actual) return;
      evidencias.set(id, { ...actual, ...cambio });
    },
    async ultimaEvidencia(tareaId) {
      return [...evidencias.values()]
        .filter((evidencia) => evidencia.tareaId === tareaId)
        .sort((a, b) => (a.creadaEn < b.creadaEn ? 1 : -1))[0] ?? null;
    },
    async guardarVeredicto(veredicto) {
      veredictos.set(veredicto.evidenciaId, veredicto);
    },
    async veredictoDe(evidenciaId) {
      return veredictos.get(evidenciaId) ?? null;
    },
    async crearSesion(sesion) {
      sesiones.set(sesion.token, sesion);
    },
    async leerSesion(token) {
      return sesiones.get(token) ?? null;
    },
    async borrarSesion(token) {
      sesiones.delete(token);
    },
    async guardarWallet(token, wallet) {
      const actual = sesiones.get(token);
      if (!actual) return;
      sesiones.set(token, { ...actual, wallet });
    },
    async listarMiembrosDe(usuarioId) {
      return [...miembros.values()].filter((miembro) => miembro.usuarioId === usuarioId);
    },
    async listarMiembros(proyectoId) {
      return [...miembros.values()].filter((miembro) => miembro.proyectoId === proyectoId);
    },
    async guardarMiembro(miembro) {
      const previa = miembros.get(claveMiembro(miembro.proyectoId, miembro.usuarioId));
      if (previa?.rol === "organizer" && miembro.rol !== "organizer") {
        miembros.set(claveMiembro(miembro.proyectoId, miembro.usuarioId), { ...previa, estado: "active" });
        return;
      }
      miembros.set(claveMiembro(miembro.proyectoId, miembro.usuarioId), miembro);
    },
    async crearInvitacion(invitacion) {
      invitaciones.set(invitacion.secretoHash, invitacion);
    },
    async invitacionPorHash(hash) {
      return invitaciones.get(hash) ?? null;
    },
    async aceptarInvitacion({ hash, usuarioId, email, ahora }) {
      const invitacion = invitaciones.get(hash) ?? null;
      const motivo = motivoInvitacion(invitacion, email, ahora);
      if (motivo || !invitacion) return { ok: false, motivo: motivo ?? "missing" };
      invitacion.usos += 1;
      invitaciones.set(hash, invitacion);
      const previa = miembros.get(claveMiembro(invitacion.proyectoId, usuarioId));
      if (previa?.rol === "organizer") {
        miembros.set(claveMiembro(invitacion.proyectoId, usuarioId), { ...previa, estado: "active" });
      } else {
        miembros.set(claveMiembro(invitacion.proyectoId, usuarioId), {
          proyectoId: invitacion.proyectoId,
          usuarioId,
          rol: invitacion.rol,
          estado: "active",
          creadoEn: ahora,
        });
      }
      return { ok: true, proyectoId: invitacion.proyectoId, rol: invitacion.rol };
    },
  };
}
