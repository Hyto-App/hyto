import { normalizarMonto } from "@/lib/admin/vista";
import type { Almacen } from "@/lib/db/almacen";
import { asegurarSemilla } from "@/lib/db/semilla";
import type { SesionFila, TareaFila } from "@/lib/db/tipos";
import { conReserva, rechazoSiFondos, sumarMontos, type LectorSaldo } from "@/lib/escrow/saldo";
import type { TipoTarea } from "@/lib/integrante/tipos";
import { leerDificultadEntrada, leerPrioridadEntrada } from "@/lib/tareas/clasificacion";
import { AVISO_PROYECTO_DEMO, sesionEsDemo } from "@/lib/sesion/demo";
import { proyectosVisibles, tareasVisibles, type Visor } from "./alcance";
import { tareaEnBandeja } from "./informe";
import { datosPublicosDeEvento, leerContextoEvento } from "./contexto-evento";
import { baseNoLista, json } from "./json";
import { entradaRequisitos, serializarRequisitos } from "@/lib/revision/requisitos";
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
  } catch (error) {
    console.error("[api/proyectos] crear", detalleErrorCrear(error));
    const fallo = clasificarErrorCrear(error);
    return json({ aviso: fallo.aviso }, fallo.status);
  }
}

const AVISO_CREAR = "Could not create the event.";

const CODIGOS_BASE_NO_LISTA = new Set([
  "42P01",
  "42703",
  "3D000",
  "28P01",
  "08000",
  "08001",
  "08003",
  "08004",
  "08006",
  "08007",
  "53300",
  "57P01",
  "57P02",
  "57P03",
  "ECONNREFUSED",
  "ECONNRESET",
  "ETIMEDOUT",
  "ENOTFOUND",
  "EAI_AGAIN",
  "EPIPE",
]);

/** Logs stay useful. Connection strings, passwords, and emails do not. */
export function detalleErrorCrear(error: unknown): string {
  const nombre = error instanceof Error ? error.name : typeof error;
  const codigo = codigoDe(error);
  const mensaje = redactar(mensajeDe(error)).slice(0, 400);
  return `${nombre}${codigo ? ` ${codigo}` : ""}: ${mensaje}`;
}

export function clasificarErrorCrear(error: unknown): { aviso: string; status: number } {
  if (esBaseNoLista(error)) return { aviso: "The database is not ready.", status: 503 };
  return { aviso: AVISO_CREAR, status: 500 };
}

function esBaseNoLista(error: unknown): boolean {
  if (CODIGOS_BASE_NO_LISTA.has(codigoDe(error))) return true;
  return /does not exist|ECONNREFUSED|ECONNRESET|ETIMEDOUT|ENOTFOUND|connection (terminated|refused|timeout)|password authentication failed|database is not configured|remaining connection slots|Client has encountered a connection error/i.test(
    mensajeDe(error),
  );
}

function codigoDe(error: unknown): string {
  const visto = new Set<unknown>();
  let actual: unknown = error;
  while (actual && typeof actual === "object" && !visto.has(actual)) {
    visto.add(actual);
    const codigo = (actual as { code?: unknown }).code;
    if (typeof codigo === "string" && codigo) return codigo;
    actual = (actual as { cause?: unknown }).cause;
  }
  return "";
}

function mensajeDe(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "";
}

function redactar(texto: string): string {
  return texto
    .replace(/postgres(?:ql)?:\/\/\S+/gi, "postgres://redacted")
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[email]")
    .replace(/(password|secret|token|api[_-]?key|authorization)\s*[:=]\s*\S+/gi, "$1=[redacted]");
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
      proyecto: { id: proyecto.id, nombre: proyecto.nombre, rol, ...datosPublicosDeEvento(proyecto) },
      proyectos: await Promise.all(
        proyectos.map(async (item) => ({
          id: item.id,
          nombre: item.nombre,
          rol: rolDe(item.id),
          ...datosPublicosDeEvento(item),
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
    if (await tareaEnBandeja(almacen, tarea)) total += 1;
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

function leerProyecto(
  body: unknown,
): { proyecto: { id: string; nombre: string; creadoEn: string; descripcion: string | null; contextoIa: string | null }; tareas: TareaBorrador[] } | { aviso: string } {
  if (!body || typeof body !== "object") return { aviso: "Enter an event name and at least one task." };
  const crudo = body as Record<string, unknown>;
  const nombre = typeof crudo.nombre === "string" ? crudo.nombre.trim() : "";
  if (!nombre) return { aviso: "Enter an event name." };
  if (!Array.isArray(crudo.tareas) || crudo.tareas.length === 0) {
    return { aviso: "Add at least one task with a title and an amount." };
  }
  const contexto = leerContextoEvento(crudo);
  if ("aviso" in contexto) return contexto;
  const proyectoId = crypto.randomUUID();
  const ahora = new Date().toISOString();
  const tareas: TareaBorrador[] = [];
  for (const item of crudo.tareas) {
    const tarea = leerTarea(item, proyectoId);
    if ("aviso" in tarea) return tarea;
    tareas.push(tarea);
  }
  return { proyecto: { id: proyectoId, nombre, creadoEn: ahora, ...contexto }, tareas };
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
  if (!item || typeof item !== "object") return { aviso: "Add at least one task with a title and an amount." };
  const crudo = item as Record<string, unknown>;
  const titulo = typeof crudo.titulo === "string" ? crudo.titulo.trim() : "";
  const tipo: TipoTarea | null = crudo.tipo === "reembolso" ? "reembolso" : crudo.tipo === "trabajo" ? "trabajo" : null;
  const montoCrudo =
    typeof crudo.monto === "string" || typeof crudo.monto === "number" ? String(crudo.monto).trim() : "";
  const monto = montoCrudo ? normalizarMonto(montoCrudo) : null;
  if (!titulo) return { aviso: "Every task needs a title." };
  if (!tipo) return { aviso: "Every task needs a type (Work or Reimbursement)." };
  if (montoCrudo && !monto) return { aviso: "Enter an amount greater than zero, with up to two decimals." };
  if (!monto) return { aviso: "Every task needs an amount greater than zero." };
  const condicion = typeof crudo.condicion === "string" ? crudo.condicion.trim() : "";
  const miembroId = typeof crudo.miembroId === "string" ? crudo.miembroId.trim() : "";
  const asignado = emailDe(crudo.asignado);
  if (typeof crudo.asignado === "string" && crudo.asignado.trim() && !asignado) {
    return { aviso: "Enter a valid email in Assign to." };
  }
  const topeTexto = typeof crudo.tope === "string" || typeof crudo.tope === "number" ? normalizarMonto(String(crudo.tope)) : null;
  const prioridad = leerPrioridadEntrada(crudo.prioridad);
  if (typeof prioridad !== "string") return prioridad;
  const dificultad = leerDificultadEntrada(crudo.dificultad);
  if (dificultad !== null && typeof dificultad !== "string") return dificultad;
  let requisitos: string | null = null;
  if ("requisitos" in crudo) {
    const entrada = entradaRequisitos(crudo.requisitos);
    if (!entrada.ok) return { aviso: entrada.aviso };
    requisitos = serializarRequisitos(entrada.requisitos);
  }
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
    prioridad,
    dificultad,
    requisitos,
  };
}

function emailDe(valor: unknown): string {
  if (typeof valor !== "string") return "";
  const email = valor.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}
