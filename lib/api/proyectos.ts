import { enBandeja, normalizarMonto } from "@/lib/admin/vista";
import type { Almacen } from "@/lib/db/almacen";
import { asegurarSemilla } from "@/lib/db/semilla";
import type { SesionFila, TareaFila } from "@/lib/db/tipos";
import { conReserva, rechazoSiFondos, sumarMontos, type LectorSaldo } from "@/lib/escrow/saldo";
import type { TipoTarea } from "@/lib/integrante/tipos";
import { AVISO_PROYECTO_DEMO, sesionEsDemo } from "@/lib/sesion/demo";
import { proyectosVisibles, tareasVisibles, type Visor } from "./alcance";
import { baseNoLista, json } from "./json";
import { tareaPublica } from "./tareas";

export type FondosCreacion = { wallet: string; leerSaldo?: LectorSaldo };

export function rechazoProyectoDemo(sesion: Pick<SesionFila, "email" | "usuarioId">): Response | null {
  if (!sesionEsDemo(sesion)) return null;
  return json({ aviso: AVISO_PROYECTO_DEMO }, 403);
}

export async function crearProyectoHttp(
  request: Request,
  almacen: Almacen,
  organizadorId: string,
  fondos?: FondosCreacion,
): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ aviso: "The body is not JSON." }, 400);
  }
  const proyecto = leerProyecto(body);
  if ("aviso" in proyecto) return json({ aviso: proyecto.aviso }, 400);
  try {
    await asegurarSemilla(almacen);
    const asignadas = await asignarTareas(almacen, organizadorId, proyecto.tareas);
    if (asignadas instanceof Response) return asignadas;
    if (fondos) {
      const suma = sumarMontos(asignadas.map((tarea) => tarea.monto));
      const necesario = suma ? conReserva(suma) : null;
      if (!necesario) return json({ aviso: "The milestone amount has to be greater than zero." }, 400);
      const rechazo = await rechazoSiFondos(fondos.wallet, suma!, fondos.leerSaldo);
      if (rechazo) return rechazo;
    }
    const fila = { ...proyecto.proyecto, organizadorId };
    await almacen.crearProyecto(fila, asignadas);
    for (const tarea of asignadas) {
      if (!tarea.miembroId || tarea.miembroId === organizadorId) continue;
      await almacen.guardarMiembro({
        proyectoId: fila.id,
        usuarioId: tarea.miembroId,
        rol: "volunteer",
        estado: "active",
        creadoEn: fila.creadoEn,
      });
    }
    return json({ proyecto: { id: fila.id, nombre: fila.nombre }, tareas: asignadas.map(tareaPublica) }, 201);
  } catch {
    return baseNoLista();
  }
}

export async function leerProyectoHttp(almacen: Almacen, visor: Visor, pedido?: { id?: string | null }): Promise<Response> {
  try {
    await asegurarSemilla(almacen);
    const proyectos = await proyectosVisibles(almacen, visor);
    const pedidoId = pedido?.id?.trim() || null;
    const proyecto = pedidoId ? (proyectos.find((item) => item.id === pedidoId) ?? null) : (proyectos[0] ?? null);
    if (!proyecto) return json({ aviso: "There is no project yet." }, 404);
    const visibles = await tareasVisibles(almacen, visor);
    const tareas = visibles.filter((tarea) => tarea.proyectoId === proyecto.id);
    const miembros = visor.usuarioId ? await almacen.miembrosDeUsuario(visor.usuarioId) : [];
    const rolDe = (proyectoId: string) =>
      miembros.find((miembro) => miembro.proyectoId === proyectoId && miembro.estado === "active")?.rol ?? null;
    const rol = rolDe(proyecto.id);
    return json({
      proyecto: { id: proyecto.id, nombre: proyecto.nombre, rol },
      proyectos: await Promise.all(
        proyectos.map(async (item) => ({
          id: item.id,
          nombre: item.nombre,
          rol: rolDe(item.id),
          pendientes: await contarBandeja(
            almacen,
            visibles.filter((tarea) => tarea.proyectoId === item.id),
          ),
        })),
      ),
      tareas: tareas.map(tareaPublica),
      miembros:
        rol === "organizer"
          ? await personasDelEvento(almacen, proyecto.id)
          : [],
    });
  } catch {
    return baseNoLista();
  }
}

async function contarBandeja(almacen: Almacen, tareas: TareaFila[]): Promise<number> {
  let total = 0;
  for (const tarea of tareas) {
    const evidencia = await almacen.ultimaEvidencia(tarea.id);
    const fila = evidencia ? await almacen.veredictoDe(evidencia.id) : null;
    const veredicto = fila && fila.origen !== "error" ? fila.veredicto : null;
    if (enBandeja({ estado: tarea.estado, veredicto })) total += 1;
  }
  return total;
}

async function personasDelEvento(almacen: Almacen, proyectoId: string): Promise<{ usuarioId: string; email: string; rol: string }[]> {
  const miembros = (await almacen.listarMiembros(proyectoId)).filter((miembro) => miembro.estado === "active");
  const usuarios = await almacen.listarUsuarios();
  return miembros.map((miembro) => ({
    usuarioId: miembro.usuarioId,
    email: usuarios.find((usuario) => usuario.id === miembro.usuarioId)?.email ?? miembro.usuarioId,
    rol: miembro.rol,
  }));
}

type TareaBorrador = TareaFila & { asignado: string };

function leerProyecto(body: unknown): { proyecto: { id: string; nombre: string; creadoEn: string }; tareas: TareaBorrador[] } | { aviso: string } {
  if (!body || typeof body !== "object") return { aviso: "Enter a name and at least one task with an amount." };
  const crudo = body as Record<string, unknown>;
  const nombre = typeof crudo.nombre === "string" ? crudo.nombre.trim() : "";
  if (!nombre || !Array.isArray(crudo.tareas) || crudo.tareas.length === 0) {
    return { aviso: "Enter a name and at least one task with an amount." };
  }
  const proyectoId = crypto.randomUUID();
  const ahora = new Date().toISOString();
  const tareas: TareaBorrador[] = [];
  for (const item of crudo.tareas) {
    const tarea = leerTarea(item, proyectoId);
    if ("aviso" in tarea) return tarea;
    tareas.push(tarea);
  }
  return { proyecto: { id: proyectoId, nombre, creadoEn: ahora }, tareas };
}

async function asignarTareas(almacen: Almacen, organizadorId: string, tareas: TareaBorrador[]): Promise<TareaFila[] | Response> {
  const listas: TareaFila[] = [];
  for (const tarea of tareas) {
    const { asignado, ...fila } = tarea;
    if (!asignado) {
      listas.push(fila);
      continue;
    }
    const usuario = await almacen.usuarioPorEmail(asignado);
    if (!usuario) return json({ aviso: "That person doesn't have an account yet. Invite them, then assign the task." }, 400);
    listas.push({ ...fila, miembroId: usuario.id === organizadorId ? "" : usuario.id });
  }
  return listas;
}

function leerTarea(item: unknown, proyectoId: string): TareaBorrador | { aviso: string } {
  if (!item || typeof item !== "object") return { aviso: "Enter a name and at least one task with an amount." };
  const crudo = item as Record<string, unknown>;
  const titulo = typeof crudo.titulo === "string" ? crudo.titulo.trim() : "";
  const tipo: TipoTarea | null = crudo.tipo === "reembolso" ? "reembolso" : crudo.tipo === "trabajo" ? "trabajo" : null;
  const monto = typeof crudo.monto === "string" || typeof crudo.monto === "number" ? normalizarMonto(String(crudo.monto)) : null;
  if (!titulo || !tipo || !monto) return { aviso: "Enter a name and at least one task with an amount." };
  const condicion = typeof crudo.condicion === "string" ? crudo.condicion.trim() : "";
  const miembroId = typeof crudo.miembroId === "string" ? crudo.miembroId.trim() : "";
  const asignado = emailDe(crudo.asignado);
  if (typeof crudo.asignado === "string" && crudo.asignado.trim() && !asignado) {
    return { aviso: "Enter a valid email in Assign to." };
  }
  const topeTexto = typeof crudo.tope === "string" || typeof crudo.tope === "number" ? normalizarMonto(String(crudo.tope)) : null;
  return {
    id: crypto.randomUUID(),
    proyectoId,
    titulo,
    tipo,
    monto,
    tope: tipo === "reembolso" ? (topeTexto ?? monto) : null,
    condicion,
    miembroId,
    asignado,
    walletCobro: "",
    estado: "pendiente",
    hashPago: null,
    contratoEscrow: null,
    credencialUrl: null,
  };
}

function emailDe(valor: unknown): string {
  if (typeof valor !== "string") return "";
  const email = valor.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}
