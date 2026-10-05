import { distanciaHamming } from "@/lib/evidencia/huella";
import { walletDeSesiones } from "@/lib/sesion/cobro";
import type { Almacen } from "./almacen";
import type {
  EvidenciaFila,
  Proyecto,
  ProyectoInvitacion,
  ProyectoMiembro,
  RolEvento,
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
  const miembros = new Map<string, ProyectoMiembro>();
  const invitaciones = new Map<string, ProyectoInvitacion>();

  function claveMiembro(proyectoId: string, usuarioId: string): string {
    return `${proyectoId}:${usuarioId}`;
  }

  function ponerMiembro(miembro: ProyectoMiembro): void {
    const previo = miembros.get(claveMiembro(miembro.proyectoId, miembro.usuarioId));
    const rol: RolEvento = previo?.rol === "organizer" ? "organizer" : miembro.rol;
    miembros.set(claveMiembro(miembro.proyectoId, miembro.usuarioId), {
      ...miembro,
      rol,
      estado: "active",
      creadoEn: previo?.creadoEn ?? miembro.creadoEn,
    });
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
        ponerMiembro({
          proyectoId: proyecto.id,
          usuarioId: proyecto.organizadorId,
          rol: "organizer",
          estado: "active",
          creadoEn: proyecto.creadoEn,
        });
      }
      for (const tarea of filas) {
        if (!tarea.miembroId || tarea.miembroId === proyecto.organizadorId) continue;
        ponerMiembro({
          proyectoId: proyecto.id,
          usuarioId: tarea.miembroId,
          rol: "volunteer",
          estado: "active",
          creadoEn: proyecto.creadoEn,
        });
      }
    },
    async asignarOrganizador(proyectoId, organizadorId) {
      const actual = proyectos.get(proyectoId);
      if (!actual) return;
      proyectos.set(proyectoId, { ...actual, organizadorId });
      ponerMiembro({
        proyectoId,
        usuarioId: organizadorId,
        rol: "organizer",
        estado: "active",
        creadoEn: actual.creadoEn,
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
    async evidenciaPorSha256(sha256) {
      return [...evidencias.values()].find((evidencia) => evidencia.sha256 === sha256) ?? null;
    },
    async evidenciasCercanas(phash, distanciaMax, exceptoId) {
      const salida: { id: string; distancia: number }[] = [];
      for (const evidencia of evidencias.values()) {
        if (!evidencia.phash || evidencia.id === exceptoId) continue;
        const distancia = distanciaHamming(phash, evidencia.phash);
        if (distancia <= distanciaMax) salida.push({ id: evidencia.id, distancia });
      }
      return salida;
    },
    async listaParaAntifraude() {
      return true;
    },
    async columnasRequisitos() {
      return true;
    },
    async contarEvidencias(tareaId) {
      let total = 0;
      for (const evidencia of evidencias.values()) if (evidencia.tareaId === tareaId) total += 1;
      return total;
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
    async walletDeUsuario(usuarioId) {
      const id = usuarioId.trim();
      if (!id) return null;
      return walletDeSesiones([...sesiones.values()].filter((sesion) => sesion.usuarioId === id));
    },
    async listarMiembros(proyectoId) {
      return [...miembros.values()].filter((miembro) => miembro.proyectoId === proyectoId);
    },
    async miembrosDeUsuario(usuarioId) {
      return [...miembros.values()].filter((miembro) => miembro.usuarioId === usuarioId);
    },
    async guardarMiembro(miembro) {
      const previo = miembros.get(claveMiembro(miembro.proyectoId, miembro.usuarioId));
      if (miembro.rol === "organizer" || previo?.rol !== "organizer") {
        miembros.set(claveMiembro(miembro.proyectoId, miembro.usuarioId), miembro);
        return;
      }
      miembros.set(claveMiembro(miembro.proyectoId, miembro.usuarioId), { ...miembro, rol: "organizer" });
    },
    async crearInvitacion(invitacion) {
      invitaciones.set(invitacion.secretoHash, invitacion);
    },
    async leerInvitacionPorHash(hash) {
      return invitaciones.get(hash) ?? null;
    },
    async canjearInvitacion(pedido) {
      const invitacion = invitaciones.get(pedido.secretoHash) ?? null;
      if (!invitacion) return { ok: false, motivo: "missing" };
      if (!invitacion.expiraEn || invitacion.expiraEn <= pedido.ahora) return { ok: false, motivo: "expired" };
      if (invitacion.usos >= invitacion.maxUsos) return { ok: false, motivo: "used" };
      const email = pedido.email.trim().toLowerCase();
      if (invitacion.tipo === "direct" && (invitacion.email ?? "").toLowerCase() !== email) {
        return { ok: false, motivo: "email" };
      }
      invitacion.usos += 1;
      const previo = miembros.get(claveMiembro(invitacion.proyectoId, pedido.usuarioId));
      const rol: RolEvento = previo?.rol === "organizer" ? "organizer" : invitacion.rol;
      miembros.set(claveMiembro(invitacion.proyectoId, pedido.usuarioId), {
        proyectoId: invitacion.proyectoId,
        usuarioId: pedido.usuarioId,
        rol,
        estado: "active",
        creadoEn: previo?.creadoEn ?? pedido.ahora,
      });
      return { ok: true, proyectoId: invitacion.proyectoId, rol };
    },
  };
}
