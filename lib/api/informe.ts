import { bandejaDe, enlacePago, porPersona, resumir } from "@/lib/admin/vista";
import type { TareaAdmin, Veredicto } from "@/lib/admin/tipos";
import type { Almacen } from "@/lib/db/almacen";
import { asegurarSemilla } from "@/lib/db/semilla";
import type { TareaFila, VeredictoFila } from "@/lib/db/tipos";
import { etiquetasDesdeVeredicto } from "@/lib/revision/mostrar-razones";
import { etiquetaDesdeNota, notaDeTexto } from "@/lib/revision/pesos";
import { proyectosVisibles, tareasVisibles, type Visor } from "./alcance";
import { baseNoLista, json } from "./json";

export async function informeHttp(almacen: Almacen, visor: Visor): Promise<Response> {
  try {
    await asegurarSemilla(almacen);
    const vista = await armarInforme(almacen, visor);
    return json(vista);
  } catch {
    return baseNoLista();
  }
}

export async function armarInforme(almacen: Almacen, visor: Visor) {
  const proyecto = (await proyectosVisibles(almacen, visor))[0] ?? null;
  const usuarios = await almacen.listarUsuarios();
  const nombres = new Map(usuarios.map((usuario) => [usuario.id, usuario.nombre]));
  const visibles = await tareasVisibles(almacen, visor);
  const tareas = proyecto ? visibles.filter((tarea) => tarea.proyectoId === proyecto.id) : [];
  const admin: TareaAdmin[] = [];
  for (const tarea of tareas) admin.push(await tareaAdmin(almacen, tarea, nombres));
  return {
    nombre: proyecto?.nombre ?? "",
    ejemplo: false as const,
    tareas: admin,
    bandeja: bandejaDe(admin),
    resumen: resumir(admin),
    personas: porPersona(admin),
  };
}

export async function tareaAdmin(almacen: Almacen, tarea: TareaFila, nombres?: Map<string, string>): Promise<TareaAdmin> {
  const mapa = nombres ?? new Map((await almacen.listarUsuarios()).map((usuario) => [usuario.id, usuario.nombre]));
  const evidencia = await almacen.ultimaEvidencia(tarea.id);
  const veredicto = evidencia ? await almacen.veredictoDe(evidencia.id) : null;
  return {
    id: tarea.id,
    titulo: tarea.titulo,
    tipo: tarea.tipo,
    monto: tarea.monto,
    tope: tarea.tope,
    condicion: tarea.condicion,
    miembroId: tarea.miembroId,
    miembro: mapa.get(tarea.miembroId) || (tarea.miembroId ? tarea.miembroId : "Unassigned"),
    estado: tarea.estado,
    veredicto: bandaDe(veredicto),
    nota: notaDe(veredicto),
    frase: veredicto?.frase ?? null,
    origen: veredicto?.origen ?? null,
    codigo: veredicto?.origen === "error" ? veredicto.choice : null,
    montoRevisado: evidencia?.monto ?? null,
    montoConfirmado: evidencia?.montoConfirmado ?? null,
    fecha: evidencia?.fecha ?? null,
    hashPago: tarea.hashPago,
    credencialUrl: tarea.credencialUrl,
    etiquetas: etiquetasDesdeVeredicto({
      textoScout: veredicto?.textoScout ?? null,
      origen: veredicto?.origen ?? null,
      monto: evidencia?.monto ?? null,
      fecha: evidencia?.fecha ?? null,
      tope: tarea.tope,
      tipo: tarea.tipo,
    }),
  };
}

export function pagoDe(hash: string | null): string | null {
  return enlacePago(hash);
}

function notaDe(veredicto: VeredictoFila | null): number | null {
  if (!veredicto || veredicto.origen === "error") return null;
  return notaDeTexto(veredicto?.score);
}

function bandaDe(veredicto: VeredictoFila | null): Veredicto | null {
  if (!veredicto || veredicto.origen === "error") return null;
  const nota = notaDeTexto(veredicto?.score);
  if (nota !== null) return etiquetaDesdeNota(nota);
  return veredicto.veredicto;
}
