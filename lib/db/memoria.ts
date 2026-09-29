import type { Almacen } from "./almacen";
import type { EvidenciaFila, Proyecto, SesionFila, TareaFila, Usuario, VeredictoFila } from "./tipos";

export function crearMemoria(): Almacen {
  const usuarios = new Map<string, Usuario>();
  const proyectos = new Map<string, Proyecto>();
  const tareas = new Map<string, TareaFila>();
  const evidencias = new Map<string, EvidenciaFila>();
  const veredictos = new Map<string, VeredictoFila>();
  const sesiones = new Map<string, SesionFila>();

  return {
    async listarUsuarios() {
      return [...usuarios.values()];
    },
    async usuarioPorEmail(email) {
      const buscado = email.trim().toLowerCase();
      return [...usuarios.values()].find((usuario) => usuario.email === buscado) ?? null;
    },
    async insertarUsuario(usuario) {
      if ([...usuarios.values()].some((actual) => actual.email === usuario.email)) return;
      usuarios.set(usuario.id, usuario);
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
    async ultimoProyecto() {
      return [...proyectos.values()].sort((a, b) => (a.creadoEn < b.creadoEn ? 1 : -1))[0] ?? null;
    },
    async crearProyecto(proyecto, filas) {
      proyectos.set(proyecto.id, proyecto);
      for (const tarea of filas) tareas.set(tarea.id, tarea);
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
  };
}
