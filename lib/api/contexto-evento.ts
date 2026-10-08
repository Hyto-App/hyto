import type { Fotos } from "@/lib/blob/fotos";
import type { Almacen } from "@/lib/db/almacen";
import type { Proyecto } from "@/lib/db/tipos";
import { tipoPorBytes } from "@/lib/evidencia/tipo";
import type { ContextoEvento } from "@/lib/revision/contexto-evento";
import {
  CAMPOS_MILE,
  ETIQUETAS_MILE,
  LIMITES_MILE,
  MAX_CONTEXTO_GUARDADO,
  serializarContextoMile,
  type CamposMile,
} from "@/lib/revision/contexto-mile";
import { esOrganizador } from "./invitaciones";
import { proyectosVisibles, type Visor } from "./alcance";
import { baseNoLista, json, sinFotos } from "./json";

export const MAX_DESCRIPCION = 1000;
export const MAX_CONTEXTO_IA = MAX_CONTEXTO_GUARDADO;
export const MAX_BYTES_PORTADA = 5 * 1024 * 1024;

export const AVISO_PORTADA_TIPO = "The cover photo has to be a JPEG, PNG, or WebP image.";
export const AVISO_PORTADA_GRANDE = "The cover photo is larger than 5 MB.";

const TIPOS_PORTADA = new Set(["image/jpeg", "image/png", "image/webp"]);

type Texto = { ok: true; valor: string | null } | { ok: false; aviso: string };

function leerTexto(valor: unknown, maximo: number, aviso: string): Texto {
  if (valor === undefined || valor === null) return { ok: true, valor: null };
  if (typeof valor !== "string") return { ok: false, aviso };
  const limpio = valor.trim();
  if (limpio.length > maximo) return { ok: false, aviso };
  return { ok: true, valor: limpio || null };
}

/** The guided "For Mile" answers, checked field by field and serialized. Empty gives null. */
function leerContextoMileEntrada(valor: unknown): { ok: true; valor: string | null } | { ok: false; aviso: string } {
  if (valor === undefined || valor === null) return { ok: true, valor: null };
  if (typeof valor !== "object" || Array.isArray(valor)) return { ok: false, aviso: "The context for Mile is not valid." };
  const crudo = valor as Record<string, unknown>;
  const campos: CamposMile = {};
  for (const clave of CAMPOS_MILE) {
    const campo = crudo[clave];
    if (campo === undefined || campo === null) continue;
    const etiqueta = ETIQUETAS_MILE[clave];
    if (typeof campo !== "string") return { ok: false, aviso: `"${etiqueta}" has to be text.` };
    const limpio = campo.trim();
    if (limpio.length > LIMITES_MILE[clave]) {
      return { ok: false, aviso: `"${etiqueta}" can have up to ${LIMITES_MILE[clave]} characters.` };
    }
    if (limpio) campos[clave] = limpio;
  }
  const serializado = serializarContextoMile(campos);
  if (serializado && serializado.length > MAX_CONTEXTO_GUARDADO) {
    return { ok: false, aviso: `The context for Mile can have up to ${MAX_CONTEXTO_GUARDADO} characters in total.` };
  }
  return { ok: true, valor: serializado };
}

/**
 * The optional text fields of an event. Empty text is stored as null. `contextoMile` (the guided answers)
 * wins over the older plain `contextoIa` string, which is still accepted and stored as-is.
 */
export function leerContextoEvento(
  crudo: Record<string, unknown>,
): { descripcion: string | null; contextoIa: string | null } | { aviso: string } {
  const descripcion = leerTexto(crudo.descripcion, MAX_DESCRIPCION, `The event description can have up to ${MAX_DESCRIPCION} characters.`);
  if (!descripcion.ok) return { aviso: descripcion.aviso };
  const contextoIa = leerTexto(crudo.contextoIa, MAX_CONTEXTO_IA, `The context for the AI can have up to ${MAX_CONTEXTO_IA} characters.`);
  if (!contextoIa.ok) return { aviso: contextoIa.aviso };
  const guiado = leerContextoMileEntrada(crudo.contextoMile);
  if (!guiado.ok) return { aviso: guiado.aviso };
  return { descripcion: descripcion.valor, contextoIa: guiado.valor ?? contextoIa.valor };
}

/** What a member may read about an event. `contextoIa` is never part of it. */
export function datosPublicosDeEvento(proyecto: Proyecto): { descripcion: string | null; portada: boolean } {
  return { descripcion: proyecto.descripcion?.trim() || null, portada: Boolean(proyecto.portada) };
}

/** Server-side only: the text the AI reviewers get. A missing event or a read error gives none. */
export async function contextoParaRevision(almacen: Almacen, proyectoId: string): Promise<ContextoEvento | null> {
  try {
    const proyecto = await almacen.leerProyecto(proyectoId);
    if (!proyecto) return null;
    return { descripcion: proyecto.descripcion ?? null, contextoIa: proyecto.contextoIa ?? null };
  } catch {
    return null;
  }
}

/** JPEG, PNG, or WebP by magic bytes, up to 5 MB. SVG and anything unknown is refused. */
export async function guardarPortadaHttp(
  request: Request,
  almacen: Almacen,
  fotos: Fotos | null,
  proyectoId: string,
  usuarioId: string,
): Promise<Response> {
  try {
    if (!(await esOrganizador(almacen, proyectoId, usuarioId))) {
      return json({ aviso: "Only the organizer can change the cover photo." }, 403);
    }
    if (!fotos) return sinFotos();
    let cuerpo: FormData;
    try {
      cuerpo = await request.formData();
    } catch {
      return json({ aviso: "Send the cover photo as a file." }, 400);
    }
    const archivo = cuerpo.get("portada");
    if (!(archivo instanceof Blob) || archivo.size === 0) return json({ aviso: "Send the cover photo as a file." }, 400);
    if (archivo.size > MAX_BYTES_PORTADA) return json({ aviso: AVISO_PORTADA_GRANDE }, 413);
    const bytes = new Uint8Array(await archivo.arrayBuffer());
    const tipo = tipoPorBytes(bytes);
    if (!tipo || !TIPOS_PORTADA.has(tipo)) return json({ aviso: AVISO_PORTADA_TIPO }, 400);
    const extension = tipo === "image/png" ? "png" : tipo === "image/webp" ? "webp" : "jpg";
    let id: string;
    try {
      id = await fotos.guardar(`portada.${extension}`, new Blob([bytes], { type: tipo }));
    } catch {
      return json({ aviso: "Could not save the file." }, 502);
    }
    await almacen.actualizarProyecto(proyectoId, { portada: id });
    return json({ portada: true }, 201);
  } catch (error) {
    return baseNoLista(error);
  }
}

export async function leerPortadaHttp(almacen: Almacen, fotos: Fotos | null, proyectoId: string, visor: Visor): Promise<Response> {
  try {
    const visibles = await proyectosVisibles(almacen, visor);
    const proyecto = visibles.find((item) => item.id === proyectoId);
    if (!proyecto?.portada) return json({ aviso: "We couldn't find that cover photo." }, 404);
    if (!fotos) return sinFotos();
    const foto = await fotos.leer(proyecto.portada);
    if (!foto || !TIPOS_PORTADA.has(foto.tipo)) return json({ aviso: "We couldn't find that cover photo." }, 404);
    return new Response(foto.bytes as BodyInit, {
      headers: {
        "content-type": foto.tipo,
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff",
      },
    });
  } catch (error) {
    return baseNoLista(error);
  }
}
