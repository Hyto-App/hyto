import { bandejaDe, enBandeja, enlacePago, porPersona, resumir } from "@/lib/admin/vista";
import type { IntentoAnterior, TareaAdmin, Veredicto } from "@/lib/admin/tipos";
import type { Almacen } from "@/lib/db/almacen";
import { esBlobEjemplo } from "@/lib/db/semilla";
import type { EvidenciaFila, TareaFila, VeredictoFila } from "@/lib/db/tipos";
import { etiquetasDesdeVeredicto, lecturaDesdeVeredicto } from "@/lib/revision/mostrar-razones";
import { fraseConNota } from "@/lib/revision/armar";
import { etiquetaDesdeNota, notaDeTexto } from "@/lib/revision/pesos";
import { fichaDeTarea } from "./perfil";
import type { FichaVoluntario } from "@/lib/perfil/reglas";
import { proyectosVisibles, tareasVisibles, type Visor } from "./alcance";
import { baseNoLista, json } from "./json";
import { veredictoAlLeer } from "./revision-vencida";

export async function informeHttp(almacen: Almacen, visor: Visor): Promise<Response> {
  try {
    const vista = await armarInforme(almacen, visor);
    return json(vista);
  } catch (error) {
    return baseNoLista(error);
  }
}

export async function armarInforme(almacen: Almacen, visor: Visor, proyectoId?: string) {
  const lista = await proyectosVisibles(almacen, visor);
  const proyecto = proyectoId ? (lista.find((item) => item.id === proyectoId) ?? null) : (lista[0] ?? null);
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

export async function vistaEventoHttp(almacen: Almacen, visor: Visor, proyectoId: string): Promise<Response> {
  const id = proyectoId.trim();
  if (!id) return json({ aviso: "The event is missing." }, 400);
  try {
    const lista = await proyectosVisibles(almacen, visor);
    if (!lista.some((item) => item.id === id)) return json({ aviso: "We couldn't find that event." }, 404);
    return json(await armarInforme(almacen, visor, id));
  } catch (error) {
    return baseNoLista(error);
  }
}

/**
 * An upload always moves a task to "en revisión", so a real file on a "pendiente" task means the
 * organizer asked for another photo. That verdict belongs to the old file and stays hidden until a new one arrives.
 */
export function veredictoVigente(
  tarea: Pick<TareaFila, "estado">,
  evidencia: Pick<EvidenciaFila, "blobId"> | null,
  veredicto: VeredictoFila | null,
): VeredictoFila | null {
  if (!evidencia || !veredicto) return null;
  if (tarea.estado === "pendiente" && !esBlobEjemplo(evidencia.blobId)) return null;
  return veredicto;
}

export async function leerVeredictoVigente(
  almacen: Almacen,
  tarea: TareaFila,
): Promise<{ evidencia: EvidenciaFila | null; veredicto: VeredictoFila | null }> {
  const evidencia = await almacen.ultimaEvidencia(tarea.id);
  const fila = await veredictoAlLeer(almacen, tarea, evidencia);
  return { evidencia, veredicto: veredictoVigente(tarea, evidencia, fila) };
}

export async function tareaEnBandeja(almacen: Almacen, tarea: TareaFila): Promise<boolean> {
  const { veredicto } = await leerVeredictoVigente(almacen, tarea);
  return enBandeja({ estado: tarea.estado, veredicto: bandaDe(veredicto) });
}

/**
 * Mile's explanation for each photo that is not the one on screen, oldest first. When the latest
 * verdict is hidden (another photo was asked for), that photo counts as an earlier attempt too.
 * Failed reviews have no explanation and are skipped.
 */
export async function intentosAnteriores(
  almacen: Almacen,
  tarea: TareaFila,
  actual: EvidenciaFila | null,
  hayVeredictoVigente: boolean,
): Promise<IntentoAnterior[]> {
  const todas = await almacen.listarEvidencias(tarea.id);
  const salida: IntentoAnterior[] = [];
  for (const [indice, evidencia] of todas.entries()) {
    if (hayVeredictoVigente && evidencia.id === actual?.id) continue;
    const fila = await almacen.veredictoDe(evidencia.id);
    if (!fila || fila.origen === "error") continue;
    const nota = notaDe(fila);
    salida.push({
      numero: indice + 1,
      veredicto: bandaDe(fila),
      nota,
      frase: fraseConNota(fila.frase ?? null, nota),
    });
  }
  return salida;
}

export async function tareaAdmin(almacen: Almacen, tarea: TareaFila, nombres?: Map<string, string>): Promise<TareaAdmin> {
  const mapa = nombres ?? new Map((await almacen.listarUsuarios()).map((usuario) => [usuario.id, usuario.nombre]));
  const { evidencia, veredicto } = await leerVeredictoVigente(almacen, tarea);
  const anteriores = await intentosAnteriores(almacen, tarea, evidencia, veredicto !== null);
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
    frase: fraseConNota(veredicto?.frase ?? null, notaDe(veredicto)),
    origen: veredicto?.origen ?? null,
    codigo: veredicto?.origen === "error" ? veredicto.choice : null,
    montoRevisado: evidencia?.monto ?? null,
    montoConfirmado: evidencia?.montoConfirmado ?? null,
    fecha: evidencia?.fecha ?? null,
    tipoArchivo: evidencia?.tipoArchivo ?? null,
    apartado: Boolean(tarea.contratoEscrow?.trim()),
    motivoCopia: evidencia?.motivoCopia ?? null,
    hashPago: tarea.hashPago,
    credencialUrl: tarea.credencialUrl,
    etiquetas: etiquetasDesdeVeredicto({
      textoScout: veredicto?.textoScout ?? null,
      origen: veredicto?.origen ?? null,
      monto: evidencia?.monto ?? null,
      fecha: evidencia?.fecha ?? null,
      tope: tarea.tope,
      tipo: tarea.tipo,
      condicion: tarea.condicion,
    }),
    lectura: lecturaDesdeVeredicto({ textoScout: veredicto?.textoScout ?? null, origen: veredicto?.origen ?? null }),
    ...(await fichaVoluntario(almacen, tarea.miembroId)),
    ...(anteriores.length > 0 ? { intentosAnteriores: anteriores } : {}),
  };
}

async function fichaVoluntario(almacen: Almacen, usuarioId: string): Promise<{ perfilVoluntario?: FichaVoluntario }> {
  const ficha = await fichaDeTarea(almacen, usuarioId);
  return ficha ? { perfilVoluntario: ficha } : {};
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
