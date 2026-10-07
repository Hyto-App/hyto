import { json } from "./json";
import { sugerirRequisitos } from "@/lib/revision/sugerir";
import { MAX_REQUISITOS } from "@/lib/revision/requisitos";
import { clienteDe, excedido } from "@/lib/escrow/limite";

export const TOPE_SUGERIR_POR_MINUTO = 10;

const TITULO_MAX = 120;
const DESCRIPCION_MAX = 500;

export async function sugerirRequisitosHttp(
  request: Request,
  pedir: typeof sugerirRequisitos = sugerirRequisitos,
  usuarioId = "",
): Promise<Response> {
  // Each call is a model request. Any signed-in account can reach this route, so it gets a per-user cap.
  if (excedido(`sugerir:${usuarioId || clienteDe(request)}`, Date.now(), TOPE_SUGERIR_POR_MINUTO)) {
    return json({ aviso: "Too many suggestions in a row. Wait a minute." }, 429);
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ aviso: "The body is not JSON." }, 400);
  }
  if (!body || typeof body !== "object") return json({ aviso: "The body is not JSON." }, 400);
  const crudo = body as Record<string, unknown>;
  const titulo = typeof crudo.titulo === "string" ? crudo.titulo.trim() : "";
  const descripcion = typeof crudo.descripcion === "string" ? crudo.descripcion.trim() : "";
  if (!titulo) return json({ aviso: "Enter a title." }, 400);
  if (titulo.length > TITULO_MAX) return json({ aviso: "Title is too long." }, 400);
  if (descripcion.length > DESCRIPCION_MAX) return json({ aviso: "That note is too long." }, 400);
  const requisitos = (await pedir(titulo, descripcion)).slice(0, MAX_REQUISITOS);
  return json({ requisitos });
}
