import { IDENTIDADES } from "@/lib/integrante/identidades";
import { tareasEjemplo } from "@/lib/integrante/ejemplos";
import type { Almacen } from "./almacen";
import type { Proyecto, TareaFila, Usuario } from "./tipos";

export const PROYECTO_ZEEK: Proyecto = {
  id: "zeek",
  nombre: "ZEEK",
  creadoEn: "2026-09-27T12:00:00.000Z",
};

export function usuariosSemilla(): Usuario[] {
  return IDENTIDADES.map((identidad) => ({
    id: identidad.id,
    email: identidad.email.trim().toLowerCase(),
    nombre: identidad.nombre,
    rol: identidad.id === "organizador" ? "organizador" : "voluntario",
  }));
}

export function tareasSemilla(): TareaFila[] {
  return tareasEjemplo().map((tarea) => ({
    id: tarea.id,
    proyectoId: PROYECTO_ZEEK.id,
    titulo: tarea.titulo,
    tipo: tarea.tipo,
    monto: tarea.monto,
    tope: tarea.tope,
    condicion: tarea.condicion,
    miembroId: tarea.miembroId,
    walletCobro: tarea.walletCobro,
    estado: "pendiente",
    hashPago: null,
    credencialUrl: null,
  }));
}

export async function asegurarSemilla(almacen: Almacen): Promise<void> {
  const usuarios = await almacen.listarUsuarios();
  if (usuarios.length === 0) {
    for (const usuario of usuariosSemilla()) {
      await almacen.insertarUsuario(usuario);
    }
  }
  const proyecto = await almacen.leerProyecto(PROYECTO_ZEEK.id);
  if (!proyecto) {
    await almacen.crearProyecto(PROYECTO_ZEEK, tareasSemilla());
  }
}
