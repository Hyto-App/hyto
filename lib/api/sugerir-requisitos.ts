import { json } from "./json";
import { sugerirRequisitos } from "@/lib/revision/sugerir";
import { MAX_REQUISITOS } from "@/lib/revision/requisitos";

const TITULO_MAX = 120;
const DESCRIPCION_MAX = 500;

export async function sugerirRequisitosHttp(
  request: Request,
  pedir: typeof sugerirRequisitos = sugerirRequisitos,
): Promise<Response> {
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
