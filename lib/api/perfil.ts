import type { Almacen } from "@/lib/db/almacen";
import { perfilVoluntarioActivo } from "@/lib/perfil/bandera";
import { fichaDe, leerFicha, type FichaVoluntario } from "@/lib/perfil/reglas";
import { json } from "./json";

const NO = json({ aviso: "Not found." }, 404);

export async function leerPerfilHttp(almacen: Almacen, usuarioId: string): Promise<Response> {
  if (!perfilVoluntarioActivo()) return NO;
  const usuario = await almacen.leerUsuario(usuarioId);
  if (!usuario) return json({ aviso: "We couldn't find that account." }, 404);
  return json({ perfil: fichaDe(usuario) ?? { experiencia: null, etiquetas: [] } });
}

export async function guardarPerfilHttp(almacen: Almacen, usuarioId: string, body: unknown): Promise<Response> {
  if (!perfilVoluntarioActivo()) return NO;
  const ficha = leerFicha(body);
  if ("aviso" in ficha) return json({ aviso: ficha.aviso }, 400);
  const antes = await almacen.leerUsuario(usuarioId);
  if (!antes) return json({ aviso: "We couldn't find that account." }, 404);
  await almacen.guardarPerfilVoluntario(usuarioId, {
    experiencia: ficha.experiencia,
    etiquetas: JSON.stringify(ficha.etiquetas),
  });
  const despues = await almacen.leerUsuario(usuarioId);
  if (despues?.rol !== antes.rol) return json({ aviso: "Could not save the profile." }, 500);
  return json({ perfil: ficha });
}

/** Profile of the person who has the task. Null, and no extra read, while the switch is off. */
export async function fichaDeTarea(almacen: Almacen, usuarioId: string): Promise<FichaVoluntario | null> {
  if (!perfilVoluntarioActivo() || !usuarioId) return null;
  const usuario = await almacen.leerUsuario(usuarioId);
  return fichaDe(usuario);
}
